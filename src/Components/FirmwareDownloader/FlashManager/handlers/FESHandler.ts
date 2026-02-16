import { EfexContext } from '../../../../Library/libEFEX';
import { SunxiSysConfigParser, UBootHeaderParser } from '../../../../FlashConfig';
import { SunxiMbrParser } from '../../../../FlashConfig/MBRParser';
import { OpenixPacker, getMbr, getSysConfig } from '../../../../Library/OpenixIMG';
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
import { FlashCallbacks } from '../Callbacks';
import { formatSize } from '../../Utils';
import { PartitionInfo } from '../../../../FlashConfig/Types';
import { StorageType } from '../../../../FlashConfig/Constants';
import { ProgressManager, FES_STAGES } from '../ProgressManager';

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
        message: `分区 "${partitionName}" 没有指定下载文件, 跳过`,
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
          message: `分区 "${partitionName}" 没有找到镜像文件 "${downloadFilename}", 跳过`,
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
  callbacks: FlashCallbacks,
  progressManager: ProgressManager
): Promise<{ success: boolean; message?: string }> {
  progressManager.startStage('partitions');

  const downloadList = await preparePartitionDownloadList(packer, mbrInfo, options, callbacks);

  if (downloadList.length === 0) {
    callbacks.onLog({
      timestamp: new Date(),
      level: 'warn',
      message: '没有需要下载的分区',
    });
    progressManager.completeStage();
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
        progressManager.updateStageProgress(progress, stage);
      }
    },
    onLog: (level: string, message: string) => {
      callbacks.onLog({
        timestamp: new Date(),
        level: level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'info',
        message,
      });
    },
    checkCancelled: callbacks.checkCancelled,
  });

  if (!result.success) {
    return { success: false, message: '分区烧录失败' };
  }

  progressManager.completeStage();

  const totalBytes = result.results.reduce(
    (sum, r) => sum + r.bytesWritten,
    BigInt(0)
  );

  callbacks.onLog({
    timestamp: new Date(),
    level: 'success',
    message: `所有分区烧录完成, 共写入 ${formatSize(Number(totalBytes))}`,
  });

  return { success: true };
}

async function downloadMbrData(
  context: EfexContext,
  packer: OpenixPacker,
  callbacks: FlashCallbacks,
  progressManager: ProgressManager
): Promise<{ success: boolean; message?: string; partCount?: number }> {
  progressManager.startStage('mbr');

  const mbrData = getMbr(packer);
  if (!mbrData) {
    return { success: false, message: '镜像文件中未找到 MBR 数据' };
  }

  const mbrResult = await downloadMbr(context, mbrData, {
    onProgress: (stage: string, progress: number | undefined) => {
      if (progress !== undefined) {
        progressManager.updateStageProgress(progress, stage);
      }
    },
    onLog: (level: string, message: string) => {
      callbacks.onLog({
        timestamp: new Date(),
        level: level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'info',
        message,
      });
    },
    checkCancelled: callbacks.checkCancelled,
  });

  if (!mbrResult.success) {
    return { success: false, message: 'MBR 烧录验证失败' };
  }

  progressManager.completeStage();
  return { success: true, partCount: mbrResult.mbrInfo.partCount };
}

