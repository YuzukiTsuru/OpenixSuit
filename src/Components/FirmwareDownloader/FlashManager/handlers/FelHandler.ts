import { EfexContext } from '../../../../Library/libEFEX';
import { OpenixPacker, getFes, getUboot, getDtb, getSysConfigBin, getBoardConfig } from '../../../../Library/OpenixIMG';
import { initDRAM } from '../../../../Devices/InitDRAM';
import { downloadUboot } from '../../../../Devices/DownloadUboot';
import { FlashOptions } from '../../Types';
import { FlashCallbacks } from '../callbacks';
import { ProgressManager, FEL_STAGES } from '../ProgressManager';

export interface FelHandlerResult {
  success: boolean;
  newContext?: EfexContext;
  message?: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function handleFelMode(
  context: EfexContext,
  packer: OpenixPacker,
  _options: FlashOptions,
  callbacks: FlashCallbacks,
  progressManager: ProgressManager
): Promise<FelHandlerResult> {
  progressManager.defineStages(FEL_STAGES);

  callbacks.checkCancelled();

  progressManager.startStage('prepare');
  callbacks.onLog({
    timestamp: new Date(),
    level: 'info',
    message: '设备处于FEL模式, 需要先加载FES并初始化DRAM',
  });

  const fesData = getFes(packer);
  if (!fesData) {
    callbacks.onLog({
      timestamp: new Date(),
      level: 'error',
      message: '镜像文件中未找到FES程序',
    });
    return { success: false, message: '镜像文件中未找到FES程序' };
  }

  callbacks.onLog({
    timestamp: new Date(),
    level: 'info',
    message: `找到FES程序, 大小: ${fesData.length} bytes`,
  });
  progressManager.completeStage();

  callbacks.checkCancelled();

  progressManager.nextStage('init_dram');
  const dramResult = await initDRAM(context, fesData, {
    onProgress: (stage: string, progress: number | undefined) => {
      if (progress !== undefined) {
        progressManager.updateStageProgress(progress, stage);
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

  if (!dramResult.success) {
    return { success: false, message: 'DRAM初始化失败' };
  }

  callbacks.onLog({
    timestamp: new Date(),
    level: 'success',
    message: 'DRAM初始化成功',
  });
  progressManager.completeStage();

  callbacks.checkCancelled();

  progressManager.nextStage('download_uboot');

  const ubootData = getUboot(packer);
  if (!ubootData) {
    callbacks.onLog({
      timestamp: new Date(),
      level: 'error',
      message: '镜像文件中未找到U-Boot程序',
    });
    return { success: false, message: '镜像文件中未找到U-Boot程序' };
  }
  callbacks.onLog({
    timestamp: new Date(),
    level: 'info',
    message: `找到U-Boot程序, 大小: ${ubootData.length} bytes`,
  });

  const dtbData = getDtb(packer);
  if (!dtbData) {
    callbacks.onLog({
      timestamp: new Date(),
      level: 'error',
      message: '镜像文件中未找到DTB, 请检查固件是否包含 DTB_CONFIG000000 程序',
    });
    return { success: false, message: '镜像文件中未找到DTB程序' };
  }
  callbacks.onLog({
    timestamp: new Date(),
    level: 'info',
    message: `找到DTB程序, 大小: ${dtbData.length} bytes`,
  });

  const sysconfigData = getSysConfigBin(packer);
  if (!sysconfigData) {
    callbacks.onLog({
      timestamp: new Date(),
      level: 'error',
      message: '镜像文件中未找到系统配置程序 SYS_CONFIG_BIN00',
    });
    return { success: false, message: '镜像文件中未找到系统配置程序 SYS_CONFIG_BIN00' };
  }
  callbacks.onLog({
    timestamp: new Date(),
    level: 'info',
    message: `找到系统配置程序, 大小: ${sysconfigData.length} bytes`,
  });

  const boardConfigData = getBoardConfig(packer);
  if (!boardConfigData) {
    callbacks.onLog({
      timestamp: new Date(),
      level: 'error',
      message: '镜像文件中未找到板级设备配置程序 BOARD_CONFIG_BIN',
    });
    return { success: false, message: '镜像文件中未找到板级设备配置程序 BOARD_CONFIG_BIN' };
  }
  callbacks.onLog({
    timestamp: new Date(),
    level: 'info',
    message: `找到板级设备配置程序, 大小: ${boardConfigData.length} bytes`,
  });

  const ubootResult = await downloadUboot(context, ubootData, dtbData, sysconfigData, boardConfigData, {
    onProgress: (stage: string, progress: number | undefined) => {
      if (progress !== undefined) {
        progressManager.updateStageProgress(progress, stage);
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

  if (!ubootResult.success) {
    return { success: false, message: 'U-Boot下载失败' };
  }

  callbacks.onLog({
    timestamp: new Date(),
    level: 'success',
    message: 'U-Boot下载成功, 设备将切换到FES模式',
  });
  progressManager.completeStage();

  callbacks.checkCancelled();

  progressManager.nextStage('reconnect');
  await context.close();
  callbacks.onLog({
    timestamp: new Date(),
    level: 'info',
    message: '等待设备重新枚举...',
  });

  await sleep(2000);

  let retries = 0;
  const maxRetries = 10;
  let newContext: EfexContext | null = null;

  while (retries < maxRetries) {
    callbacks.checkCancelled();

    try {
      newContext = new EfexContext();
      await newContext.open();
      await newContext.refreshMode();

      if (newContext.mode === 'srv') {
        callbacks.onLog({
          timestamp: new Date(),
          level: 'success',
          message: '设备已切换到FES模式',
        });
        break;
      } else {
        callbacks.onLog({
          timestamp: new Date(),
          level: 'warn',
          message: `设备模式仍为 ${newContext.modeStr}, 等待重试...`,
        });
        await newContext.close();
      }
    } catch (e) {
      callbacks.onLog({
        timestamp: new Date(),
        level: 'info',
        message: `设备还未切换到FES模式 (${retries + 1}/${maxRetries}), 等待 1 秒后重试...`,
      });
    }

    retries++;
    const progress = Math.floor((retries / maxRetries) * 100);
    progressManager.updateStageProgress(progress);

    if (retries < maxRetries) {
      await sleep(1000);
    }
  }

  if (!newContext || newContext.mode !== 'srv') {
    return { success: false, message: '设备重新连接失败, 无法切换到FES模式' };
  }

  progressManager.completeStage();

  progressManager.nextStage('ready');
  callbacks.onLog({
    timestamp: new Date(),
    level: 'info',
    message: '准备烧录...',
  });
  progressManager.completeStage();

  return { success: true, newContext };
}
