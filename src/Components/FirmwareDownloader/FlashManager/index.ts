import {
  EfexContext,
  EfexDevice,
  EfexError
} from '../../../Library/libEFEX';
import { getChipName } from '../../../Utils/Chips';
import { OpenixPacker } from '../../../Library/OpenixIMG';
import {
  FlashDevice,
  FlashProgress,
  FlashOptions,
  FlashController,
  LogEntry,
} from '../Types';
import { CallbackManager, FlashCallbacks } from './Callbacks';
import { handleFelMode, handleFesMode } from './handlers';
import { ProgressManager, FULL_FLASH_STAGES } from './ProgressManager';
import { type PopupType } from '../../../CoreUI';
import { getErrorSolution } from '../ErrorHandler';
import i18n from '../../../i18n';

class CancelledError extends Error {
  constructor() {
    super(i18n.t('flashManager.cancelled'));
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
      message: i18n.t('flashManager.scanningDevices'),
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
          message: i18n.t('flashManager.noDevicesFound'),
        });
      } else {
        this.emitLog({
          timestamp: new Date(),
          level: 'success',
          message: i18n.t('flashManager.devicesFound', { count: flashDevices.length }),
        });
      }

      return flashDevices;
    } catch (error) {
      throw error;
    }
  }

  async start(device: FlashDevice, imagePath: string, options: FlashOptions): Promise<void> {
    if (this.isFlashing) {
      throw new Error(i18n.t('flashManager.alreadyFlashing'));
    }

    this.isFlashing = true;
    this.cancelled = false;

    this.progressManager = new ProgressManager((progress) => this.emitProgress(progress));
    this.progressManager.defineStages(FULL_FLASH_STAGES);

    this.emitLog({
      timestamp: new Date(),
      level: 'info',
      message: i18n.t('flashManager.startFlash', { path: imagePath }),
    });

    this.emitLog({
      timestamp: new Date(),
      level: 'info',
      message: i18n.t('flashManager.targetDevice', { name: device.name, mode: device.modeStr }),
    });

    this.emitLog({
      timestamp: new Date(),
      level: 'info',
      message: i18n.t('flashManager.flashMode', { mode: i18n.t(`flashMode.${options.mode}`) }),
    });

    try {
      await this.loadAndFlash(imagePath, options);
      this.emitLog({
        timestamp: new Date(),
        level: 'success',
        message: i18n.t('flashManager.flashComplete'),
      });
      this.emitComplete(true);
    } catch (error) {
      if (error instanceof CancelledError) {
        this.emitLog({
          timestamp: new Date(),
          level: 'warn',
          message: i18n.t('flashManager.flashCancelled'),
        });
        this.emitComplete(false);
      } else {
        this.handleError(error);
        this.emitComplete(false);
        throw error;
      }
    } finally {
      await this.cleanup();
    }
  }

  private async loadAndFlash(imagePath: string, options: FlashOptions): Promise<void> {
    this.checkCancelled();

    this.progressManager!.startStage('load_image');
    this.progressManager!.updateStageProgress(50, i18n.t('flashManager.parsingImage'));

    this.packer = new OpenixPacker();
    const success = await this.packer.loadImageFromPath(imagePath);

    if (!success) {
      if (this.packer.isEncryptedImage()) {
        throw new Error(i18n.t('flashManager.encryptedImage'));
      } else {
        throw new Error(i18n.t('flashManager.loadImageFailed'));
      }
    }

    this.emitLog({
      timestamp: new Date(),
      level: 'success',
      message: i18n.t('flashManager.imageLoaded'),
    });
    this.progressManager!.completeStage();

    this.checkCancelled();

    this.progressManager!.nextStage('open_device');
    this.progressManager!.updateStageProgress(50, i18n.t('flashManager.openingDevice'));

    this.context = new EfexContext();
    await this.context.open();

    this.emitLog({
      timestamp: new Date(),
      level: 'success',
      message: i18n.t('flashManager.deviceOpened'),
    });

    await this.context.refreshMode();

    this.emitLog({
      timestamp: new Date(),
      level: 'info',
      message: i18n.t('flashManager.deviceMode', { mode: this.context.modeStr }),
    });
    this.progressManager!.completeStage();

    this.checkCancelled();

    const callbacks: FlashCallbacks = {
      onProgress: (p) => this.emitProgress(p),
      onLog: (l) => this.emitLog(l),
      onComplete: () => {},
      onRescan: () => this.emitRescan(),
      checkCancelled: () => this.checkCancelled(),
      onShowPopup: (type, title, message) => this.emitShowPopup(type, title, message),
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
      this.checkCancelled();
      await this.runFesMode(options, callbacks);
    } else if (this.context.mode === 'srv') {
      await this.runFesMode(options, callbacks);
    } else {
      throw new Error(i18n.t('flashManager.unsupportedMode', { mode: this.context.modeStr }));
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
      message: i18n.t('flashManager.flashFailed', { error: err.message }),
    });

    const solution = getErrorSolution(error);
    if (solution) {
      this.emitShowPopup(solution.type, solution.title, solution.message);
    }
  }

  private async cleanup(): Promise<void> {
    if (this.context) {
      this.context.close().catch(() => {});
      this.context = null;
    }
    if (this.packer) {
      await this.packer.freeImage();
      this.packer = null;
    }
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
      message: i18n.t('flashManager.cancellingFlash'),
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

  onShowPopup(callback: (type: PopupType, title: string, message: string) => void): () => void {
    return this.callbackManager.onShowPopup(callback);
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

  private emitShowPopup(type: PopupType, title: string, message: string): void {
    this.callbackManager.emitShowPopup(type, title, message);
  }
}

export const flashManager = new FlashManager();
