import { EfexContext } from '../../../../Library/libEFEX';
import { SunxiSysConfigParser, UBootHeaderParser } from '../../../../FlashConfig';
import { SunxiMbrParser } from '../../../../FlashConfig/MBRParser';
import { OpenixPacker, getMbr } from '../../../../Library/OpenixIMG';
import { OpenixPartition } from '../../../../Library/OpenixIMG/OpenixPartition';
import {
  downloadMbr,
  downloadEraseFlag,
  downloadPartitions,
  downloadBoot0Boot1,
  setDeviceNextMode,
  PartitionDownloadInfo,
  PartitionDataProvider,
} from '../../../../Devices';
import { FlashOptions } from '../../Types';
import { FlashCallbacks } from '../callbacks';
import { formatSize } from '../../Utils';
import { PartitionInfo } from '../../../../FlashConfig/Types';

export interface FesHandlerResult {
  success: boolean;
  message?: string;
}

const PARTITION_DOWNLOADFILE_SUFFIX = '_0000000000';

function buildDownloadFilename(partitionName: string): string {
  return `${partitionName.toUpperCase()}${PARTITION_DOWNLOADFILE_SUFFIX}`;
}

async function preparePartitionDownloadList(
  packer: OpenixPacker,
  mbrInfo: { partCount: number; partitions: PartitionInfo[] },
  options: FlashOptions,
  callbacks: FlashCallbacks
): Promise<PartitionDownloadInfo[]> {
  const partitionParser = new OpenixPartition();
  const partitionData = packer.getFileDataByFilename('sys_partition.bin')
    || packer.getFileDataByFilename('sys_partition.fex');

  const partitionConfig = partitionData ? partitionParser.parseFromData(partitionData) : false;
  const configPartitions = partitionConfig ? partitionParser.getPartitions() : [];

  const downloadList: PartitionDownloadInfo[] = [];

  for (let i = 0; i < mbrInfo.partCount; i++) {
    const mbrPartition = mbrInfo.partitions[i];
    const partitionName = mbrPartition.name;

    if (options.mode === 'keep_data') {
      const isUserData = partitionName.toLowerCase() === 'UDISK'.toLowerCase()
        || partitionName.toLowerCase() === 'private'.toLowerCase()
        || partitionName.toLowerCase() === 'reserve'.toLowerCase();

      if (isUserData) {
        callbacks.onLog({
          timestamp: new Date(),
          level: 'info',
          message: `跳过用户数据分区 "${partitionName}" (保留数据模式)`,
        });
        continue;
      }
    }

    if (options.mode === 'partition' && options.partitions) {
      if (!options.partitions.includes(partitionName)) {
        callbacks.onLog({
          timestamp: new Date(),
          level: 'info',
          message: `跳过分区 "${partitionName}" (未在指定分区列表中)`,
        });
        continue;
      }
    }

    const configPartition = configPartitions.find(p => p.name === partitionName);

    if (!configPartition?.downloadfile) {
      callbacks.onLog({
        timestamp: new Date(),
        level: 'info',
        message: `分区 "${partitionName}" 没有指定下载文件，跳过`,
      });
      continue;
    } else {
      const downloadFilename = configPartition?.downloadfile
        || buildDownloadFilename(partitionName);

      const downloadData = packer.getFileDataByMaintypeSubtype('12345678', downloadFilename)
        || packer.getFileDataByFilename(downloadFilename);

      if (!downloadData) {
        callbacks.onLog({
          timestamp: new Date(),
          level: 'warn',
          message: `分区 "${partitionName}" 没有找到镜像文件 "${downloadFilename}"，跳过`,
        });
        continue;
      }

      const needVerify = options.verifyDownload;

      downloadList.push({
        partition: mbrPartition,
        downloadFilename,
        needVerify,
      });
    }
  }

  return downloadList;
}