export async function handleFesMode(
  context: EfexContext,
  packer: OpenixPacker,
  options: FlashOptions,
  callbacks: FlashCallbacks,
  progressManager: ProgressManager
): Promise<FesHandlerResult> {
  progressManager.defineStages(FES_STAGES);

  callbacks.checkCancelled();

  progressManager.startStage('query_secure');
  const secure = await context.fes.querySecure();
  callbacks.onLog({
    timestamp: new Date(),
    level: 'info',
    message: `启动模式: ${UBootHeaderParser.getSunxiBootFileModeString(secure)}`,
  });
  progressManager.completeStage();

  callbacks.checkCancelled();

  progressManager.nextStage('erase_flag');
  const eraseResult = await downloadEraseFlag(context, options.mode, {
    onProgress: (stage: string, progress: number | undefined) => {
      if (progress !== undefined) {
        progressManager.updateStageProgress(progress, stage);
      }
    },
    onLog: (level: string, message: string) => {
      callbacks.onLog({
        timestamp: new Date(),
        level: level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'info',
        message,
      });
    },
    checkCancelled: callbacks.checkCancelled,
  });

  if (!eraseResult.success) {
    return { success: false, message: '擦除标志发送失败' };
  }

  callbacks.onLog({
    timestamp: new Date(),
    level: 'success',
    message: '擦除标志发送成功',
  });
  progressManager.completeStage();

  callbacks.checkCancelled();

  progressManager.nextStage('query_storage');
  const storageType = await context.fes.queryStorage();
  callbacks.onLog({
    timestamp: new Date(),
    level: 'info',
    message: `存储器类型: ${SunxiSysConfigParser.getStorageTypeFromNum(storageType)}`,
  });

  const sysConfigData = getSysConfig(packer);
  if (sysConfigData) {
    const sysConfig = SunxiSysConfigParser.parse(sysConfigData);
    const firmwareStorageType = sysConfig.storage_type;

    callbacks.onLog({
      timestamp: new Date(),
      level: 'info',
      message: `固件存储类型: ${SunxiSysConfigParser.getStorageTypeFromNum(firmwareStorageType)}`,
    });

    if (firmwareStorageType === StorageType.SPINOR && storageType !== StorageType.SPINOR) {
      callbacks.onShowPopup?.('error', '存储类型不匹配', '固件为 SPI NOR 类型, 但设备存储器是 ' +
        SunxiSysConfigParser.getStorageTypeFromNum(storageType) + ', 无法烧录');
      return {
        success: false, message: '固件为 SPI NOR 类型, 但设备存储器是 ' +
          SunxiSysConfigParser.getStorageTypeFromNum(storageType) + ', 无法烧录'
      };
    }

    if (firmwareStorageType !== StorageType.SPINOR && storageType === StorageType.SPINOR) {
      callbacks.onShowPopup?.('error', '存储类型不匹配', '设备存储器为 SPI NOR, 但固件是 ' +
        SunxiSysConfigParser.getStorageTypeFromNum(firmwareStorageType) + ', 无法烧录');
      return {
        success: false, message: '设备存储器为 SPI NOR, 但固件是 ' +
          SunxiSysConfigParser.getStorageTypeFromNum(firmwareStorageType) + ', 无法烧录'
      };
    }
  }

  const flashSize = await context.fes.probeFlashSize();
  callbacks.onLog({
    timestamp: new Date(),
    level: 'info',
    message: `存储器大小: ${formatSize(flashSize * 512)}`,
  });
  progressManager.completeStage();

  callbacks.checkCancelled();

  const needMbr = options.mode !== 'keep_data' && options.mode !== 'partition';
  let mbrInfo: { partCount: number; partitions: PartitionInfo[] };

  if (needMbr) {
    callbacks.onLog({
      timestamp: new Date(),
      level: 'info',
      message: '等待存储设备擦写完成',
    });

    const mbrResult = await downloadMbrData(context, packer, callbacks, progressManager);
    if (!mbrResult.success) {
      return { success: false, message: mbrResult.message };
    }
    callbacks.onLog({
      timestamp: new Date(),
      level: 'success',
      message: `MBR 烧录成功, 共 ${mbrResult.partCount} 个分区`,
    });
  } else {
    progressManager.startStage('mbr');
    callbacks.onLog({
      timestamp: new Date(),
      level: 'info',
      message: '跳过 MBR 烧录（保留数据模式）',
    });
    progressManager.completeStage();
  }

  callbacks.checkCancelled();

  const mbrData = getMbr(packer);
  if (!mbrData) {
    callbacks.onShowPopup?.('error', 'MBR 数据错误', '无法从固件中获取 MBR 数据');
    return { success: false, message: '无法获取 MBR 数据' };
  }
  const mbr = SunxiMbrParser.parse(mbrData);
  mbrInfo = SunxiMbrParser.toMbrInfo(mbr);

  const downloadResult = await downloadPartitionData(context, packer, mbrInfo, options, callbacks, progressManager);
  if (!downloadResult.success) {
    return { success: false, message: downloadResult.message };
  }

  callbacks.checkCancelled();

  progressManager.nextStage('boot');
  const bootResult = await downloadBoot0Boot1(context, packer, {
    onProgress: (stage, progress) => {
      if (progress !== undefined) {
        progressManager.updateStageProgress(progress, stage);
      }
    },
    onLog: (level, message) => {
      callbacks.onLog({
        timestamp: new Date(),
        level: level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'info',
        message,
      });
    },
    checkCancelled: callbacks.checkCancelled,
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
  progressManager.completeStage();

  callbacks.checkCancelled();

  progressManager.nextStage('set_mode');
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
  progressManager.completeStage();

  progressManager.nextStage('complete');
  callbacks.onLog({
    timestamp: new Date(),
    level: 'success',
    message: 'FES模式烧录完成',
  });
  progressManager.completeStage();

  return { success: true };
}
