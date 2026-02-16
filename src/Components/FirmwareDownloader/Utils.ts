import { LogLevel, FLASH_MODE_LABELS, LOG_LEVEL_DISPLAYS } from './Types';
import { FlashMode } from '../../Devices';
import { formatSize, formatSpeed, formatTime } from '../../Utils';
import i18n from '../../i18n';

export { formatSpeed, formatSize, formatTime };

export function getModeLabel(mode: FlashMode): string {
  const key = FLASH_MODE_LABELS[mode];
  return i18n.t(key);
}

export function getLogClassName(level: LogLevel): string {
  return `log-entry log-${level}`;
}

export function getLogLevelDisplay(level: LogLevel): string {
  return LOG_LEVEL_DISPLAYS[level];
}
