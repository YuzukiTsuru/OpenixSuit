export type DeviceMode = 'null' | 'fel' | 'srv' | 'update_cool' | 'update_hot' | 'unknown';

export type StorageType = 'nor' | 'nand' | 'sdcard' | 'emmc' | 'unknown';

export type PayloadArch = 'arm32' | 'aarch64' | 'riscv';

export interface EfexDevice {
  chip_version: number;
  mode: DeviceMode;
  mode_str: string;
}

export interface EfexErrorData {
  code: number;
  name: string;
  message: string;
}

export const EFEX_ERROR_CODES = {
  SUCCESS: 0,
  INVALID_PARAM: -1,
  NULL_PTR: -2,
  MEMORY: -3,
  NOT_SUPPORT: -4,
  USB_INIT: -10,
  USB_DEVICE_NOT_FOUND: -11,
  USB_OPEN: -12,
  USB_TRANSFER: -13,
  USB_TIMEOUT: -14,
  PROTOCOL: -20,
  INVALID_RESPONSE: -21,
  UNEXPECTED_STATUS: -22,
  INVALID_STATE: -30,
  INVALID_DEVICE_MODE: -31,
  OPERATION_FAILED: -32,
  DEVICE_BUSY: -33,
  DEVICE_NOT_READY: -34,
  FLASH_ACCESS: -40,
  FLASH_SIZE_PROBE: -41,
  FLASH_SET_ONOFF: -42,
  VERIFICATION: -50,
  CRC_MISMATCH: -51,
  FILE_OPEN: -60,
  FILE_READ: -61,
  FILE_WRITE: -62,
  FILE_SIZE: -63,
  NO_FREE_SLOT: -100,
  INVALID_HANDLE: -101,
  DEVICE_NOT_OPEN: -102,
} as const;

export type EfexErrorCode = typeof EFEX_ERROR_CODES[keyof typeof EFEX_ERROR_CODES];

export const STORAGE_TYPES: Record<number, StorageType> = {
  0: 'nor',
  1: 'nand',
  2: 'sdcard',
  3: 'emmc',
};

export const DEVICE_MODE_NAMES: Record<DeviceMode, string> = {
  null: 'NULL',
  fel: 'FEL',
  srv: 'SRV',
  update_cool: 'UPDATE_COOL',
  update_hot: 'UPDATE_HOT',
  unknown: 'UNKNOWN',
};
