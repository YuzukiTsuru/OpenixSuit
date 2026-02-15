import { EfexContext } from '../Library/libEFEX';
import { FES_DATA_TYPE_VALUES } from '../Library/libEFEX/Types';
import { EFEX_CRC32_VALID_FLAG } from '../FlashConfig/Constants';
import { DeviceOpsOptions } from './Interface';

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
  const { onProgress, onLog } = options || {};

  onProgress?.('正在发送擦除标志', 0);
  onLog?.('info', `Sending erase flag (${mode}) to device...`);

  const eraseInfo = new Uint8Array(16);
  const view = new DataView(eraseInfo.buffer);
  view.setUint32(0, EraseFlag[mode], true);

  onProgress?.('正在传输擦除标志', 30);
  await ctx.fes.down(eraseInfo, 0, 'erase');

  onProgress?.('正在验证擦除标志', 60);
  let verifySuccess = false;

  for (let i = 0; i < MAX_VERIFY_RETRIES; i++) {
    onLog?.('info', `Verifying erase flag, attempt ${i + 1}...`);

    const verifyResp = await ctx.fes.verifyStatus(FES_DATA_TYPE_VALUES.erase);

    if (verifyResp.flag === EFEX_CRC32_VALID_FLAG) {
      onLog?.('info', 'Erase flag verification got CRC32 valid flag');
      if (verifyResp.media_crc === 0) {
        onLog?.('info', 'Erase flag verification successful');
        verifySuccess = true;
      } else {
        onLog?.('error', `Erase flag verification failed with status: 0x${verifyResp.media_crc.toString(16)}`);
      }
      break;
    }

    onLog?.('info', `Erase flag verification status: 0x${verifyResp.flag.toString(16)}`);
  }

  onProgress?.('擦除标志发送完成', 100);

  if (!verifySuccess) {
    onLog?.('warn', 'Erase flag download completed but verification did not confirm success');
  } else {
    onLog?.('info', 'Erase flag download completed successfully');
  }

  return {
    success: verifySuccess,
  };
}
