import { EfexContext } from '../../../../Library/libEFEX';
import { SunxiSysConfigParser, UBootHeaderParser } from '../../../../FlashConfig';
import { OpenixPacker, getMbr } from '../../../../Library/OpenixIMG';
import { downloadMbr, downloadEraseFlag } from '../../../../Devices';
import { FlashOptions } from '../../Types';
import { FlashCallbacks } from '../callbacks';
import { formatSize } from '../../Utils';

export interface FesHandlerResult {
  success: boolean;
  message?: string;
}

async function downloadMbrData(
  context: EfexContext,
  packer: OpenixPacker,
  callbacks: FlashCallbacks
): Promise<{ success: boolean; message?: string; partCount?: number }> {
  callbacks.onProgress({ percent: 30, stage: 'FES模式: 准备烧录 MBR...' });

  const mbrData = getMbr(packer);
  if (!mbrData) {
    return { success: false, message: '镜像文件中未找到 MBR 数据' };
  }

  const mbrResult = await downloadMbr(context, mbrData, {
    onProgress: (stage: string, progress: number | undefined) => {
      if (progress !== undefined) {
        callbacks.onProgress({ percent: 30 + progress * 0.2, stage });
      }
    },
    onLog: (level: string, message: string) => {
      callbacks.onLog({
        timestamp: new Date(),
        level: level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'info',
        message,
      });
    },
  });

  if (!mbrResult.success) {
    return { success: false, message: 'MBR 烧录验证失败' };
  }

  return { success: true, partCount: mbrResult.mbrInfo.partCount };
}

export async function handleFesMode(
  context: EfexContext,
  packer: OpenixPacker,
  options: FlashOptions,
  callbacks: FlashCallbacks
): Promise<FesHandlerResult> {
  const secure = await context.fes.querySecure();
  callbacks.onLog({
    timestamp: new Date(),
    level: 'info',
    message: `启动模式: ${UBootHeaderParser.getSunxiBootFileModeString(secure)}`,
  });

  callbacks.onProgress({ percent: 20, stage: 'FES模式: 发送擦除标志...' });

  const eraseResult = await downloadEraseFlag(context, options.mode, {
    onProgress: (stage: string, progress: number | undefined) => {
      if (progress !== undefined) {
        callbacks.onProgress({ percent: 20 + progress * 0.1, stage });
      }
    },
    onLog: (level: string, message: string) => {
      callbacks.onLog({
        timestamp: new Date(),
        level: level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'info',
        message,
      });
    },
  });

  if (!eraseResult.success) {
    return { success: false, message: '擦除标志发送失败' };
  }

  callbacks.onLog({
    timestamp: new Date(),
    level: 'success',
    message: '擦除标志发送成功',
  });

  callbacks.onProgress({ percent: 10, stage: 'FES模式: 查询存储器...' });

  const storageType = await context.fes.queryStorage();
  callbacks.onLog({
    timestamp: new Date(),
    level: 'info',
    message: `存储器类型: ${SunxiSysConfigParser.getStorageTypeFromNum(storageType)}`,
  });

  const flashSize = await context.fes.probeFlashSize();
  callbacks.onLog({
    timestamp: new Date(),
    level: 'info',
    message: `存储器大小: ${formatSize(flashSize * 512)}`,
  });

  const needMbr = options.mode !== 'keep_data' && options.mode !== 'partition';

  if (needMbr) {
    const mbrResult = await downloadMbrData(context, packer, callbacks);
    if (!mbrResult.success) {
      return { success: false, message: mbrResult.message };
    }
    callbacks.onLog({
      timestamp: new Date(),
      level: 'success',
      message: `MBR 烧录成功，共 ${mbrResult.partCount} 个分区`,
    });
  } else {
    callbacks.onLog({
      timestamp: new Date(),
      level: 'info',
      message: '跳过 MBR 烧录（保留数据模式）',
    });
  }

  return { success: false, message: 'FES模式烧录功能待实现' };
}
