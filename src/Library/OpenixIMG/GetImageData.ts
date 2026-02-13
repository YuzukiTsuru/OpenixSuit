import { OpenixPacker } from './OpenixPacker';

export interface ImageDataEntry {
  name: string;
  maintype: string;
  subtype: string;
  description: string;
}

export const ImageDataTable: ImageDataEntry[] = [
  {
    name: 'fes',
    maintype: 'FES     ',
    subtype: 'FES_1-0000000000',
    description: 'DDR初始化BIN',
  },
  {
    name: 'uboot',
    maintype: '12345678',
    subtype: 'UBOOT_0000000000',
    description: '烧录使用的U-Boot',
  },
  {
    name: 'uboot_crash',
    maintype: '12345678',
    subtype: 'UBOOT_CRASH_0000',
    description: '崩溃转储使用的U-Boot',
  },
  {
    name: 'mbr',
    maintype: '1234567890',
    subtype: '1234567890___MBR',
    description: 'MBR分区表',
  },
  {
    name: 'gpt',
    maintype: '1234567890',
    subtype: '1234567890___GPT',
    description: 'GPT分区表',
  },
  {
    name: 'sys_config',
    maintype: 'COMMON  ',
    subtype: 'SYS_CONFIG100000',
    description: 'SYS CONFIG配置文件',
  },
  {
    name: 'sys_config_bin',
    maintype: 'COMMON  ',
    subtype: 'SYS_CONFIG_BIN00',
    description: 'SYS CONFIG配置二进制',
  },
  {
    name: 'sys_partition',
    maintype: 'COMMON  ',
    subtype: 'SYS_CONFIG000000',
    description: '分区表',
  },
  {
    name: 'board_config',
    maintype: 'BOARD   ',
    subtype: 'BOARD_CONFIG_BIN',
    description: '板级配置文件二进制格式',
  },
  {
    name: 'dtb',
    maintype: 'DTB     ',
    subtype: 'DTB_CONFIG000000',
    description: '独立内核设备树',
  },
  {
    name: 'boot0_card',
    maintype: '1234567890',
    subtype: '1234567890BOOT_0',
    description: '卡启动BOOT0',
  },
  {
    name: 'boot0_nor',
    maintype: '1234567890',
    subtype: '1234567890BNOR_0',
    description: 'SPI NOR启动BOOT0',
  },
  {
    name: 'bootpkg',
    maintype: 'BOOTPKG ',
    subtype: 'BOOTPKG-00000000',
    description: '常规介质BOOTPACKAGE',
  },
  {
    name: 'bootpkg_nor',
    maintype: 'BOOTPKG ',
    subtype: 'BOOTPKG-NOR00000',
    description: 'SPI NOR启动BOOTPACKAGE',
  },
  {
    name: 'pc_plugin',
    maintype: 'XXXXXXXX',
    subtype: 'XXXXXXXXXXXXXXXX',
    description: 'PC烧录插件',
  },
  {
    name: 'card_plugin',
    maintype: '1234567890',
    subtype: '1234567890CARDTL',
    description: '卡烧录插件',
  },
  {
    name: 'card_script',
    maintype: '1234567890',
    subtype: '1234567890SCRIPT',
    description: '卡量产配置文件',
  },
];

const imageEntryMap = new Map(ImageDataTable.map(entry => [entry.name, entry]));
const subtypeToDescriptionMap = new Map(ImageDataTable.map(entry => [entry.subtype, entry.description]));

export function getFunctionBySubtype(subtype: string): string | null {
  return subtypeToDescriptionMap.get(subtype) || null;
}

export function getImageDataByName(packer: OpenixPacker, name: string): Uint8Array | null {
  const entry = imageEntryMap.get(name);
  if (!entry) {
    return null;
  }
  return packer.getFileDataByMaintypeSubtype(entry.maintype, entry.subtype);
}

export function getImageDataEntry(name: string): ImageDataEntry | undefined {
  return imageEntryMap.get(name);
}

export function hasImageData(packer: OpenixPacker, name: string): boolean {
  const entry = imageEntryMap.get(name);
  if (!entry) {
    return false;
  }
  const data = packer.getFileDataByMaintypeSubtype(entry.maintype, entry.subtype);
  return data !== null;
}

export function getFes(packer: OpenixPacker): Uint8Array | null {
  return getImageDataByName(packer, 'fes');
}

export function getUboot(packer: OpenixPacker): Uint8Array | null {
  return getImageDataByName(packer, 'uboot');
}

export function getUbootCrash(packer: OpenixPacker): Uint8Array | null {
  return getImageDataByName(packer, 'uboot_crash');
}

export function getMbr(packer: OpenixPacker): Uint8Array | null {
  return getImageDataByName(packer, 'mbr');
}

export function getGpt(packer: OpenixPacker): Uint8Array | null {
  return getImageDataByName(packer, 'gpt');
}

export function getSysConfig(packer: OpenixPacker): Uint8Array | null {
  return getImageDataByName(packer, 'sys_config');
}

export function getSysConfigBin(packer: OpenixPacker): Uint8Array | null {
  return getImageDataByName(packer, 'sys_config_bin');
}

export function getBoardConfig(packer: OpenixPacker): Uint8Array | null {
  return getImageDataByName(packer, 'board_config');
}

export function getDtb(packer: OpenixPacker): Uint8Array | null {
  return getImageDataByName(packer, 'dtb');
}

export function getBoot0Card(packer: OpenixPacker): Uint8Array | null {
  return getImageDataByName(packer, 'boot0_card');
}

export function getBoot0Nor(packer: OpenixPacker): Uint8Array | null {
  return getImageDataByName(packer, 'boot0_nor');
}

export function getBootpkg(packer: OpenixPacker): Uint8Array | null {
  return getImageDataByName(packer, 'bootpkg');
}

export function getBootpkgNor(packer: OpenixPacker): Uint8Array | null {
  return getImageDataByName(packer, 'bootpkg_nor');
}

export function getPartitionData(packer: OpenixPacker): Uint8Array | null {
  return packer.getFileDataByFilename('sys_partition.bin')
    || packer.getFileDataByFilename('sys_partition.fex');
}
