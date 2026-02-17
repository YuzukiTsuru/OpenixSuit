import { EfexContext } from '../Library/libEFEX';
import {
  OpenixPacker,
  getDtb,
  getFes,
  getUboot,
  getSysConfigBin,
  getBoardConfig
} from '../Library/OpenixIMG';
import { initDRAM } from './InitDRAM';
import { downloadUboot } from './DownloadUboot';
import { DeviceOpsOptions } from './Interface';
import i18n from '../i18n';

export interface Fel2FesResult {
  success: boolean;
  message: string;
  newContext?: EfexContext;
}

export async function fel2fes(
  ctx: EfexContext,
  packer: OpenixPacker,
  options?: DeviceOpsOptions
): Promise<Fel2FesResult> {
  const { onProgress, onLog } = options || {};

  onProgress?.(i18n.t('device.fel2fes.preparing'), 0);
  onLog?.('info', i18n.t('device.fel2fes.needLoadFes'));

  const fesData = await getFes(packer);
  if (!fesData) {
    onLog?.('error', i18n.t('device.fel2fes.fesNotFound'));
    return {
      success: false,
      message: i18n.t('device.fel2fes.fesNotFound'),
    };
  }

  onLog?.('info', i18n.t('device.fel2fes.fesFound', { size: fesData.length }));

  onProgress?.(i18n.t('device.fel2fes.initDram'), 10);

  const dramResult = await initDRAM(ctx, fesData, {
    onProgress: (stage, progress) => {
      if (progress !== undefined) {
        const basePercent = 10;
        const rangePercent = 35;
        const currentPercent = basePercent + Math.floor((progress / 100) * rangePercent);
        onProgress?.(`${i18n.t('device.fel2fes.felMode')}: ${stage}`, currentPercent);
      } else {
        onProgress?.(`${i18n.t('device.fel2fes.felMode')}: ${stage}`, 10);
      }
    },
    onLog: (level, message) => {
      onLog?.(level, message);
    },
  });

  if (!dramResult.success) {
    onLog?.('error', i18n.t('device.fel2fes.dramInitFailed'));
    return {
      success: false,
      message: i18n.t('device.fel2fes.dramInitFailed'),
    };
  }

  onLog?.('info', i18n.t('device.fel2fes.dramInitSuccess'));

  onProgress?.(i18n.t('device.fel2fes.preparingUboot'), 50);

  const ubootData = await getUboot(packer);
  if (!ubootData) {
    onLog?.('error', i18n.t('device.fel2fes.ubootNotFound'));
    return {
      success: false,
      message: i18n.t('device.fel2fes.ubootNotFound'),
    };
  }

  onLog?.('info', i18n.t('device.fel2fes.ubootFound', { size: ubootData.length }));

  const dtbData = await getDtb(packer);
  if (dtbData) {
    onLog?.('info', i18n.t('device.fel2fes.dtbFound', { size: dtbData.length }));
  } else {
    onLog?.('info', i18n.t('device.fel2fes.dtbNotFound'));
  }

  const sysconfigData = await getSysConfigBin(packer);
  if (!sysconfigData) {
    onLog?.('error', i18n.t('device.fel2fes.sysconfigNotFound'));
    return {
      success: false,
      message: i18n.t('device.fel2fes.sysconfigNotFound'),
    };
  }

  onLog?.('info', i18n.t('device.fel2fes.sysconfigFound', { size: sysconfigData.length }));

  const boardConfigData = await getBoardConfig(packer);
  if (boardConfigData) {
    onLog?.('info', i18n.t('device.fel2fes.boardConfigFound', { size: boardConfigData.length }));
  } else {
    onLog?.('info', i18n.t('device.fel2fes.boardConfigNotFound'));
  }

  onProgress?.(i18n.t('device.fel2fes.downloadingUboot'), 55);

  const ubootResult = await downloadUboot(ctx, ubootData, dtbData, sysconfigData, boardConfigData, {
    onProgress: (stage, progress) => {
      if (progress !== undefined) {
        const basePercent = 55;
        const rangePercent = 25;
        const currentPercent = basePercent + Math.floor((progress / 100) * rangePercent);
        onProgress?.(`${i18n.t('device.fel2fes.felMode')}: ${stage}`, currentPercent);
      } else {
        onProgress?.(`${i18n.t('device.fel2fes.felMode')}: ${stage}`, 55);
      }
    },
    onLog: (level, message) => {
      onLog?.(level, message);
    },
  });

  if (!ubootResult.success) {
    onLog?.('error', i18n.t('device.fel2fes.ubootDownloadFailed'));
    return {
      success: false,
      message: i18n.t('device.fel2fes.ubootDownloadFailed'),
    };
  }

  onLog?.('info', i18n.t('device.fel2fes.ubootDownloadSuccess'));

  onProgress?.(i18n.t('device.fel2fes.waitingReconnect'), 80);

  await ctx.close();

  onLog?.('info', i18n.t('device.fel2fes.waitingReenumerate'));

  await sleep(2000);

  onProgress?.(i18n.t('device.fel2fes.reconnecting'), 85);

  let retries = 0;
  const maxRetries = 10;

  while (retries < maxRetries) {
    try {
      ctx = new EfexContext();
      await ctx.open();
      await ctx.refreshMode();

      if (ctx.mode === 'srv') {
        onLog?.('info', i18n.t('device.fel2fes.switchedToFes'));
        onProgress?.(i18n.t('device.fel2fes.fesConnected'), 90);
        break;
      } else {
        onLog?.('warn', i18n.t('device.fel2fes.modeStillWaiting', { mode: ctx.modeStr }));
        await ctx.close();
      }
    } catch (e) {
      onLog?.('info', i18n.t('device.fel2fes.notSwitchedYet', { retry: retries + 1, max: maxRetries }));
    }

    retries++;
    if (retries < maxRetries) {
      await sleep(1000);
    }
  }

  if (!ctx || ctx.mode !== 'srv') {
    return {
      success: false,
      message: i18n.t('device.fel2fes.reconnectFailed'),
    };
  }

  onProgress?.(i18n.t('device.fel2fes.preparingFlash'), 95);

  return {
    success: true,
    message: i18n.t('device.fel2fes.switchSuccess'),
    newContext: ctx,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
