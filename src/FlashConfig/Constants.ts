export const EFEX_CRC32_VALID_FLAG = 0x6a617603;

export const WORK_MODE_USB_PRODUCT = 0x10;

export const MBR_VERSION = 0x00000200;
export const MBR_MAGIC = 'softw411';
export const PART_NAME_MAX_LEN = 16;
export const PART_SIZE_RES_LEN = 68;
export const MBR_TAG_PARTITION_SIZE = 128;
export const MBR_MAX_PART_CNT = 120;
export const MBR_SIZE = 16 * 1024;
export const MBR_RESERVED = MBR_SIZE - 32 - (MBR_MAX_PART_CNT * MBR_TAG_PARTITION_SIZE);

export const BOOT0_MAGIC = 'eGON.BT0';
export const UBOOT_MAGIC = 'u-boot\x00\x00';

export const SUNXI_EFEX_MBR_TAG = 0;
export const SUNXI_EFEX_BOOT1_TAG = 1;
export const SUNXI_EFEX_BOOT0_TAG = 2;
export const SUNXI_EFEX_FULLIMG_SIZE_TAG = 3;
export const SUNXI_EFEX_ERASE_TAG = 4;

export enum FesDataType {
  MBR = 0,
  BOOT1 = 1,
  BOOT0 = 2,
  FULLIMG_SIZE = 3,
  ERASE = 4,
}

export enum WorkMode {
  NORMAL = 0,
  USB_PRODUCT = 0x10,
  USB_BURN = 0x11,
  CARD_BURN = 0x12,
}

export enum StorageType {
  NAND = 0,
  SDCARD = 1,
  EMMC = 2,
  SPINOR = 3,
  EMMC3 = 4,
  SPINAND = 5,
  SD1 = 6,
  EMMC0 = 7,
  UFS = 8,
  AUTO = -1,
}

export enum BootFileMode {
  NORMAL = 0,
  TOC = 1,
  RESERVED0 = 2,
  RESERVED1 = 3,
  PKG = 4,
}

export enum ToolMode {
  NORMAL = 0x1,
  REBOOT = 0x2,
  POWEROFF = 0x3,
  REUPDATE = 0x4,
  BOOT = 0x5,
}

export enum UBootFuncMask {
  NONE = 0,
  SECUREOS = 1 << 0,
  MONITOR = 1 << 1,
  DEBUG = 1 << 2,
}

export const DEFAULT_BUFFER_SIZE = 4096;
export const DEFAULT_ADDRESS = 0x40000000;
