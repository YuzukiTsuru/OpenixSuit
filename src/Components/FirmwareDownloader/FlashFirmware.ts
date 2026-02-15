import {
  EfexContext,
  EfexDevice,
  DeviceMode,
  EfexError
} from '../../Library/libEFEX';
import {
  SunxiSysConfigParser,
  UBootHeaderParser
} from '../../FlashConfig';
import { getChipName } from '../../Assets/ChipIdToChipName';
import { OpenixPacker, getMbr } from '../../Library/OpenixIMG';
import { fel2fes, downloadMbr } from '../../Devices';

export type FlashMode = 'partition' | 'keep_data' | 'partition_erase' | 'full_erase';

export interface FlashDevice {
  id: string;
  name: string;
  mode: DeviceMode;
  modeStr: string;
  chipVersion: number;
}

export interface FlashProgress {
  percent: number;
  stage: string;
  speed?: string;
  currentPartition?: string;
  totalSize?: number;
  writtenSize?: number;
}

export type LogLevel = 'info' | 'warn' | 'error' | 'success';

export interface LogEntry {
  timestamp: Date;
  level: LogLevel;
  message: string;
}

export interface FlashOptions {
  mode: FlashMode;
  partitions?: string[];
  reloadImage: boolean;
  autoFlash: boolean;
}

export interface FlashController {
  scan: () => Promise<FlashDevice[]>;
  start: (device: FlashDevice, imagePath: string, options: FlashOptions) => Promise<void>;
  cancel: () => void;
  onProgress: (callback: (progress: FlashProgress) => void) => () => void;
  onLog: (callback: (log: LogEntry) => void) => () => void;
  onComplete: (callback: (success: boolean) => void) => () => void;
  onRescan: (callback: () => void) => () => void;
}

class FlashManager implements FlashController {
  private progressCallbacks: Set<(progress: FlashProgress) => void> = new Set();
  private logCallbacks: Set<(log: LogEntry) => void> = new Set();
  private completeCallbacks: Set<(success: boolean) => void> = new Set();
  private rescanCallbacks: Set<() => void> = new Set();
  private isFlashing: boolean = false;
  private cancelled: boolean = false;
  private context: EfexContext | null = null;
  private packer: OpenixPacker | null = null;

  async scan(): Promise<FlashDevice[]> {
    try {
      this.emitLog({
        timestamp: new Date(),
        level: 'info',
        message: '正在扫描设备...',
      });

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
      const err = error instanceof EfexError ? error : EfexError.fromCode(-1, String(error));
      this.emitLog({
        timestamp: new Date(),
        level: 'error',
        message: `扫描设备失败: ${err.message}`,
      });
      return [];
    }
  }

