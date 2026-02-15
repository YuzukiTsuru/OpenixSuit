import {
  EfexContext,
  EfexDevice,
  EfexError
} from '../../../Library/libEFEX';
import { getChipName } from '../../../Assets/ChipIdToChipName';
import { OpenixPacker } from '../../../Library/OpenixIMG';
import {
  FlashDevice,
  FlashProgress,
  FlashOptions,
  FlashController,
  LogEntry,
} from '../Types';
import { CallbackManager, FlashCallbacks } from './callbacks';
import { handleFelMode, handleFesMode } from './handlers';
import { ProgressManager, FULL_FLASH_STAGES } from './ProgressManager';

const MODE_DESCRIPTIONS: Record<FlashOptions['mode'], string> = {
  partition: '指定分区烧录',
  keep_data: '保留数据升级',
  partition_erase: '分区擦除升级',
  full_erase: '全盘擦除升级',
};

class CancelledError extends Error {
  constructor() {
    super('操作已取消');
    this.name = 'CancelledError';
  }
}

class FlashManager implements FlashController {
  private callbackManager: CallbackManager = new CallbackManager();
  private isFlashing: boolean = false;
  private cancelled: boolean = false;
  private context: EfexContext | null = null;
  private packer: OpenixPacker | null = null;
  private progressManager: ProgressManager | null = null;

  private checkCancelled(): void {
    if (this.cancelled) {
      throw new CancelledError();
    }
  }

  async scan(): Promise<FlashDevice[]> {
    this.emitLog({
      timestamp: new Date(),
      level: 'info',
      message: '正在扫描设备...',
    });

    try {
      const devices = await EfexContext.scanDevices();

      const flashDevices: FlashDevice[] = devices.map((d: EfexDevice) => ({
        id: `efex-${d.chip_version.toString(16)}`,
        name: getChipName(d.chip_version),
        mode: d.mode,
        modeStr: d.mode_str,
        chipVersion: d.chip_version,
      }));

      if (flashDevices.length === 0) {
        this.emitLog({
          timestamp: new Date(),
          level: 'warn',
          message: '未发现可烧录设备',
        });
      } else {
        this.emitLog({
          timestamp: new Date(),
          level: 'success',
          message: `发现 ${flashDevices.length} 个设备`,
        });
      }

      return flashDevices;
    } catch (error) {
      throw error;
    }
  }

  async start(device: FlashDevice, imagePath: string, options: FlashOptions): Promise<void> {
    if (this.isFlashing) {
      throw new Error('已有烧写任务正在进行');
    }

    this.isFlashing = true;
    this.cancelled = false;

    this.progressManager = new ProgressManager((progress) => this.emitProgress(progress));
    this.progressManager.defineStages(FULL_FLASH_STAGES);

    this.emitLog({
      timestamp: new Date(),
      level: 'info',
      message: `开始烧写: ${imagePath}`,
    });

    this.emitLog({
      timestamp: new Date(),
      level: 'info',
      message: `目标设备: ${device.name} (${device.modeStr})`,
    });

    this.emitLog({
      timestamp: new Date(),
      level: 'info',
      message: `烧写模式: ${MODE_DESCRIPTIONS[options.mode]}`,
    });

    try {
      await this.loadAndFlash(imagePath, options);
      this.emitLog({
        timestamp: new Date(),
        level: 'success',
        message: '烧写完成',
      });
      this.emitComplete(true);
    } catch (error) {
      if (error instanceof CancelledError) {
        this.emitLog({
          timestamp: new Date(),
          level: 'warn',
          message: '烧写已取消',
        });
        this.emitComplete(false);
      } else {
        this.handleError(error);
        this.emitComplete(false);
        throw error;
      }
    } finally {
      this.cleanup();
    }
  }

