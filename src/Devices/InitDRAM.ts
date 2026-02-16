import { EfexContext, EFEX_ERROR_CODES, isEfexError } from '../Library/libEFEX';
import { Boot0Header, DramParamParser } from '../FlashConfig';
import { DeviceOpsOptions } from './Interface';

export interface InitDRAMResult {
  success: boolean;
  dramInitFlag: number;
  dramUpdateFlag: number;
  ret_addr: number;
}

const DRAM_INIT_CHECK_INTERVAL = 1000;
const DRAM_INIT_TIMEOUT = 60000;

export async function initDRAM(
  ctx: EfexContext,
  fexData: Uint8Array,
  options?: DeviceOpsOptions
): Promise<InitDRAMResult> {
  const { onProgress, onLog } = options || {};

  onProgress?.('正在下载 FES 程序', 0);

  const fexHead = Boot0Header.parse(fexData);
  onLog?.('info', `FEX magic: ${fexHead.magic}, run_addr: 0x${fexHead.run_addr.toString(16)}, ret_addr: 0x${fexHead.ret_addr.toString(16)}`);

  const dramParamInfo = DramParamParser.createEmpty();
  const dramBuffer = DramParamParser.serialize(dramParamInfo);

  onLog?.('info', `Clearing DRAM param area at 0x${fexHead.ret_addr.toString(16)}`);
  await ctx.fel.write(fexHead.ret_addr, dramBuffer);

  onLog?.('info', `Downloading ${fexData.length} bytes FEX to device...`);
  await ctx.fel.write(fexHead.run_addr, fexData);

  onLog?.('info', `Executing FEX at 0x${fexHead.run_addr.toString(16)}`);
  await ctx.fel.exec(fexHead.run_addr);

  onProgress?.('等待 DRAM 初始化', 50);

  const startTime = Date.now();
  let dramInfo = DramParamParser.createEmpty();
  let attempts = 0;

  while (Date.now() - startTime < DRAM_INIT_TIMEOUT) {
    attempts++;
    await sleep(DRAM_INIT_CHECK_INTERVAL);

    try {
      const dramResult = await ctx.fel.read(fexHead.ret_addr, 4 + 4 + 32 * 4);
      dramInfo = DramParamParser.parse(dramResult);

      onLog?.('info', `DRAM init check #${attempts}: init_flag=${dramInfo.dram_init_flag}, update_flag=${dramInfo.dram_update_flag}`);

      if (dramInfo.dram_init_flag !== 0) {
        break;
      }
    } catch (e) {
      if (isEfexError(e)) {
        if (e.code === EFEX_ERROR_CODES.USB_TRANSFER) {
          throw new Error('烧录失败, FEX 运行失败, 请检查固件与芯片是否匹配');
        }
        if (e.code === EFEX_ERROR_CODES.USB_DEVICE_NOT_FOUND) {
          throw new Error('烧录失败, FEX 运行失败, 找不到设备');
        }
      }
      onLog?.('warn', `DRAM init check #${attempts} failed: ${e}`);
    }

    const elapsed = Date.now() - startTime;
    const progress = 50 + Math.floor((elapsed / DRAM_INIT_TIMEOUT) * 45);
    onProgress?.(`等待 DRAM 初始化 (${Math.floor(elapsed / 1000)}s)`, progress);
  }

  const elapsed = Date.now() - startTime;
  onLog?.('info', `DRAM init completed after ${attempts} attempts, ${elapsed}ms`);

  if (dramInfo.dram_init_flag === 1) {
    onProgress?.('DRAM 初始化失败', 100);
    return {
      success: false,
      dramInitFlag: dramInfo.dram_init_flag,
      dramUpdateFlag: dramInfo.dram_update_flag,
      ret_addr: fexHead.ret_addr,
    };
  }

  onProgress?.('DRAM 初始化完成', 100);

  onLog?.('info', `DRAM Parameters:`);
  onLog?.('info', `  Init Flag: ${dramInfo.dram_init_flag}`);
  onLog?.('info', `  Update Flag: ${dramInfo.dram_update_flag}`);
  for (let i = 0; i < dramInfo.dram_para.length; i++) {
    onLog?.('info', `  Param[${i.toString().padStart(2, '0')}]: 0x${dramInfo.dram_para[i].toString(16).toUpperCase().padStart(8, '0')}`);
  }

  return {
    success: true,
    dramInitFlag: dramInfo.dram_init_flag,
    dramUpdateFlag: dramInfo.dram_update_flag,
    ret_addr: fexHead.ret_addr,
  };
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
