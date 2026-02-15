import { DeviceMode } from '../../Library/libEFEX';
import { FlashMode } from '../../Devices';

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

export const READY_MODES: DeviceMode[] = ['fel', 'srv'];

export const FLASH_MODE_LABELS: Record<FlashMode, string> = {
  partition: '指定分区烧录',
  keep_data: '保留数据升级',
  partition_erase: '分区擦除升级',
  full_erase: '全盘擦除升级',
};

export const LOG_LEVEL_DISPLAYS: Record<LogLevel, string> = {
  info: 'INFO',
  warn: 'WARN',
  error: 'ERRO',
  success: 'OKAY',
};
