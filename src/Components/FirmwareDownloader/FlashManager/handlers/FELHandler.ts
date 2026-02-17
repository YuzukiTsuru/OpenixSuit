import { EfexContext } from '../../../../Library/libEFEX';
import { OpenixPacker, getFes, getUboot, getDtb, getSysConfigBin, getBoardConfig } from '../../../../Library/OpenixIMG';
import { initDRAM } from '../../../../Devices/InitDRAM';
import { downloadUboot } from '../../../../Devices/DownloadUboot';
import { FlashOptions } from '../../Types';
import { FlashCallbacks } from '../Callbacks';
import { ProgressManager, FEL_STAGES } from '../ProgressManager';
import i18n from '../../../../i18n';

export interface FelHandlerResult {
  success: boolean;
  newContext?: EfexContext;
  message?: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function handleFelMode(
  context: EfexContext,
  packer: OpenixPacker,
  _options: FlashOptions,
  callbacks: FlashCallbacks,
  progressManager: ProgressManager
): Promise<FelHandlerResult> {
  progressManager.defineStages(FEL_STAGES);

  callbacks.checkCancelled();

  progressManager.startStage('prepare');
  callbacks.onLog({
    timestamp: new Date(),
    level: 'info',
    message: i18n.t('flashManager.felHandler.needLoadFes'),
  });

  const fesData = await getFes(packer);
  if (!fesData) {
    callbacks.onLog({
      timestamp: new Date(),
      level: 'error',
      message: i18n.t('flashManager.felHandler.fesNotFound'),
    });
    return { success: false, message: i18n.t('flashManager.felHandler.fesNotFound') };
  }

  callbacks.onLog({
    timestamp: new Date(),
    level: 'info',
    message: i18n.t('flashManager.felHandler.fesFound', { size: fesData.length }),
  });
  progressManager.completeStage();

  callbacks.checkCancelled();

  progressManager.nextStage('init_dram');
  const dramResult = await initDRAM(context, fesData, {
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

  if (!dramResult.success) {
    return { success: false, message: i18n.t('flashManager.felHandler.dramInitFailed') };
  }

  callbacks.onLog({
    timestamp: new Date(),
    level: 'success',
    message: i18n.t('flashManager.felHandler.dramInitSuccess'),
  });
  progressManager.completeStage();

  callbacks.checkCancelled();

  progressManager.nextStage('download_uboot');

  const ubootData = await getUboot(packer);
  if (!ubootData) {
    callbacks.onLog({
      timestamp: new Date(),
      level: 'error',
      message: i18n.t('flashManager.felHandler.ubootNotFound'),
    });
    return { success: false, message: i18n.t('flashManager.felHandler.ubootNotFound') };
  }
  callbacks.onLog({
    timestamp: new Date(),
    level: 'info',
    message: i18n.t('flashManager.felHandler.ubootFound', { size: ubootData.length }),
  });

  const dtbData = await getDtb(packer);
  if (dtbData) {
    callbacks.onLog({
      timestamp: new Date(),
      level: 'info',
      message: i18n.t('flashManager.felHandler.dtbFound', { size: dtbData.length }),
    });
  } else {
    callbacks.onLog({
      timestamp: new Date(),
      level: 'info',
      message: i18n.t('flashManager.felHandler.dtbNotFound'),
    });
  }

  const sysconfigData = await getSysConfigBin(packer);
  if (!sysconfigData) {
    callbacks.onLog({
      timestamp: new Date(),
      level: 'error',
      message: i18n.t('flashManager.felHandler.sysconfigNotFound'),
    });
    return { success: false, message: i18n.t('flashManager.felHandler.sysconfigNotFound') };
  }
  callbacks.onLog({
    timestamp: new Date(),
    level: 'info',
    message: i18n.t('flashManager.felHandler.sysconfigFound', { size: sysconfigData.length }),
  });

  const boardConfigData = await getBoardConfig(packer);
  if (boardConfigData) {
    callbacks.onLog({
      timestamp: new Date(),
      level: 'info',
      message: i18n.t('flashManager.felHandler.boardConfigFound', { size: boardConfigData.length }),
    });
  } else {
    callbacks.onLog({
      timestamp: new Date(),
      level: 'info',
      message: i18n.t('flashManager.felHandler.boardConfigNotFound'),
    });
  }

  const ubootResult = await downloadUboot(context, ubootData, dtbData, sysconfigData, boardConfigData, {
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

  if (!ubootResult.success) {
    return { success: false, message: i18n.t('flashManager.felHandler.ubootDownloadFailed') };
  }

  callbacks.onLog({
    timestamp: new Date(),
    level: 'success',
    message: i18n.t('flashManager.felHandler.ubootDownloadSuccess'),
  });
  progressManager.completeStage();

  callbacks.checkCancelled();

  progressManager.nextStage('reconnect');
  await context.close();
  callbacks.onLog({
    timestamp: new Date(),
    level: 'info',
    message: i18n.t('flashManager.felHandler.waitingReenumerate'),
  });

  await sleep(2000);

  let retries = 0;
  const maxRetries = 10;
  let newContext: EfexContext | null = null;

  while (retries < maxRetries) {
    callbacks.checkCancelled();

    try {
      newContext = new EfexContext();
      await newContext.open();
      await newContext.refreshMode();

      if (newContext.mode === 'srv') {
        callbacks.onLog({
          timestamp: new Date(),
          level: 'success',
          message: i18n.t('flashManager.felHandler.switchedToFes'),
        });
        break;
      } else {
        callbacks.onLog({
          timestamp: new Date(),
          level: 'warn',
          message: i18n.t('flashManager.felHandler.modeStillWaiting', { mode: newContext.modeStr }),
        });
        await newContext.close();
      }
    } catch (e) {
      callbacks.onLog({
        timestamp: new Date(),
        level: 'info',
        message: i18n.t('flashManager.felHandler.notSwitchedYet', { retry: retries + 1, max: maxRetries }),
      });
    }

    retries++;
    const progress = Math.floor((retries / maxRetries) * 100);
    progressManager.updateStageProgress(progress);

    if (retries < maxRetries) {
      await sleep(1000);
    }
  }

  if (!newContext || newContext.mode !== 'srv') {
    return { success: false, message: i18n.t('flashManager.felHandler.reconnectFailed') };
  }

  progressManager.completeStage();

  progressManager.nextStage('ready');
  callbacks.onLog({
    timestamp: new Date(),
    level: 'info',
    message: i18n.t('flashManager.felHandler.preparingFlash'),
  });
  progressManager.completeStage();

  return { success: true, newContext };
}
