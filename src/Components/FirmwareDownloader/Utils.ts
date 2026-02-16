import { LogLevel, FLASH_MODE_LABELS, LOG_LEVEL_DISPLAYS } from './Types';
import { FlashMode } from '../../Devices';
import { formatSize, formatSpeed, formatTime } from '../../Utils';

export { formatSpeed, formatSize, formatTime };

export function getModeLabel(mode: FlashMode): string {
  return FLASH_MODE_LABELS[mode];
}

export function getLogClassName(level: LogLevel): string {
  return `log-entry log-${level}`;
}

export function getLogLevelDisplay(level: LogLevel): string {
  return LOG_LEVEL_DISPLAYS[level];
}