async function downloadPartitionData(
  context: EfexContext,
  packer: OpenixPacker,
  mbrInfo: { partCount: number; partitions: PartitionInfo[] },
  options: FlashOptions,
  callbacks: FlashCallbacks
): Promise<{ success: boolean; message?: string }> {
  callbacks.onProgress({ percent: 40, stage: 'FES模式: 准备分区数据...' });

  const downloadList = await preparePartitionDownloadList(packer, mbrInfo, options, callbacks);

  if (downloadList.length === 0) {
    callbacks.onLog({
      timestamp: new Date(),
      level: 'warn',
      message: '没有需要下载的分区',
    });
    return { success: true, message: '没有需要下载的分区' };
  }

  callbacks.onLog({
    timestamp: new Date(),
    level: 'info',
    message: `共 ${downloadList.length} 个分区需要烧录`,
  });

  const dataProvider: PartitionDataProvider = {
    getFileDataByFilename: (filename: string) => packer.getFileDataByFilename(filename),
    getFileDataByMaintypeSubtype: (maintype: string, subtype: string) =>
      packer.getFileDataByMaintypeSubtype(maintype, subtype),
  };

  const result = await downloadPartitions(context, downloadList, dataProvider, {
    onProgress: (stage: string, progress: number | undefined) => {
      if (progress !== undefined) {
        const basePercent = 40;
        const maxPercent = 95;
        const scaledProgress = basePercent + (progress / 100) * (maxPercent - basePercent);
        callbacks.onProgress({ percent: scaledProgress, stage });
      }
    },
    onLog: (level: string, message: string) => {
      callbacks.onLog({
        timestamp: new Date(),
        level: level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'info',
        message,
      });
    },
  });

  if (!result.success) {
    return { success: false, message: '分区烧录失败' };
  }

  const totalBytes = result.results.reduce(
    (sum, r) => sum + r.bytesWritten,
    BigInt(0)
  );

  callbacks.onLog({
    timestamp: new Date(),
    level: 'success',
    message: `所有分区烧录完成，共写入 ${formatSize(Number(totalBytes))}`,
  });

  return { success: true };
}

async function downloadMbrData(
  context: EfexContext,
  packer: OpenixPacker,
  callbacks: FlashCallbacks
): Promise<{ success: boolean; message?: string; partCount?: number }> {
  callbacks.onProgress({ percent: 30, stage: 'FES模式: 准备烧录 MBR...' });

  const mbrData = getMbr(packer);
  if (!mbrData) {
    return { success: false, message: '镜像文件中未找到 MBR 数据' };
  }

  const mbrResult = await downloadMbr(context, mbrData, {
    onProgress: (stage: string, progress: number | undefined) => {
      if (progress !== undefined) {
        callbacks.onProgress({ percent: 30 + progress * 0.2, stage });
      }
    },
    onLog: (level: string, message: string) => {
      callbacks.onLog({
        timestamp: new Date(),
        level: level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'info',
        message,
      });
    },
  });

  if (!mbrResult.success) {
    return { success: false, message: 'MBR 烧录验证失败' };
  }

  return { success: true, partCount: mbrResult.mbrInfo.partCount };
}

