import { EfexContext } from '../Library/libEFEX';
import { PartitionInfo } from '../FlashConfig/Types';
import { addSum } from '../FlashConfig/Utils';
import { DeviceOpsOptions } from './Interface';
import i18n from '../i18n';

export const ITEM_ROOTFSFAT16 = '12345678';
export const DOWNLOAD_CHUNK_SIZE = 64 * 1024;

export interface PartitionDownloadInfo {
  partition: PartitionInfo;
  downloadFilename: string;
  needVerify: boolean;
}

export interface DownloadPartitionResult {
  success: boolean;
  bytesWritten: bigint;
  partitionName: string;
}

export interface PartitionDataProvider {
  getFileDataByFilename(filename: string): Promise<Uint8Array | null>;
  getFileDataByMaintypeSubtype(maintype: string, subtype: string): Promise<Uint8Array | null>;
}

export interface ProgressCalculator {
  getTotalBytes(): bigint;
  getWrittenBytes(): bigint;
  addWrittenBytes(bytes: bigint): void;
  getProgress(): number;
  getStageMessage(partitionName: string): string;
}

export function createProgressCalculator(totalBytes: bigint): ProgressCalculator {
  let writtenBytes = BigInt(0);

  return {
    getTotalBytes() {
      return totalBytes;
    },
    getWrittenBytes() {
      return writtenBytes;
    },
    addWrittenBytes(bytes: bigint) {
      writtenBytes += bytes;
    },
    getProgress() {
      if (totalBytes === BigInt(0)) return 100;
      return Number((writtenBytes * 100n) / totalBytes);
    },
    getStageMessage(partitionName: string) {
      const writtenMB = Number(writtenBytes) / (1024 * 1024);
      const totalMB = Number(totalBytes) / (1024 * 1024);
      return i18n.t('device.downloadPartition.downloadingPartition', { name: partitionName, written: writtenMB.toFixed(1), total: totalMB.toFixed(1) });
    },
  };
}

async function downloadPartitionChunk(
  ctx: EfexContext,
  data: Uint8Array,
  startSector: number
): Promise<void> {
  await ctx.fes.down(data, startSector, 'flash');
}

export async function downloadPartition(
  ctx: EfexContext,
  partitionInfo: PartitionDownloadInfo,
  dataProvider: PartitionDataProvider,
  options?: DeviceOpsOptions
): Promise<DownloadPartitionResult> {
  const { onLog } = options || {};
  const { partition, downloadFilename } = partitionInfo;

  onLog?.('info', i18n.t('device.downloadPartition.startDownload', { name: partition.name }));
  onLog?.('info', i18n.t('device.downloadPartition.partitionAddr', { addr: `0x${partition.address.toString(16)}` }));
  onLog?.('info', i18n.t('device.downloadPartition.partitionSize', { size: partition.length }));

  const partitionData = await dataProvider.getFileDataByMaintypeSubtype(
    ITEM_ROOTFSFAT16,
    downloadFilename
  );

  if (!partitionData) {
    const altData = await dataProvider.getFileDataByFilename(downloadFilename);
    if (!altData) {
      onLog?.('error', i18n.t('device.downloadPartition.imageNotFound', { filename: downloadFilename }));
      return {
        success: false,
        bytesWritten: BigInt(0),
        partitionName: partition.name,
      };
    }
    return downloadPartitionWithData(ctx, partitionInfo, altData, options);
  }

  return downloadPartitionWithData(ctx, partitionInfo, partitionData, options);
}

