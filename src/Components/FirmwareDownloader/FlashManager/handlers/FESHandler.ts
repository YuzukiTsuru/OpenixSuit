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
  setUbifsInterface,
  PartitionDownloadInfo,
  PartitionDataProvider,
  UbifsDataProvider,
} from '../../../../Devices';
import { FlashOptions } from '../../Types';
import { FlashCallbacks } from '../Callbacks';
import { formatSize } from '../../Utils';
import { PartitionInfo } from '../../../../FlashConfig/Types';
import { StorageType } from '../../../../FlashConfig/Constants';
import { ProgressManager, FES_STAGES } from '../ProgressManager';
import i18n from '../../../../i18n';

export interface FesHandlerResult {
  success: boolean;
  message?: string;
}

async function preparePartitionDownloadList(
  packer: OpenixPacker,
  mbrInfo: { partCount: number; partitions: PartitionInfo[] },
  options: FlashOptions,
  callbacks: FlashCallbacks
): Promise<PartitionDownloadInfo[]> {
  const partitionParser = new OpenixPartition();
  let partitionData = await packer.getFileDataByFilename('sys_partition.bin');
  if (!partitionData) {
    partitionData = await packer.getFileDataByFilename('sys_partition.fex');
  }

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
          message: i18n.t('flashManager.fesHandler.skipUserDataPartition', { name: partitionName }),
        });
        continue;
      }
    }

    if (options.mode === 'partition' && options.partitions) {
      if (!options.partitions.includes(partitionName)) {
        callbacks.onLog({
          timestamp: new Date(),
          level: 'info',
          message: i18n.t('flashManager.fesHandler.skipPartitionNotInList', { name: partitionName }),
        });
        continue;
      }
    }

    const configPartition = configPartitions.find(p => p.name === partitionName);

    if (!configPartition?.downloadfile) {
      callbacks.onLog({
        timestamp: new Date(),
        level: 'info',
        message: i18n.t('flashManager.fesHandler.partitionNoDownloadFile', { name: partitionName }),
      });
      continue;
    } else {
      const downloadFilename = configPartition.downloadfile;
      const downloadSubtype = packer.buildSubtypeByFilename(downloadFilename);

      let hasImage = packer.getFileInfoByMaintypeSubtype('12345678', downloadSubtype) !== null;
      if (!hasImage) {
        hasImage = packer.getFileInfoByFilename(downloadFilename) !== null;
      }

      if (!hasImage) {
        callbacks.onLog({
          timestamp: new Date(),
          level: 'warn',
          message: i18n.t('flashManager.fesHandler.partitionImageNotFound', { name: partitionName, filename: downloadFilename }),
        });
        continue;
      }

      const needVerify = options.verifyDownload;

      downloadList.push({
        partition: mbrPartition,
        downloadFilename,
        downloadSubtype,
        needVerify,
      });
    }
  }

  return downloadList;
}