  private async loadAndFlash(imagePath: string, options: FlashOptions): Promise<void> {
    this.checkCancelled();

    const { readFile } = await import('@tauri-apps/plugin-fs');
    const fileData = await readFile(imagePath);
    const arrayBuffer = fileData.buffer;

    this.checkCancelled();

    this.progressManager!.startStage('load_image');
    this.progressManager!.updateStageProgress(50, '正在解析镜像文件...');

    this.packer = new OpenixPacker();
    const success = this.packer.loadImage(arrayBuffer);

    if (!success) {
      if (this.packer.isEncryptedImage()) {
        throw new Error('该镜像已加密，不支持烧录加密镜像');
      } else {
        throw new Error('无法加载镜像文件');
      }
    }

    this.emitLog({
      timestamp: new Date(),
      level: 'success',
      message: '镜像文件加载成功',
    });
    this.progressManager!.completeStage();

    this.checkCancelled();

    this.progressManager!.nextStage('open_device');
    this.progressManager!.updateStageProgress(50, '正在打开设备...');

    this.context = new EfexContext();
    await this.context.open();

    this.emitLog({
      timestamp: new Date(),
      level: 'success',
      message: '设备已打开',
    });

    await this.context.refreshMode();

    this.emitLog({
      timestamp: new Date(),
      level: 'info',
      message: `设备模式: ${this.context.modeStr}`,
    });
    this.progressManager!.completeStage();

    this.checkCancelled();

    const callbacks: FlashCallbacks = {
      onProgress: (p) => this.emitProgress(p),
      onLog: (l) => this.emitLog(l),
      onComplete: () => {},
      onRescan: () => this.emitRescan(),
      checkCancelled: () => this.checkCancelled(),
    };

    if (this.context.mode === 'fel') {
      this.progressManager!.nextStage('fel_prepare');
      const result = await handleFelMode(this.context, this.packer, options, callbacks, this.progressManager!);
      this.checkCancelled();
      if (!result.success) {
        throw new Error(result.message);
      }
      if (result.newContext) {
        this.context = result.newContext;
      }
      this.emitRescan();
      this.checkCancelled();
      await this.runFesMode(options, callbacks);
    } else if (this.context.mode === 'srv') {
      await this.runFesMode(options, callbacks);
    } else {
      throw new Error(`不支持的设备模式: ${this.context.modeStr}`);
    }
  }

  private async runFesMode(options: FlashOptions, callbacks: FlashCallbacks): Promise<void> {
    this.checkCancelled();
    this.progressManager!.nextStage('fes_flash');
    const result = await handleFesMode(this.context!, this.packer!, options, callbacks, this.progressManager!);
    this.checkCancelled();
    if (!result.success) {
      throw new Error(result.message);
    }
  }

  private handleError(error: unknown): void {
    const err = error instanceof EfexError ? error : EfexError.fromCode(-1, String(error));
    this.emitLog({
      timestamp: new Date(),
      level: 'error',
      message: `烧写失败: ${err.message}`,
    });
  }

  private cleanup(): void {
    if (this.context) {
      this.context.close().catch(() => {});
      this.context = null;
    }
    this.packer = null;
    this.progressManager = null;
    this.isFlashing = false;
    this.cancelled = false;
  }

  cancel(): void {
    if (!this.isFlashing) return;
    this.cancelled = true;
    this.emitLog({
      timestamp: new Date(),
      level: 'warn',
      message: '正在取消烧写...',
    });
  }

  onProgress(callback: (progress: FlashProgress) => void): () => void {
    return this.callbackManager.onProgress(callback);
  }

  onLog(callback: (log: LogEntry) => void): () => void {
    return this.callbackManager.onLog(callback);
  }

  onComplete(callback: (success: boolean) => void): () => void {
    return this.callbackManager.onComplete(callback);
  }

  onRescan(callback: () => void): () => void {
    return this.callbackManager.onRescan(callback);
  }

  getIsFlashing(): boolean {
    return this.isFlashing;
  }

  isCancelled(): boolean {
    return this.cancelled;
  }

  private emitProgress(progress: FlashProgress): void {
    this.callbackManager.emitProgress(progress);
  }

  private emitLog(log: LogEntry): void {
    this.callbackManager.emitLog(log);
  }

  private emitComplete(success: boolean): void {
    this.callbackManager.emitComplete(success);
  }

  private emitRescan(): void {
    this.callbackManager.emitRescan();
  }
}

export const flashManager = new FlashManager();
