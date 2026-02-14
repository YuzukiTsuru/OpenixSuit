import { EfexContext } from '../Library/libEFEX';
import { UBootHeaderParser, WorkMode } from '../FlashConfig';
import { DeviceOpsOptions } from './Interface';

export interface DownloadUbootResult {
  success: boolean;
  run_addr: number;
}

const BYTES_PER_SECOND = 64 * 1024;
const MIN_TIMEOUT_SECS = 10;

function calculateTimeout(dataSize: number): number {
  const timeout = Math.ceil(dataSize / BYTES_PER_SECOND);
  return Math.max(timeout, MIN_TIMEOUT_SECS);
}

export async function downloadUboot(
  ctx: EfexContext,
  ubootData: Uint8Array,
  options?: DeviceOpsOptions
): Promise<DownloadUbootResult> {
  const { onProgress, onLog } = options || {};

  onProgress?.('正在下载 U-Boot', 0);
  onLog?.('info', `Downloading ${ubootData.length} bytes U-Boot to device...`);

  const ubootBuffer = new Uint8Array(ubootData);
  const ubootHead = UBootHeaderParser.parse(ubootBuffer);
  
  UBootHeaderParser.setWorkMode(ubootBuffer, WorkMode.USB_PRODUCT);

  onLog?.('info', `U-Boot magic: ${ubootHead.uboot_head.magic}, run_addr: 0x${ubootHead.uboot_head.run_addr.toString(16)}`);
  onLog?.('info', `Work mode: 0x${UBootHeaderParser.getWorkMode(ubootBuffer).toString(16)}, Storage type: ${UBootHeaderParser.getStorageType(ubootBuffer)}`);

  const timeoutSecs = calculateTimeout(ubootData.length);
  onLog?.('info', `Setting write timeout to ${timeoutSecs} seconds for ${ubootData.length} bytes`);
  await ctx.fel.setWriteTimeout(timeoutSecs);
  
  onProgress?.('正在传输 U-Boot', 30);
  await ctx.fel.write(ubootHead.uboot_head.run_addr, ubootBuffer);

  onProgress?.('正在执行 U-Boot', 80);
  await ctx.fel.exec(ubootHead.uboot_head.run_addr);

  onProgress?.('U-Boot 下载完成', 100);
  onLog?.('info', 'U-Boot download completed successfully');

  onLog?.('info', `Setting fel write timeout to default`);
  await ctx.fel.setWriteTimeout(1);

  return {
    success: true,
    run_addr: ubootHead.uboot_head.run_addr,
  };
}
