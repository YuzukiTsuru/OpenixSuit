import { EfexContext } from '../Library/libEFEX';
import { UBootHeaderParser, WorkMode } from '../FlashConfig';
import { DeviceOpsOptions } from './Interface';
import i18n from '../i18n';

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
  dtbData: Uint8Array | null,
  sysconfigData: Uint8Array,
  boardConfigData: Uint8Array | null,
  options?: DeviceOpsOptions
): Promise<DownloadUbootResult> {
  const { onProgress, onLog, checkCancelled } = options || {};

  onProgress?.(i18n.t('device.downloadUboot.downloading'), 0);
  onLog?.('info', i18n.t('device.downloadUboot.downloadingBytes', { size: ubootData.length }));

  checkCancelled?.();

  const ubootBuffer = new Uint8Array(ubootData);
  const ubootHead = UBootHeaderParser.parse(ubootBuffer);
  
  UBootHeaderParser.setWorkMode(ubootBuffer, WorkMode.USB_PRODUCT);

  onLog?.('info', i18n.t('device.downloadUboot.ubootInfo', { 
    magic: ubootHead.uboot_head.magic, 
    addr: `0x${ubootHead.uboot_head.run_addr.toString(16)}` 
  }));
  onLog?.('info', i18n.t('device.downloadUboot.workModeInfo', { 
    mode: `0x${UBootHeaderParser.getWorkMode(ubootBuffer).toString(16)}`, 
    storage: UBootHeaderParser.getStorageType(ubootBuffer) 
  }));

  const timeoutSecs = calculateTimeout(ubootData.length);
  onLog?.('info', i18n.t('device.downloadUboot.settingTimeout', { secs: timeoutSecs, size: ubootData.length }));
  await ctx.fel.setTimeout(timeoutSecs);
  
  onProgress?.(i18n.t('device.downloadUboot.transferring'), 30);
  await ctx.fel.write(ubootHead.uboot_head.run_addr, ubootBuffer);

  checkCancelled?.();

  onProgress?.(i18n.t('device.downloadUboot.transferringBoardConfig'), 60);
  const dtbSysconfigBase = ubootHead.uboot_head.run_addr + UBOOT_MAX_LEN;
  
  if (dtbData) {
    await ctx.fel.write(dtbSysconfigBase, dtbData);
    onLog?.('info', i18n.t('device.downloadUboot.dtbInfo', { size: dtbData.length, addr: `0x${dtbSysconfigBase.toString(16)}` }));
  } else {
    onLog?.('info', i18n.t('device.downloadUboot.dtbNotFound'));
  }

  const sysConfigBinBase = dtbSysconfigBase + DTB_MAX_LEN;
  await ctx.fel.write(sysConfigBinBase, sysconfigData);
  onLog?.('info', i18n.t('device.downloadUboot.sysconfigInfo', { size: sysconfigData.length, addr: `0x${sysConfigBinBase.toString(16)}` }));

  const boardConfigBinBase = sysConfigBinBase + SYS_CONFIG_BIN00_MAX_LEN;
  if (boardConfigData) {
    await ctx.fel.write(boardConfigBinBase, boardConfigData);
    onLog?.('info', i18n.t('device.downloadUboot.boardConfigInfo', { size: boardConfigData.length, addr: `0x${boardConfigBinBase.toString(16)}` }));
  } else {
    onLog?.('info', i18n.t('device.downloadUboot.boardConfigNotFound'));
  }

  checkCancelled?.();

  onProgress?.(i18n.t('device.downloadUboot.executing'), 80);
  await ctx.fel.exec(ubootHead.uboot_head.run_addr);

  onProgress?.(i18n.t('device.downloadUboot.complete'), 100);
  onLog?.('info', i18n.t('device.downloadUboot.complete'));

  onLog?.('info', i18n.t('device.downloadUboot.resetTimeout'));
  await ctx.fel.setTimeout(1);

  return {
    success: true,
    run_addr: ubootHead.uboot_head.run_addr,
  };
}