async function downloadPartitionData(
  context: EfexContext,
  downloadList: PartitionDownloadInfo[],
  dataProvider: PartitionDataProvider,
  callbacks: FlashCallbacks,
  progressManager: ProgressManager
): Promise<{ success: boolean; message?: string }> {
  progressManager.startStage('partitions');

  if (downloadList.length === 0) {
    callbacks.onLog({
      timestamp: new Date(),
      level: 'warn',
      message: i18n.t('flashManager.fesHandler.noPartitionsToDownload'),
    });
    progressManager.completeStage();
    return { success: true, message: i18n.t('flashManager.fesHandler.noPartitionsToDownload') };
  }

  callbacks.onLog({
    timestamp: new Date(),
    level: 'info',
    message: i18n.t('flashManager.fesHandler.partitionsToFlash', { count: downloadList.length }),
  });

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
    return { success: false, message: i18n.t('flashManager.fesHandler.partitionFlashFailed') };
  }

  progressManager.completeStage();

  const totalBytes = result.results.reduce(
    (sum, r) => sum + r.bytesWritten,
    BigInt(0)
  );

  callbacks.onLog({
    timestamp: new Date(),
    level: 'success',
    message: i18n.t('flashManager.fesHandler.allPartitionsComplete', { size: formatSize(Number(totalBytes)) }),
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

  const mbrData = await getMbr(packer);
  if (!mbrData) {
    return { success: false, message: i18n.t('flashManager.fesHandler.mbrNotFound') };
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
    return { success: false, message: i18n.t('flashManager.fesHandler.mbrVerifyFailed') };
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
    message: i18n.t('flashManager.fesHandler.bootMode', { mode: UBootHeaderParser.getSunxiBootFileModeString(secure) }),
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
    return { success: false, message: i18n.t('flashManager.fesHandler.eraseFlagFailed') };
  }

  callbacks.onLog({
    timestamp: new Date(),
    level: 'success',
    message: i18n.t('flashManager.fesHandler.eraseFlagSuccess'),
  });
  progressManager.completeStage();

  callbacks.checkCancelled();

  progressManager.nextStage('query_storage');
  const storageType = await context.fes.queryStorage();
  callbacks.onLog({
    timestamp: new Date(),
    level: 'info',
    message: i18n.t('flashManager.fesHandler.storageType', { type: SunxiSysConfigParser.getStorageTypeFromNum(storageType) }),
  });

  const sysConfigData = await getSysConfig(packer);
  if (sysConfigData) {
    const sysConfig = SunxiSysConfigParser.parse(sysConfigData);
    const firmwareStorageType = sysConfig.storage_type;

    callbacks.onLog({
      timestamp: new Date(),
      level: 'info',
      message: i18n.t('flashManager.fesHandler.firmwareStorageType', { type: SunxiSysConfigParser.getStorageTypeFromNum(firmwareStorageType) }),
    });

    if (firmwareStorageType === StorageType.SPINOR && storageType !== StorageType.SPINOR) {
      const errorMsg = i18n.t('flashManager.fesHandler.storageMismatchFirmwareSpinor', { device: SunxiSysConfigParser.getStorageTypeFromNum(storageType) });
      callbacks.onShowPopup?.('error', i18n.t('flashManager.fesHandler.storageMismatchTitle'), errorMsg);
      return { success: false, message: errorMsg };
    }

    if (firmwareStorageType !== StorageType.SPINOR && storageType === StorageType.SPINOR) {
      const errorMsg = i18n.t('flashManager.fesHandler.storageMismatchDeviceSpinor', { firmware: SunxiSysConfigParser.getStorageTypeFromNum(firmwareStorageType) });
      callbacks.onShowPopup?.('error', i18n.t('flashManager.fesHandler.storageMismatchTitle'), errorMsg);
      return { success: false, message: errorMsg };
    }
  }

  const flashSize = await context.fes.probeFlashSize();
  callbacks.onLog({
    timestamp: new Date(),
    level: 'info',
    message: i18n.t('flashManager.fesHandler.storageSize', { size: formatSize(flashSize * 512) }),
  });
  progressManager.completeStage();

  callbacks.checkCancelled();

  const mbrData = await getMbr(packer);
  if (!mbrData) {
    callbacks.onShowPopup?.('error', i18n.t('flashManager.fesHandler.mbrDataErrorTitle'), i18n.t('flashManager.fesHandler.mbrDataErrorMsg'));
    return { success: false, message: i18n.t('flashManager.fesHandler.mbrDataErrorMsg') };
  }
  const mbr = SunxiMbrParser.parse(mbrData);
  const mbrInfo = SunxiMbrParser.toMbrInfo(mbr);

  const downloadList = await preparePartitionDownloadList(packer, mbrInfo, options, callbacks);

  const dataProvider: UbifsDataProvider = {
    getFileInfoByFilename: (filename: string) => packer.getFileInfoByFilename(filename),
    getFileInfoByMaintypeSubtype: (maintype: string, subtype: string) =>
      packer.getFileInfoByMaintypeSubtype(maintype, subtype),
    readFileDataByFilenameStream: (filename: string, chunkSize?: number) =>
      packer.readDataByFilenameStream(filename, chunkSize),
    readFileDataByMaintypeSubtypeStream: (maintype: string, subtype: string, chunkSize?: number) =>
      packer.readDataByMaintypeSubtypeStream(maintype, subtype, chunkSize),
  };

  const ubifsResult = await setUbifsInterface(context, downloadList, dataProvider, storageType, {
    onLog: (level, message) => {
      callbacks.onLog({
        timestamp: new Date(),
        level: level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'info',
        message,
      });
    },
    checkCancelled: callbacks.checkCancelled,
  });

  if (!ubifsResult.success) {
    return { success: false, message: i18n.t('flashManager.fesHandler.ubifsInterfaceFailed') };
  }

  const needMbr = options.mode !== 'keep_data' && options.mode !== 'partition';

  if (needMbr) {
    callbacks.onLog({
      timestamp: new Date(),
      level: 'info',
      message: i18n.t('flashManager.fesHandler.waitingForErase'),
    });

    const mbrResult = await downloadMbrData(context, packer, callbacks, progressManager);
    if (!mbrResult.success) {
      return { success: false, message: mbrResult.message };
    }
    callbacks.onLog({
      timestamp: new Date(),
      level: 'success',
      message: i18n.t('flashManager.fesHandler.mbrFlashSuccess', { count: mbrResult.partCount }),
    });
  } else {
    progressManager.startStage('mbr');
    callbacks.onLog({
      timestamp: new Date(),
      level: 'info',
      message: i18n.t('flashManager.fesHandler.skipMbrKeepData'),
    });
    progressManager.completeStage();
  }

  callbacks.checkCancelled();

  const downloadResult = await downloadPartitionData(context, downloadList, dataProvider, callbacks, progressManager);
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
    return { success: false, message: bootResult.boot0Result.message || i18n.t('flashManager.fesHandler.boot0Failed') };
  }

  if (!bootResult.boot1Result.success) {
    return { success: false, message: bootResult.boot1Result.message || i18n.t('flashManager.fesHandler.boot1Failed') };
  }

  callbacks.onLog({
    timestamp: new Date(),
    level: 'success',
    message: i18n.t('flashManager.fesHandler.bootComplete'),
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
      message: modeResult.message || i18n.t('flashManager.fesHandler.setModeFailed'),
    });
  }
  progressManager.completeStage();

  progressManager.nextStage('complete');
  callbacks.onLog({
    timestamp: new Date(),
    level: 'success',
    message: i18n.t('flashManager.fesHandler.fesFlashComplete'),
  });
  progressManager.completeStage();

  return { success: true };
}
