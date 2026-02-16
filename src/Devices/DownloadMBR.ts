import { EfexContext } from '../Library/libEFEX';
import { SunxiMbrParser, isValidMbr } from '../FlashConfig/MBRParser';
import { MbrInfo } from '../FlashConfig/Types';
import { EFEX_CRC32_VALID_FLAG } from '../FlashConfig/Constants';
import { DeviceOpsOptions } from './Interface';

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
  const { onProgress, onLog } = options || {};

  onProgress?.('正在等待 Flash 擦除 && 下载 MBR', 0);
  onLog?.('info', `Downloading ${mbrData.length} bytes MBR to device...`);

  if (!isValidMbr(mbrData)) {
    throw new Error('Invalid MBR data: magic number mismatch');
  }

  const mbr = SunxiMbrParser.parse(mbrData);
  const mbrInfo = SunxiMbrParser.toMbrInfo(mbr);

  // 设置 FES 超时时间为 60 秒, 因为此时可能需要擦除 flash 区域, 需要等待 erase 完成
  await ctx.fes.setTimeout(60);

  onProgress?.('正在等待 Flash 擦除并下载 MBR', 30);
  await ctx.fes.down(mbrData, 0, 'mbr');

  onProgress?.('正在验证 MBR', 60);
  let verifySuccess = false;

  for (let i = 0; i < MAX_VERIFY_RETRIES; i++) {
    onLog?.('info', `Verifying MBR download, attempt ${i + 1}...`);
    
    const verifyResp = await ctx.fes.verifyStatus(0x7f01);

    if (verifyResp.flag === EFEX_CRC32_VALID_FLAG) {
      onLog?.('info', `MBR verification got CRC32 valid flag`);
      if (verifyResp.media_crc === 0) {
        onLog?.('info', 'MBR verification successful');
        verifySuccess = true;
      } else {
        onLog?.('error', `MBR verification failed with status: 0x${verifyResp.media_crc.toString(16)}`);
      }
      break;
    }

    onLog?.('info', `MBR verification status: 0x${verifyResp.flag.toString(16)}`);
  }

  onProgress?.('MBR 下载完成', 100);

  if (!verifySuccess) {
    onLog?.('warn', 'MBR download completed but verification did not confirm success');
  } else {
    onLog?.('info', 'MBR download completed successfully');
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

  onLog?.('info', `Reading MBR file: ${mbrFilePath}`);

  const fs = await import('@tauri-apps/plugin-fs');
  const mbrData = await fs.readFile(mbrFilePath);

  return downloadMbr(ctx, mbrData, options);
}
