import { EfexContext, FES_DATA_TYPE_VALUES } from '../Library/libEFEX';
import { StorageType, BootFileMode, EFEX_CRC32_VALID_FLAG } from '../FlashConfig/Constants';
import { DeviceOpsOptions } from './Interface';
import { OpenixPacker } from '../Library/OpenixIMG';
import i18n from '../i18n';

export interface DownloadBootResult {
  success: boolean;
  message?: string;
  size?: number;
}

export interface BootDataProvider {
  getFileDataByMaintypeSubtype(maintype: string, subtype: string): Uint8Array | null;
}

function getBoot1Subtype(secureType: number, storageType: number): { maintype: string; subtype: string } | null {
  switch (secureType) {
    case BootFileMode.NORMAL:
      return { maintype: '12345678', subtype: 'UBOOT_0000000000' };
    case BootFileMode.TOC:
      return { maintype: '12345678', subtype: 'TOC1_00000000000' };
    case BootFileMode.PKG:
      if (storageType === StorageType.SPINOR) {
        return { maintype: '12345678', subtype: 'BOOTPKG-NOR00000' };
      }
      return { maintype: '12345678', subtype: 'BOOTPKG-00000000' };
    default:
      return null;
  }
}

function getBoot0Subtype(
  secureType: number,
  storageType: number
): { maintype: string; subtype: string } | null {
  if (secureType === BootFileMode.NORMAL || secureType === BootFileMode.PKG) {
    switch (storageType) {
      case StorageType.NAND:
      case StorageType.SPINAND:
        return { maintype: 'BOOT    ', subtype: 'BOOT0_0000000000' };
      case StorageType.SDCARD:
      case StorageType.EMMC:
      case StorageType.EMMC3:
      case StorageType.EMMC0:
        return { maintype: '12345678', subtype: '1234567890BOOT_0' };
      case StorageType.SPINOR:
        return { maintype: '12345678', subtype: '1234567890BNOR_0' };
      case StorageType.UFS:
        return { maintype: '12345678', subtype: '1234567890BUFS_0' };
      default:
        return null;
    }
  } else {
    switch (storageType) {
      case StorageType.SDCARD:
      case StorageType.SD1:
        return { maintype: '12345678', subtype: 'TOC0_sdcard00000' };
      case StorageType.NAND:
      case StorageType.SPINAND:
        return { maintype: '12345678', subtype: 'TOC0_nand0000000' };
      case StorageType.SPINOR:
        return { maintype: '12345678', subtype: 'TOC0_spinor00000' };
      case StorageType.UFS:
        return { maintype: '12345678', subtype: 'TOC0_ufs00000000' };
      default:
        return { maintype: '12345678', subtype: 'TOC0_00000000000' };
    }
  }
}

export async function downloadBoot1(
  ctx: EfexContext,
  dataProvider: BootDataProvider,
  storageType: number,
  options?: DeviceOpsOptions
): Promise<DownloadBootResult> {
  const { onProgress, onLog, checkCancelled } = options || {};

  onProgress?.(i18n.t('device.downloadBoot.downloadingBoot1'), 0);
  onLog?.('info', i18n.t('device.downloadBoot.startBoot1'));

  checkCancelled?.();

  const secureType = await ctx.fes.querySecure();
  onLog?.('info', i18n.t('device.downloadBoot.secureType', { type: secureType }));

  const boot1Info = getBoot1Subtype(secureType, storageType);
  if (!boot1Info) {
    onLog?.('error', i18n.t('device.downloadBoot.unsupportedSecureType', { type: secureType }));
    return { success: false, message: i18n.t('device.downloadBoot.unsupportedBootMode', { mode: secureType }) };
  }

  onLog?.('info', i18n.t('device.downloadBoot.boot1Image', { maintype: boot1Info.maintype, subtype: boot1Info.subtype }));

  const boot1Data = dataProvider.getFileDataByMaintypeSubtype(boot1Info.maintype, boot1Info.subtype);
  if (!boot1Data) {
    onLog?.('error', i18n.t('device.downloadBoot.boot1NotFound', { subtype: boot1Info.subtype }));
    return { success: false, message: i18n.t('device.downloadBoot.boot1NotFound', { subtype: boot1Info.subtype }) };
  }

  onLog?.('info', i18n.t('device.downloadBoot.boot1Size', { size: boot1Data.length }));
  onProgress?.(i18n.t('device.downloadBoot.transferringBoot1'), 30);

  checkCancelled?.();

  await ctx.fes.setTimeout(60);
  await ctx.fes.down(boot1Data, 0, 'boot1');
  await ctx.fes.setTimeout(1);

  onProgress?.(i18n.t('device.downloadBoot.verifyingBoot1'), 70);

  checkCancelled?.();

  const verifyResult = await ctx.fes.verifyStatus(FES_DATA_TYPE_VALUES.boot1);
  if (verifyResult.flag !== EFEX_CRC32_VALID_FLAG) {
    onLog?.('warn', i18n.t('device.downloadBoot.boot1VerifyStatus', { status: `0x${verifyResult.flag.toString(16)}` }));
  }

  onProgress?.(i18n.t('device.downloadBoot.boot1Complete'), 100);
  onLog?.('info', i18n.t('device.downloadBoot.boot1Complete'));

  return { success: true, size: boot1Data.length };
}