export async function handleFesMode(
  context: EfexContext,
  packer: OpenixPacker,
  options: FlashOptions,
  callbacks: FlashCallbacks
): Promise<FesHandlerResult> {
  // 1. 查询启动模式
  const secure = await context.fes.querySecure();
  callbacks.onLog({
    timestamp: new Date(),
    level: 'info',
    message: `启动模式: ${UBootHeaderParser.getSunxiBootFileModeString(secure)}`,
  });

  // 2. 发送擦除标志
  callbacks.onProgress({ percent: 20, stage: 'FES模式: 发送擦除标志...' });

  const eraseResult = await downloadEraseFlag(context, options.mode, {
    onProgress: (stage: string, progress: number | undefined) => {
      if (progress !== undefined) {
        callbacks.onProgress({ percent: 20 + progress * 0.1, stage });
      }
    },
    onLog: (level: string, message: string) => {
      callbacks.onLog({
        timestamp: new Date(),
        level: level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'info',
        message,
      });
    },
  });

  if (!eraseResult.success) {
    return { success: false, message: '擦除标志发送失败' };
  }

  callbacks.onLog({
    timestamp: new Date(),
    level: 'success',
    message: '擦除标志发送成功',
  });

  callbacks.onProgress({ percent: 10, stage: 'FES模式: 查询存储器...' });

  // 3. 查询存储器类型和大小
  const storageType = await context.fes.queryStorage();
  callbacks.onLog({
    timestamp: new Date(),
    level: 'info',
    message: `存储器类型: ${SunxiSysConfigParser.getStorageTypeFromNum(storageType)}`,
  });

  const flashSize = await context.fes.probeFlashSize();
  callbacks.onLog({
    timestamp: new Date(),
    level: 'info',
    message: `存储器大小: ${formatSize(flashSize * 512)}`,
  });

  // 4. 处理 MBR 烧录
  const needMbr = options.mode !== 'keep_data' && options.mode !== 'partition';
  let mbrInfo: { partCount: number; partitions: PartitionInfo[] };

  if (needMbr) {
    const mbrResult = await downloadMbrData(context, packer, callbacks);
    if (!mbrResult.success) {
      return { success: false, message: mbrResult.message };
    }
    callbacks.onLog({
      timestamp: new Date(),
      level: 'success',
      message: `MBR 烧录成功，共 ${mbrResult.partCount} 个分区`,
    });
  } else {
    callbacks.onLog({
      timestamp: new Date(),
      level: 'info',
      message: '跳过 MBR 烧录（保留数据模式）',
    });
  }

  // 5. 解析 MBR 信息
  const mbrData = getMbr(packer);
  if (!mbrData) {
    return { success: false, message: '无法获取 MBR 数据' };
  }
  const mbr = SunxiMbrParser.parse(mbrData);
  mbrInfo = SunxiMbrParser.toMbrInfo(mbr);

  // 6. 处理分区数据烧录
  const downloadResult = await downloadPartitionData(context, packer, mbrInfo, options, callbacks);
  if (!downloadResult.success) {
    return { success: false, message: downloadResult.message };
  }

  // 7. 下载 Boot0 和 Boot1
  callbacks.onProgress({ percent: 90, stage: 'FES模式: 下载 Boot0/Boot1...' });

  const bootResult = await downloadBoot0Boot1(context, packer, {
    onProgress: (stage, progress) => {
      if (progress !== undefined) {
        callbacks.onProgress({ percent: 90 + progress * 0.05, stage });
      }
    },
    onLog: (level, message) => {
      callbacks.onLog({
        timestamp: new Date(),
        level: level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'info',
        message,
      });
    },
  });

  if (!bootResult.boot0Result.success) {
    return { success: false, message: bootResult.boot0Result.message || 'Boot0 下载失败' };
  }

  if (!bootResult.boot1Result.success) {
    return { success: false, message: bootResult.boot1Result.message || 'Boot1 下载失败' };
  }

  callbacks.onLog({
    timestamp: new Date(),
    level: 'success',
    message: `Boot0/Boot1 下载完成`,
  });

  // 8. 设置设备下一步模式
  callbacks.onProgress({ percent: 95, stage: 'FES模式: 设置设备状态...' });

  const modeResult = await setDeviceNextMode(context, options.postFlashAction, {
    onLog: (level, message) => {
      callbacks.onLog({
        timestamp: new Date(),
        level: level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'info',
        message,
      });
    },
  });

  if (!modeResult.success) {
    callbacks.onLog({
      timestamp: new Date(),
      level: 'warn',
      message: modeResult.message || '设置设备模式失败',
    });
  }

  // 9. 完成
  callbacks.onProgress({ percent: 100, stage: 'FES模式: 烧录完成' });
  callbacks.onLog({
    timestamp: new Date(),
    level: 'success',
    message: 'FES模式烧录完成',
  });

  return { success: true };
}
