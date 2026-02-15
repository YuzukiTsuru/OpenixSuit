import { EfexContext } from '../Library/libEFEX';
import { PartitionInfo } from '../FlashConfig/Types';
import { addSum } from '../FlashConfig/Utils';
import { DeviceOpsOptions } from './Interface';

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
  getFileDataByFilename(filename: string): Uint8Array | null;
  getFileDataByMaintypeSubtype(maintype: string, subtype: string): Uint8Array | null;
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
      return `下载分区 "${partitionName}" (${writtenMB.toFixed(1)}/${totalMB.toFixed(1)} MB)`;
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

  onLog?.('info', `开始下载分区 "${partition.name}"...`);
  onLog?.('info', `  分区地址: 0x${partition.address.toString(16)}`);
  onLog?.('info', `  分区大小: ${partition.length} 字节`);

  const partitionData = dataProvider.getFileDataByMaintypeSubtype(
    ITEM_ROOTFSFAT16,
    downloadFilename
  );

  if (!partitionData) {
    const altData = dataProvider.getFileDataByFilename(downloadFilename);
    if (!altData) {
      onLog?.('error', `无法找到分区镜像文件: ${downloadFilename}`);
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
  const { onProgress, onLog, progressCalculator } = options || {};
  const { partition, needVerify } = partitionInfo;

  const packetLen = BigInt(partitionData.length);
  const partSize = BigInt(partition.length) * 512n;

  if (packetLen > partSize) {
    onLog?.(
      'error',
      `分区数据大小(${packetLen})超过分区容量(${partSize})`
    );
    return {
      success: false,
      bytesWritten: BigInt(0),
      partitionName: partition.name,
    };
  }

  onLog?.('info', `  镜像大小: ${packetLen} 字节`);

  const startSector = Number(partition.address);
  let currentSector = startSector;
  let remainingBytes = Number(packetLen);
  let totalWritten = BigInt(0);

  const totalChunks = Math.ceil(Number(packetLen) / DOWNLOAD_CHUNK_SIZE);
  let currentChunk = 0;

  await ctx.fes.setTimeout(60);

  while (remainingBytes > 0) {
    const chunkSize = Math.min(remainingBytes, DOWNLOAD_CHUNK_SIZE);
    const chunkOffset = Number(packetLen) - remainingBytes;
    const chunkData = partitionData.slice(chunkOffset, chunkOffset + chunkSize);

    try {
      await downloadPartitionChunk(ctx, chunkData, currentSector);
    } catch (error) {
      onLog?.('error', `下载分区 "${partition.name}" 失败: ${error}`);
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
      onProgress?.(`下载分区 "${partition.name}"`, progress);
    }
  }

  await ctx.fes.setTimeout(1);

  if (needVerify) {
    onLog?.('info', `正在校验分区 "${partition.name}"...`);
    try {
      const localChecksum = addSum(partitionData);
      const verifyResult = await ctx.fes.verifyValue(
        Number(partition.address),
        Number(packetLen)
      );
      const mediaCrc = verifyResult.media_crc >>> 0;
      if (localChecksum !== mediaCrc) {
        onLog?.('warn', `分区 "${partition.name}" 校验和不匹配 (本地: 0x${localChecksum.toString(16)}, 设备: 0x${mediaCrc.toString(16)})，但继续执行`);
      } else {
        onLog?.('info', `分区 "${partition.name}" 校验成功`);
      }
    } catch (error) {
      onLog?.('warn', `分区 "${partition.name}" 校验失败: ${error}`);
    }
  }

  onLog?.('info', `分区 "${partition.name}" 下载完成，写入 ${totalWritten} 字节`);

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
  const { onProgress, onLog } = options || {};
  const results: DownloadPartitionResult[] = [];
  let allSuccess = true;

  let totalBytes = BigInt(0);
  const partitionDataMap = new Map<string, Uint8Array>();

  for (const partitionInfo of partitions) {
    const partitionData = dataProvider.getFileDataByMaintypeSubtype(
      ITEM_ROOTFSFAT16,
      partitionInfo.downloadFilename
    ) || dataProvider.getFileDataByFilename(partitionInfo.downloadFilename);

    if (partitionData) {
      partitionDataMap.set(partitionInfo.partition.name, partitionData);
      totalBytes += BigInt(partitionData.length);
    }
  }

  const progressCalculator = createProgressCalculator(totalBytes);

  onProgress?.('准备下载分区...', 0);

  for (let i = 0; i < partitions.length; i++) {
    const partitionInfo = partitions[i];
    const partitionData = partitionDataMap.get(partitionInfo.partition.name);

    if (!partitionData) {
      onLog?.('error', `无法找到分区镜像文件: ${partitionInfo.downloadFilename}`);
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
      onLog?.('error', `分区 "${partitionInfo.partition.name}" 下载失败，中止后续下载`);
      break;
    }
  }

  return {
    success: allSuccess,
    results,
  };
}