export async function downloadBoot0(
  ctx: EfexContext,
  dataProvider: BootDataProvider,
  options?: DeviceOpsOptions
): Promise<DownloadBootResult> {
  const { onProgress, onLog, checkCancelled } = options || {};

  onProgress?.(i18n.t('device.downloadBoot.downloadingBoot0'), 0);
  onLog?.('info', i18n.t('device.downloadBoot.startBoot0'));

  checkCancelled?.();

  const secureType = await ctx.fes.querySecure();
  onLog?.('info', i18n.t('device.downloadBoot.secureType', { type: secureType }));

  const storageType = await ctx.fes.queryStorage();
  onLog?.('info', i18n.t('device.downloadBoot.storageTypeLog', { type: storageType }));

  const boot0Info = getBoot0Subtype(secureType, storageType);
  if (!boot0Info) {
    onLog?.('error', i18n.t('device.downloadBoot.unsupportedStorageType', { type: storageType }));
    return { success: false, message: i18n.t('device.downloadBoot.unsupportedStorageType', { type: storageType }) };
  }

  onLog?.('info', i18n.t('device.downloadBoot.boot0Image', { maintype: boot0Info.maintype, subtype: boot0Info.subtype }));

  let boot0Data = dataProvider.getFileDataByMaintypeSubtype(boot0Info.maintype, boot0Info.subtype);

  if (!boot0Data) {
    onLog?.('error', i18n.t('device.downloadBoot.boot0NotFound', { subtype: boot0Info.subtype }));
    return { success: false, message: i18n.t('device.downloadBoot.boot0NotFound', { subtype: boot0Info.subtype }) };
  }

  onLog?.('info', i18n.t('device.downloadBoot.boot0Size', { size: boot0Data.length }));
  onProgress?.(i18n.t('device.downloadBoot.transferringBoot0'), 30);

  checkCancelled?.();

  await ctx.fes.setTimeout(60);
  await ctx.fes.down(boot0Data, 0, 'boot0');
  await ctx.fes.setTimeout(1);

  onProgress?.(i18n.t('device.downloadBoot.verifyingBoot0'), 70);

  checkCancelled?.();

  const verifyResult = await ctx.fes.verifyStatus(FES_DATA_TYPE_VALUES.boot0);
  if (verifyResult.flag !== EFEX_CRC32_VALID_FLAG) {
    onLog?.('warn', i18n.t('device.downloadBoot.boot0VerifyStatus', { status: `0x${verifyResult.flag.toString(16)}` }));
  }

  onProgress?.(i18n.t('device.downloadBoot.boot0Complete'), 100);
  onLog?.('info', i18n.t('device.downloadBoot.boot0Complete'));

  return { success: true, size: boot0Data.length };
}

export async function downloadBoot0Boot1(
  ctx: EfexContext,
  packer: OpenixPacker,
  options?: DeviceOpsOptions
): Promise<{ boot0Result: DownloadBootResult; boot1Result: DownloadBootResult }> {
  const { onProgress, onLog, checkCancelled } = options || {};

  onLog?.('info', i18n.t('device.downloadBoot.startBoot0Boot1'));

  checkCancelled?.();

  const storageType = await ctx.fes.queryStorage();

  const dataProvider: BootDataProvider = {
    getFileDataByMaintypeSubtype: (maintype, subtype) =>
      packer.getFileDataByMaintypeSubtype(maintype, subtype),
  };

  onProgress?.(i18n.t('device.downloadBoot.downloadBoot1'), 0);
  const boot1Result = await downloadBoot1(ctx, dataProvider, storageType, {
    onProgress: (stage, progress) => {
      if (progress !== undefined) {
        onProgress?.(stage, progress * 0.5);
      }
    },
    onLog,
    checkCancelled,
  });

  if (!boot1Result.success) {
    return { boot0Result: { success: false }, boot1Result };
  }

  checkCancelled?.();

  onProgress?.(i18n.t('device.downloadBoot.downloadBoot0'), 50);
  const boot0Result = await downloadBoot0(ctx, dataProvider, {
    onProgress: (stage, progress) => {
      if (progress !== undefined) {
        onProgress?.(stage, 50 + progress * 0.5);
      }
    },
    onLog,
    checkCancelled,
  });

  onProgress?.(i18n.t('device.downloadBoot.boot0Boot1Complete'), 100);

  return { boot0Result, boot1Result };
}
