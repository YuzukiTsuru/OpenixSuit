import { EfexContext, FES_DATA_TYPE_VALUES } from '../Library/libEFEX';
import { StorageType, BootFileMode, EFEX_CRC32_VALID_FLAG } from '../FlashConfig/Constants';
import { DeviceOpsOptions } from './Interface';
import { OpenixPacker } from '../Library/OpenixIMG';

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
  const { onProgress, onLog } = options || {};

  onProgress?.('正在下载 Boot1...', 0);
  onLog?.('info', '开始下载 Boot1...');

  const secureType = await ctx.fes.querySecure();
  onLog?.('info', `安全类型: ${secureType}`);

  const boot1Info = getBoot1Subtype(secureType, storageType);
  if (!boot1Info) {
    onLog?.('error', `不支持的安全类型: ${secureType}`);
    return { success: false, message: `不支持的启动模式: ${secureType}` };
  }

  onLog?.('info', `Boot1 镜像: ${boot1Info.maintype}/${boot1Info.subtype}`);

  const boot1Data = dataProvider.getFileDataByMaintypeSubtype(boot1Info.maintype, boot1Info.subtype);
  if (!boot1Data) {
    onLog?.('error', `未找到 Boot1 镜像: ${boot1Info.subtype}`);
    return { success: false, message: `未找到 Boot1 镜像: ${boot1Info.subtype}` };
  }

  onLog?.('info', `Boot1 大小: ${boot1Data.length} 字节`);
  onProgress?.('正在传输 Boot1...', 30);

  await ctx.fes.setTimeout(60);
  await ctx.fes.down(boot1Data, 0, 'boot1');
  await ctx.fes.setTimeout(1);

  onProgress?.('正在验证 Boot1...', 70);

  const verifyResult = await ctx.fes.verifyStatus(FES_DATA_TYPE_VALUES.boot1);
  if (verifyResult.flag !== EFEX_CRC32_VALID_FLAG) {
    onLog?.('warn', `Boot1 验证状态: 0x${verifyResult.flag.toString(16)}`);
  }

  onProgress?.('Boot1 下载完成', 100);
  onLog?.('info', 'Boot1 下载完成');

  return { success: true, size: boot1Data.length };
}

export async function downloadBoot0(
  ctx: EfexContext,
  dataProvider: BootDataProvider,
  options?: DeviceOpsOptions
): Promise<DownloadBootResult> {
  const { onProgress, onLog } = options || {};

  onProgress?.('正在下载 Boot0...', 0);
  onLog?.('info', '开始下载 Boot0...');

  const secureType = await ctx.fes.querySecure();
  onLog?.('info', `安全类型: ${secureType}`);

  const storageType = await ctx.fes.queryStorage();
  onLog?.('info', `存储类型: ${storageType}`);

  const boot0Info = getBoot0Subtype(secureType, storageType);
  if (!boot0Info) {
    onLog?.('error', `不支持的存储类型: ${storageType}`);
    return { success: false, message: `不支持的存储类型: ${storageType}` };
  }

  onLog?.('info', `Boot0 镜像: ${boot0Info.maintype}/${boot0Info.subtype}`);

  let boot0Data = dataProvider.getFileDataByMaintypeSubtype(boot0Info.maintype, boot0Info.subtype);

  if (!boot0Data) {
    onLog?.('error', `未找到 Boot0 镜像: ${boot0Info.subtype}`);
    return { success: false, message: `未找到 Boot0 镜像: ${boot0Info.subtype}` };
  }

  onLog?.('info', `Boot0 大小: ${boot0Data.length} 字节`);
  onProgress?.('正在传输 Boot0...', 30);

  await ctx.fes.setTimeout(60);
  await ctx.fes.down(boot0Data, 0, 'boot0');
  await ctx.fes.setTimeout(1);

  onProgress?.('正在验证 Boot0...', 70);

  const verifyResult = await ctx.fes.verifyStatus(FES_DATA_TYPE_VALUES.boot0);
  if (verifyResult.flag !== EFEX_CRC32_VALID_FLAG) {
    onLog?.('warn', `Boot0 验证状态: 0x${verifyResult.flag.toString(16)}`);
  }

  onProgress?.('Boot0 下载完成', 100);
  onLog?.('info', 'Boot0 下载完成');

  return { success: true, size: boot0Data.length };
}

export async function downloadBoot0Boot1(
  ctx: EfexContext,
  packer: OpenixPacker,
  options?: DeviceOpsOptions
): Promise<{ boot0Result: DownloadBootResult; boot1Result: DownloadBootResult }> {
  const { onProgress, onLog } = options || {};

  onLog?.('info', '开始下载 Boot0 和 Boot1...');

  const storageType = await ctx.fes.queryStorage();

  const dataProvider: BootDataProvider = {
    getFileDataByMaintypeSubtype: (maintype, subtype) =>
      packer.getFileDataByMaintypeSubtype(maintype, subtype),
  };

  onProgress?.('下载 Boot1', 0);
  const boot1Result = await downloadBoot1(ctx, dataProvider, storageType, {
    onProgress: (stage, progress) => {
      if (progress !== undefined) {
        onProgress?.(stage, progress * 0.5);
      }
    },
    onLog,
  });

  if (!boot1Result.success) {
    return { boot0Result: { success: false }, boot1Result };
  }

  onProgress?.('下载 Boot0', 50);
  const boot0Result = await downloadBoot0(ctx, dataProvider, {
    onProgress: (stage, progress) => {
      if (progress !== undefined) {
        onProgress?.(stage, 50 + progress * 0.5);
      }
    },
    onLog,
  });

  onProgress?.('Boot0/Boot1 下载完成', 100);

  return { boot0Result, boot1Result };
}
