import { EfexContext } from '../Library/libEFEX';
import {
  OpenixPacker,
  getDtb,
  getFes,
  getUboot,
  getSysConfigBin,
  getBoardConfig
} from '../Library/OpenixIMG';
import { initDRAM } from './InitDRAM';
import { downloadUboot } from './DownloadUboot';
import { DeviceOpsOptions } from './Interface';

export interface Fel2FesResult {
  success: boolean;
  message: string;
}

export async function fel2fes(
  ctx: EfexContext,
  packer: OpenixPacker,
  options?: DeviceOpsOptions
): Promise<Fel2FesResult> {
  const { onProgress, onLog } = options || {};

  onProgress?.('FEL模式: 准备中...', 0);
  onLog?.('info', '设备处于FEL模式, 需要先加载FES并初始化DRAM');

  const fesData = getFes(packer);
  if (!fesData) {
    onLog?.('error', '镜像文件中未找到FES程序');
    return {
      success: false,
      message: '镜像文件中未找到FES程序',
    };
  }

  onLog?.('info', `找到FES程序, 大小: ${fesData.length} bytes`);

  onProgress?.('FEL模式: 初始化DRAM...', 10);

  const dramResult = await initDRAM(ctx, fesData, {
    onProgress: (stage, progress) => {
      if (progress !== undefined) {
        const basePercent = 10;
        const rangePercent = 35;
        const currentPercent = basePercent + Math.floor((progress / 100) * rangePercent);
        onProgress?.(`FEL模式: ${stage}`, currentPercent);
      } else {
        onProgress?.(`FEL模式: ${stage}`, 10);
      }
    },
    onLog: (level, message) => {
      onLog?.(level, message);
    },
  });

  if (!dramResult.success) {
    onLog?.('error', 'DRAM初始化失败');
    return {
      success: false,
      message: 'DRAM初始化失败',
    };
  }

  onLog?.('info', 'DRAM初始化成功');

  onProgress?.('FEL模式: 准备下载U-Boot...', 50);

  const ubootData = getUboot(packer);
  if (!ubootData) {
    onLog?.('error', '镜像文件中未找到U-Boot程序');
    return {
      success: false,
      message: '镜像文件中未找到U-Boot程序',
    };
  }

  onLog?.('info', `找到U-Boot程序, 大小: ${ubootData.length} bytes`);

  const dtbData = getDtb(packer);
  if (!dtbData) {
    onLog?.('error', '镜像文件中未找到DTB, 请检查固件是否包含 DTB_CONFIG000000 程序');
    return {
      success: false,
      message: '镜像文件中未找到DTB程序',
    };
  }

  onLog?.('info', `找到DTB程序, 大小: ${dtbData.length} bytes`);

  const sysconfigData = getSysConfigBin(packer);
  if (!sysconfigData) {
    onLog?.('error', '镜像文件中未找到系统配置程序 SYS_CONFIG_BIN00');
    return {
      success: false,
      message: '镜像文件中未找到系统配置程序 SYS_CONFIG_BIN00',
    };
  }

  onLog?.('info', `找到系统配置程序, 大小: ${sysconfigData.length} bytes`);

  const boardConfigData = getBoardConfig(packer);
  if (!boardConfigData) {
    onLog?.('error', '镜像文件中未找到板级设备配置程序 BOARD_CONFIG_BIN');
    return {
      success: false,
      message: '镜像文件中未找到板级设备配置程序 BOARD_CONFIG_BIN',
    };
  }

  onLog?.('info', `找到板级设备配置程序, 大小: ${boardConfigData.length} bytes`);

  onProgress?.('FEL模式: 下载U-Boot...', 55);

  const ubootResult = await downloadUboot(ctx, ubootData, dtbData, sysconfigData, boardConfigData, {
    onProgress: (stage, progress) => {
      if (progress !== undefined) {
        const basePercent = 55;
        const rangePercent = 25;
        const currentPercent = basePercent + Math.floor((progress / 100) * rangePercent);
        onProgress?.(`FEL模式: ${stage}`, currentPercent);
      } else {
        onProgress?.(`FEL模式: ${stage}`, 55);
      }
    },
    onLog: (level, message) => {
      onLog?.(level, message);
    },
  });

  if (!ubootResult.success) {
    onLog?.('error', 'U-Boot下载失败');
    return {
      success: false,
      message: 'U-Boot下载失败',
    };
  }

  onLog?.('info', 'U-Boot下载成功, 设备将切换到FES模式');

  onProgress?.('FEL模式: 等待设备重新连接...', 80);

  await ctx.close();

  onLog?.('info', '等待设备重新枚举...');

  await sleep(2000);

  onProgress?.('FEL模式: 重新连接设备...', 85);

  let retries = 0;
  const maxRetries = 10;
  let newCtx: EfexContext | null = null;

  while (retries < maxRetries) {
    try {
      newCtx = new EfexContext();
      await newCtx.open();
      await newCtx.refreshMode();

      if (newCtx.mode === 'srv') {
        onLog?.('info', '设备已切换到FES模式');
        onProgress?.('FES模式: 设备已连接', 90);
        break;
      } else {
        onLog?.('warn', `设备模式仍为 ${newCtx.modeStr}, 等待重试...`);
        await newCtx.close();
        newCtx = null;
      }
    } catch (e) {
      onLog?.('info', `设备还未切换到FES模式 (${retries + 1}/${maxRetries}), 等待 1 秒后重试...`);
    }

    retries++;
    if (retries < maxRetries) {
      await sleep(1000);
    }
  }

  if (!newCtx || newCtx.mode !== 'srv') {
    return {
      success: false,
      message: '设备重新连接失败, 无法切换到FES模式',
    };
  }

  onProgress?.('FES模式: 准备烧录...', 95);

  return {
    success: true,
    message: '设备已成功切换到FES模式',
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
