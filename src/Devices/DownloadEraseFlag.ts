import { EfexContext } from '../Library/libEFEX';
import { FES_DATA_TYPE_VALUES } from '../Library/libEFEX/Types';
import { EFEX_CRC32_VALID_FLAG } from '../FlashConfig/Constants';
import { DeviceOpsOptions } from './Interface';
import i18n from '../i18n';

export type FlashMode = 'partition' | 'keep_data' | 'partition_erase' | 'full_erase';

export interface DownloadEraseFlagResult {
  success: boolean;
}

const MAX_VERIFY_RETRIES = 5;

const EraseFlag: Record<FlashMode, number> = {
  partition: 0x1,
  keep_data: 0x2,
  partition_erase: 0x11,
  full_erase: 0x12,
};

export async function downloadEraseFlag(
  ctx: EfexContext,
  mode: FlashMode,
  options?: DeviceOpsOptions
): Promise<DownloadEraseFlagResult> {
  const { onProgress, onLog, checkCancelled } = options || {};

  onProgress?.(i18n.t('device.downloadEraseFlag.sending'), 0);
  onLog?.('info', i18n.t('device.downloadEraseFlag.sendingMode', { mode }));

  checkCancelled?.();

  const eraseInfo = new Uint8Array(16);
  const view = new DataView(eraseInfo.buffer);
  view.setUint32(0, EraseFlag[mode], true);

  onProgress?.(i18n.t('device.downloadEraseFlag.transferring'), 30);
  await ctx.fes.down(eraseInfo, 0, 'erase');

  onProgress?.(i18n.t('device.downloadEraseFlag.verifying'), 60);
  let verifySuccess = false;

  for (let i = 0; i < MAX_VERIFY_RETRIES; i++) {
    checkCancelled?.();
    
    onLog?.('info', i18n.t('device.downloadEraseFlag.verifyingAttempt', { attempt: i + 1 }));

    const verifyResp = await ctx.fes.verifyStatus(FES_DATA_TYPE_VALUES.erase);

    if (verifyResp.flag === EFEX_CRC32_VALID_FLAG) {
      onLog?.('info', i18n.t('device.downloadEraseFlag.gotCrc32Flag'));
      if (verifyResp.media_crc === 0) {
        onLog?.('info', i18n.t('device.downloadEraseFlag.verifySuccess'));
        verifySuccess = true;
      } else {
        onLog?.('error', i18n.t('device.downloadEraseFlag.verifyFailed', { status: `0x${verifyResp.media_crc.toString(16)}` }));
      }
      break;
    }

    onLog?.('info', i18n.t('device.downloadEraseFlag.verifyStatus', { status: `0x${verifyResp.flag.toString(16)}` }));
  }

  onProgress?.(i18n.t('device.downloadEraseFlag.complete'), 100);

  if (!verifySuccess) {
    onLog?.('warn', i18n.t('device.downloadEraseFlag.completedUnverified'));
  } else {
    onLog?.('info', i18n.t('device.downloadEraseFlag.completedSuccess'));
  }

  return {
    success: verifySuccess,
  };
}
