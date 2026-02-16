import { EfexContext } from '../Library/libEFEX';
import { SunxiMbrParser, isValidMbr } from '../FlashConfig/MBRParser';
import { MbrInfo } from '../FlashConfig/Types';
import { EFEX_CRC32_VALID_FLAG } from '../FlashConfig/Constants';
import { DeviceOpsOptions } from './Interface';
import { readFile } from '@tauri-apps/plugin-fs';
import i18n from '../i18n';

export interface DownloadMbrResult {
  success: boolean;
  mbrInfo: MbrInfo;
}

const MAX_VERIFY_RETRIES = 5;

export async function downloadMbr(
  ctx: EfexContext,
  mbrData: Uint8Array,
  options?: DeviceOpsOptions
): Promise<DownloadMbrResult> {
  const { onProgress, onLog, checkCancelled } = options || {};

  onProgress?.(i18n.t('device.downloadMbr.waitingErase'), 0);
  onLog?.('info', i18n.t('device.downloadMbr.downloadingBytes', { size: mbrData.length }));

  if (!isValidMbr(mbrData)) {
    throw new Error(i18n.t('device.downloadMbr.invalidMbr'));
  }

  checkCancelled?.();

  const mbr = SunxiMbrParser.parse(mbrData);
  const mbrInfo = SunxiMbrParser.toMbrInfo(mbr);

  await ctx.fes.setTimeout(60);

  onProgress?.(i18n.t('device.downloadMbr.erasingAndDownloading'), 30);
  await ctx.fes.down(mbrData, 0, 'mbr');

  onProgress?.(i18n.t('device.downloadMbr.verifying'), 60);
  let verifySuccess = false;

  for (let i = 0; i < MAX_VERIFY_RETRIES; i++) {
    checkCancelled?.();
    
    onLog?.('info', i18n.t('device.downloadMbr.verifyingAttempt', { attempt: i + 1 }));
    
    const verifyResp = await ctx.fes.verifyStatus(0x7f01);

    if (verifyResp.flag === EFEX_CRC32_VALID_FLAG) {
      onLog?.('info', i18n.t('device.downloadMbr.gotCrc32Flag'));
      if (verifyResp.media_crc === 0) {
        onLog?.('info', i18n.t('device.downloadMbr.verifySuccess'));
        verifySuccess = true;
      } else {
        onLog?.('error', i18n.t('device.downloadMbr.verifyFailed', { status: `0x${verifyResp.media_crc.toString(16)}` }));
      }
      break;
    }

    onLog?.('info', i18n.t('device.downloadMbr.verifyStatus', { status: `0x${verifyResp.flag.toString(16)}` }));
  }

  onProgress?.(i18n.t('device.downloadMbr.complete'), 100);

  if (!verifySuccess) {
    onLog?.('warn', i18n.t('device.downloadMbr.completedUnverified'));
  } else {
    onLog?.('info', i18n.t('device.downloadMbr.completedSuccess'));
  }

  await ctx.fes.setTimeout(1);

  return {
    success: verifySuccess,
    mbrInfo,
  };
}

export async function downloadMbrFromFile(
  ctx: EfexContext,
  mbrFilePath: string,
  options?: DeviceOpsOptions
): Promise<DownloadMbrResult> {
  const { onLog } = options || {};

  onLog?.('info', i18n.t('device.downloadMbr.readingFile', { path: mbrFilePath }));

  const mbrData = await readFile(mbrFilePath);

  return downloadMbr(ctx, mbrData, options);
}
