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
  options?: DeviceOpsOptions
): Promise<DownloadPartitionResult> {
  const { onProgress, onLog } = options || {};
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

    if (totalChunks > 0) {
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

  const totalPartitions = partitions.length;

  for (let i = 0; i < partitions.length; i++) {
    const partitionInfo = partitions[i];
    const overallProgress = Math.floor((i / totalPartitions) * 100);

    onProgress?.(`准备下载分区 [${i + 1}/${totalPartitions}] "${partitionInfo.partition.name}"`, overallProgress);

    const result = await downloadPartition(ctx, partitionInfo, dataProvider, {
      ...options,
      onProgress: (stage, progress) => {
        if (progress !== undefined) {
          const combinedProgress = overallProgress + Math.floor(progress / totalPartitions);
          onProgress?.(stage, combinedProgress);
        }
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