export async function downloadPartitionWithData(
  ctx: EfexContext,
  partitionInfo: PartitionDownloadInfo,
  partitionData: Uint8Array,
  options?: DeviceOpsOptions & { progressCalculator?: ProgressCalculator }
): Promise<DownloadPartitionResult> {
  const { onProgress, onLog, progressCalculator, checkCancelled } = options || {};
  const { partition, needVerify } = partitionInfo;

  const packetLen = BigInt(partitionData.length);
  const partSize = BigInt(partition.length) * 512n;

  if (packetLen > partSize) {
    onLog?.(
      'error',
      i18n.t('device.downloadPartition.dataTooLarge', { dataSize: packetLen, partSize })
    );
    return {
      success: false,
      bytesWritten: BigInt(0),
      partitionName: partition.name,
    };
  }

  onLog?.('info', i18n.t('device.downloadPartition.imageSize', { size: packetLen }));

  const startSector = Number(partition.address);
  let currentSector = startSector;
  let remainingBytes = Number(packetLen);
  let totalWritten = BigInt(0);

  const totalChunks = Math.ceil(Number(packetLen) / DOWNLOAD_CHUNK_SIZE);
  let currentChunk = 0;

  await ctx.fes.setTimeout(60);

  while (remainingBytes > 0) {
    checkCancelled?.();

    const chunkSize = Math.min(remainingBytes, DOWNLOAD_CHUNK_SIZE);
    const chunkOffset = Number(packetLen) - remainingBytes;
    const chunkData = partitionData.slice(chunkOffset, chunkOffset + chunkSize);

    try {
      await downloadPartitionChunk(ctx, chunkData, currentSector);
    } catch (error) {
      onLog?.('error', i18n.t('device.downloadPartition.downloadFailed', { name: partition.name, error }));
      await ctx.fes.setTimeout(1);
      return {
        success: false,
        bytesWritten: totalWritten,
        partitionName: partition.name,
      };
    }

    currentSector += chunkSize >> 9;
    remainingBytes -= chunkSize;
    totalWritten += BigInt(chunkSize);
    currentChunk++;

    if (progressCalculator) {
      progressCalculator.addWrittenBytes(BigInt(chunkSize));
      const progress = progressCalculator.getProgress();
      const stage = progressCalculator.getStageMessage(partition.name);
      onProgress?.(stage, progress);
    } else if (totalChunks > 0) {
      const progress = Math.floor((currentChunk / totalChunks) * 100);
      onProgress?.(i18n.t('device.downloadPartition.downloading', { name: partition.name }), progress);
    }
  }

  await ctx.fes.setTimeout(1);

  if (needVerify) {
    checkCancelled?.();
    onLog?.('info', i18n.t('device.downloadPartition.verifying', { name: partition.name }));
    try {
      const localChecksum = addSum(partitionData);
      const verifyResult = await ctx.fes.verifyValue(
        Number(partition.address),
        Number(packetLen)
      );
      const mediaCrc = verifyResult.media_crc >>> 0;
      if (localChecksum !== mediaCrc) {
        onLog?.('warn', i18n.t('device.downloadPartition.checksumMismatch', { 
          name: partition.name, 
          local: `0x${localChecksum.toString(16)}`, 
          device: `0x${mediaCrc.toString(16)}` 
        }));
      } else {
        onLog?.('info', i18n.t('device.downloadPartition.verifySuccess', { name: partition.name }));
      }
    } catch (error) {
      onLog?.('warn', i18n.t('device.downloadPartition.verifyFailed', { name: partition.name, error }));
    }
  }

  onLog?.('info', i18n.t('device.downloadPartition.downloadComplete', { name: partition.name, bytes: totalWritten }));

  return {
    success: true,
    bytesWritten: totalWritten,
    partitionName: partition.name,
  };
}

export async function downloadPartitions(
  ctx: EfexContext,
  partitions: PartitionDownloadInfo[],
  dataProvider: PartitionDataProvider,
  options?: DeviceOpsOptions
): Promise<{ success: boolean; results: DownloadPartitionResult[] }> {
  const { onProgress, onLog, checkCancelled } = options || {};
  const results: DownloadPartitionResult[] = [];
  let allSuccess = true;

  let totalBytes = BigInt(0);
  const partitionDataMap = new Map<string, Uint8Array>();

  for (const partitionInfo of partitions) {
    let partitionData = await dataProvider.getFileDataByMaintypeSubtype(
      ITEM_ROOTFSFAT16,
      partitionInfo.downloadFilename
    );
    if (!partitionData) {
      partitionData = await dataProvider.getFileDataByFilename(partitionInfo.downloadFilename);
    }

    if (partitionData) {
      partitionDataMap.set(partitionInfo.partition.name, partitionData);
      totalBytes += BigInt(partitionData.length);
    }
  }

  const progressCalculator = createProgressCalculator(totalBytes);

  onProgress?.(i18n.t('device.downloadPartition.preparing'), 0);

  for (let i = 0; i < partitions.length; i++) {
    checkCancelled?.();

    const partitionInfo = partitions[i];
    const partitionData = partitionDataMap.get(partitionInfo.partition.name);

    if (!partitionData) {
      onLog?.('error', i18n.t('device.downloadPartition.imageNotFound', { filename: partitionInfo.downloadFilename }));
      results.push({
        success: false,
        bytesWritten: BigInt(0),
        partitionName: partitionInfo.partition.name,
      });
      allSuccess = false;
      break;
    }

    const result = await downloadPartitionWithData(ctx, partitionInfo, partitionData, {
      ...options,
      progressCalculator,
      onProgress: (stage, progress) => {
        onProgress?.(stage, progress);
      },
    });

    results.push(result);

    if (!result.success) {
      allSuccess = false;
      onLog?.('error', i18n.t('device.downloadPartition.partitionFailed', { name: partitionInfo.partition.name }));
      break;
    }
  }

  return {
    success: allSuccess,
    results,
  };
}
