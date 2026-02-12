export type FlashMode = 'partition' | 'keep_data' | 'partition_erase' | 'full_erase';

export type DeviceType = 'usb' | 'serial';

export type DeviceStatus = 'ready' | 'busy' | 'error' | 'disconnected';

export interface FlashDevice {
  id: string;
  name: string;
  type: DeviceType;
  status: DeviceStatus;
  info?: {
    vendor?: string;
    product?: string;
    serial?: string;
  };
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
  start: (device: FlashDevice, imagePath: string, options: FlashOptions) => Promise<void>;
  cancel: () => void;
  onProgress: (callback: (progress: FlashProgress) => void) => () => void;
  onLog: (callback: (log: LogEntry) => void) => () => void;
  onComplete: (callback: (success: boolean) => void) => () => void;
}

class FlashManager implements FlashController {
  private progressCallbacks: Set<(progress: FlashProgress) => void> = new Set();
  private logCallbacks: Set<(log: LogEntry) => void> = new Set();
  private completeCallbacks: Set<(success: boolean) => void> = new Set();
  private isFlashing: boolean = false;
  private cancelled: boolean = false;

  async scanDevices(): Promise<FlashDevice[]> {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const devices = await invoke<FlashDevice[]>('scan_flash_devices');
      return devices;
    } catch (error) {
      this.emitLog({
        timestamp: new Date(),
        level: 'error',
        message: `扫描设备失败: ${error}`,
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
      message: `目标设备: ${device.name} (${device.id})`,
    });

    this.emitLog({
      timestamp: new Date(),
      level: 'info',
      message: `烧写模式: ${this.getModeDescription(options.mode)}`,
    });

    try {
      const { invoke } = await import('@tauri-apps/api/core');
      
      await invoke('start_flash', {
        deviceId: device.id,
        imagePath,
        options: {
          mode: options.mode,
          partitions: options.partitions || [],
          reload_image: options.reloadImage,
          auto_flash: options.autoFlash,
        },
      });

      this.emitLog({
        timestamp: new Date(),
        level: 'success',
        message: '烧写完成',
      });

      this.emitComplete(true);
    } catch (error) {
      if (this.cancelled) {
        this.emitLog({
          timestamp: new Date(),
          level: 'warn',
          message: '烧写已取消',
        });
      } else {
        this.emitLog({
          timestamp: new Date(),
          level: 'error',
          message: `烧写失败: ${error}`,
        });
      }
      this.emitComplete(false);
      throw error;
    } finally {
      this.isFlashing = false;
    }
  }

  cancel(): void {
    if (!this.isFlashing) return;

    this.cancelled = true;
    this.emitLog({
      timestamp: new Date(),
      level: 'warn',
      message: '正在取消烧写...',
    });

    import('@tauri-apps/api/core').then(({ invoke }) => {
      invoke('cancel_flash').catch((error) => {
        this.emitLog({
          timestamp: new Date(),
          level: 'error',
          message: `取消烧写失败: ${error}`,
        });
      });
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

  private getModeDescription(mode: FlashMode): string {
    const modes: Record<FlashMode, string> = {
      partition: '指定分区烧录',
      keep_data: '保留数据升级',
      partition_erase: '分区擦除升级',
      full_erase: '全盘擦除升级',
    };
    return modes[mode];
  }

  async setupEventListeners(): Promise<() => void> {
    const { listen } = await import('@tauri-apps/api/event');

    const unlistenProgress = await listen<FlashProgress>('flash-progress', (event) => {
      this.emitProgress(event.payload);
    });

    const unlistenLog = await listen<{ level: LogLevel; message: string }>('flash-log', (event) => {
      this.emitLog({
        timestamp: new Date(),
        level: event.payload.level,
        message: event.payload.message,
      });
    });

    return () => {
      unlistenProgress();
      unlistenLog();
    };
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
