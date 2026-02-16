export type DeviceMode = 'null' | 'fel' | 'srv' | 'update_cool' | 'update_hot' | 'unknown';

export type StorageType = 'nor' | 'nand' | 'sdcard' | 'emmc' | 'unknown';

export type PayloadArch = 'arm32' | 'aarch64' | 'riscv';

export type UsbBackend = 'libusb' | 'winusb';

export type FesDataType =
  | 'none'
  | 'dram'
  | 'mbr'
  | 'boot1'
  | 'boot0'
  | 'erase'
  | 'full_img_size'
  | 'ext4_ubifs'
  | 'flash';

export type FesToolMode = 'normal' | 'reboot' | 'poweroff' | 'reupdate' | 'boot';

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

export interface FesVerifyResp {
  flag: number;
  fes_crc: number;
  media_crc: number;
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
  TIMEOUT: -110,
} as const;

export type EfexErrorCode = typeof EFEX_ERROR_CODES[keyof typeof EFEX_ERROR_CODES];

export const DEVICE_MODE_NAMES: Record<DeviceMode, string> = {
  null: 'NULL',
  fel: 'FEL',
  srv: 'SRV',
  update_cool: 'UPDATE_COOL',
  update_hot: 'UPDATE_HOT',
  unknown: 'UNKNOWN',
};

export const FES_DATA_TYPE_VALUES: Record<FesDataType, number> = {
  none: 0x0,
  dram: 0x7f00,
  mbr: 0x7f01,
  boot1: 0x7f02,
  boot0: 0x7f03,
  erase: 0x7f04,
  full_img_size: 0x7f10,
  ext4_ubifs: 0x7ff0,
  flash: 0x8000,
};

export const FES_TOOL_MODE_VALUES: Record<FesToolMode, number> = {
  normal: 0x1,
  reboot: 0x2,
  poweroff: 0x3,
  reupdate: 0x4,
  boot: 0x5,
};
