import { EfexContext } from '../Library/libEFEX';
import { UBootHeaderParser, WorkMode } from '../FlashConfig';
import { DeviceOpsOptions } from './Interface';

export interface DownloadUbootResult {
  success: boolean;
  run_addr: number;
}

const BYTES_PER_SECOND = 64 * 1024;
const MIN_TIMEOUT_SECS = 10;
const UBOOT_MAX_LEN = 2 * 1024 * 1024;
const DTB_MAX_LEN = 1 * 1024 * 1024;
const SYS_CONFIG_BIN00_MAX_LEN = 1 * 512 * 1024;

function calculateTimeout(dataSize: number): number {
  const timeout = Math.ceil(dataSize / BYTES_PER_SECOND);
  return Math.max(timeout, MIN_TIMEOUT_SECS);
}

export async function downloadUboot(
  ctx: EfexContext,
  ubootData: Uint8Array,
  dtbData: Uint8Array,
  sysconfigData: Uint8Array,
  boardConfigData: Uint8Array,
  options?: DeviceOpsOptions
): Promise<DownloadUbootResult> {
  const { onProgress, onLog, checkCancelled } = options || {};

  onProgress?.('正在下载 U-Boot', 0);
  onLog?.('info', `Downloading ${ubootData.length} bytes U-Boot to device...`);

  checkCancelled?.();

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

  checkCancelled?.();

  onProgress?.('正在传输板级设备配置', 60);
  const dtbSysconfigBase = ubootHead.uboot_head.run_addr + UBOOT_MAX_LEN;
  await ctx.fel.write(dtbSysconfigBase, dtbData);
  onLog?.('info', `DTB 大小: ${dtbData.length} bytes, 写入地址: 0x${dtbSysconfigBase.toString(16)}`);

  const sysConfigBinBase = dtbSysconfigBase + DTB_MAX_LEN;
  await ctx.fel.write(sysConfigBinBase, sysconfigData);
  onLog?.('info', `SYS_CONFIG_BIN00 大小: ${sysconfigData.length} bytes, 写入地址: 0x${sysConfigBinBase.toString(16)}`);

  const boardConfigBinBase = sysConfigBinBase + SYS_CONFIG_BIN00_MAX_LEN;
  await ctx.fel.write(boardConfigBinBase, boardConfigData);
  onLog?.('info', `BOARD_CONFIG_BIN 大小: ${boardConfigData.length} bytes, 写入地址: 0x${boardConfigBinBase.toString(16)}`);

  checkCancelled?.();

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