  async start(device: FlashDevice, imagePath: string, options: FlashOptions): Promise<void> {
    if (this.isFlashing) {
      throw new Error('已有烧写任务正在进行');
    }

    this.isFlashing = true;
    this.cancelled = false;

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
      message: `烧写模式: ${this.getModeDescription(options.mode)}`,
    });

    this.emitProgress({ percent: 0, stage: '正在加载镜像文件...' });

    try {
      const { readFile } = await import('@tauri-apps/plugin-fs');
      const fileData = await readFile(imagePath);
      const arrayBuffer = fileData.buffer;

      this.emitProgress({ percent: 3, stage: '正在解析镜像文件...' });

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

      this.emitProgress({ percent: 5, stage: '正在打开设备...' });

      this.context = new EfexContext();
      await this.context.open();

      this.emitProgress({ percent: 5, stage: '设备已打开' });
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

      if (this.context.mode === 'fel') {
        await this.handleFelMode(options);
        this.emitRescan();
        await this.handleFesMode(options);
      } else if (this.context.mode === 'srv') {
        await this.handleFesMode(options);
      } else {
        throw new Error(`不支持的设备模式: ${this.context.modeStr}`);
      }

      this.emitLog({
        timestamp: new Date(),
        level: 'success',
        message: '烧写完成',
      });

      this.emitProgress({ percent: 100, stage: '烧写完成' });
      this.emitComplete(true);
    } catch (error) {
      if (this.cancelled) {
        this.emitLog({
          timestamp: new Date(),
          level: 'warn',
          message: '烧写已取消',
        });
      } else {
        const err = error instanceof EfexError ? error : EfexError.fromCode(-1, String(error));
        this.emitLog({
          timestamp: new Date(),
          level: 'error',
          message: `烧写失败: ${err.message}`,
        });
      }
      this.emitComplete(false);
      throw error;
    } finally {
      if (this.context) {
        try {
          await this.context.close();
        } catch (e) {
          // ignore close error
        }
        this.context = null;
      }
      this.packer = null;
      this.isFlashing = false;
    }
  }

  private async handleFelMode(_options: FlashOptions): Promise<void> {
    if (!this.packer) {
      throw new Error('镜像文件未加载');
    }

    const result = await fel2fes(this.context!, this.packer, {
      onProgress: (stage, progress) => {
        if (progress !== undefined) {
          this.emitProgress({ percent: progress, stage });
        }
      },
      onLog: (level, message) => {
        this.emitLog({
          timestamp: new Date(),
          level: level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'info',
          message,
        });
      },
    });

    if (!result.success) {
      throw new Error(result.message);
    }

    if (result.newContext) {
      this.context = result.newContext;
    }
  }

  private async handleFesMode(_options: FlashOptions): Promise<void> {
    this.emitProgress({ percent: 10, stage: 'FES模式: 查询存储器...' });

    const storageType = await this.context!.fes.queryStorage();
    this.emitLog({
      timestamp: new Date(),
      level: 'info',
      message: `存储器类型: ${SunxiSysConfigParser.getStorageTypeFromNum(storageType)}`,
    });

    const flashSize = await this.context!.fes.probeFlashSize();
    this.emitLog({
      timestamp: new Date(),
      level: 'info',
      message: `存储器大小: ${this.formatSize(flashSize * 512)}`,
    });

    const secure = await this.context!.fes.querySecure();
    this.emitLog({
      timestamp: new Date(),
      level: 'info',
      message: `启动模式: ${UBootHeaderParser.getSunxiBootFileModeString(secure)}`,
    });

    this.emitProgress({ percent: 30, stage: 'FES模式: 准备烧录 MBR...' });

    const mbrData = getMbr(this.packer!);
    if (!mbrData) {
      throw new Error('镜像文件中未找到 MBR 数据');
    }

    const mbrResult = await downloadMbr(this.context!, mbrData, {
      onProgress: (stage, progress) => {
        if (progress !== undefined) {
          this.emitProgress({ percent: 30 + progress * 0.2, stage });
        }
      },
      onLog: (level, message) => {
        this.emitLog({
          timestamp: new Date(),
          level: level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'info',
          message,
        });
      },
    });

    if (!mbrResult.success) {
      throw new Error('MBR 烧录验证失败');
    }

    this.emitLog({
      timestamp: new Date(),
      level: 'success',
      message: `MBR 烧录成功，共 ${mbrResult.mbrInfo.partCount} 个分区`,
    });

    throw new Error('FES模式烧录功能待实现');
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
    this.progressCallbacks.add(callback);
    return () => this.progressCallbacks.delete(callback);
  }

  onLog(callback: (log: LogEntry) => void): () => void {
    this.logCallbacks.add(callback);
    return () => this.logCallbacks.delete(callback);
  }

  onComplete(callback: (success: boolean) => void): () => void {
    this.completeCallbacks.add(callback);
    return () => this.completeCallbacks.delete(callback);
  }

  onRescan(callback: () => void): () => void {
    this.rescanCallbacks.add(callback);
    return () => this.rescanCallbacks.delete(callback);
  }

  getIsFlashing(): boolean {
    return this.isFlashing;
  }

  private emitProgress(progress: FlashProgress): void {
    this.progressCallbacks.forEach((cb) => cb(progress));
  }

  private emitLog(log: LogEntry): void {
    this.logCallbacks.forEach((cb) => cb(log));
  }

  private emitComplete(success: boolean): void {
    this.completeCallbacks.forEach((cb) => cb(success));
  }

  private emitRescan(): void {
    this.rescanCallbacks.forEach((cb) => cb());
  }

  private getModeDescription(mode: FlashMode): string {
    const modes: Record<FlashMode, string> = {
      partition: '指定分区烧录',
      keep_data: '保留数据升级',
      partition_erase: '分区擦除升级',
      full_erase: '全盘擦除升级',
    };
    return modes[mode];
  }

  private formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
}

export const flashManager = new FlashManager();

export function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond < 1024) return `${bytesPerSecond} B/s`;
  if (bytesPerSecond < 1024 * 1024) return `${(bytesPerSecond / 1024).toFixed(2)} KB/s`;
  if (bytesPerSecond < 1024 * 1024 * 1024) return `${(bytesPerSecond / (1024 * 1024)).toFixed(2)} MB/s`;
  return `${(bytesPerSecond / (1024 * 1024 * 1024)).toFixed(2)} GB/s`;
}

export function formatLogTime(date: Date): string {
  return date.toLocaleTimeString('zh-CN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}
