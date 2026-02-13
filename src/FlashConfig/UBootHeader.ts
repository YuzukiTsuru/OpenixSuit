import {
  UBootHead,
  UBootBaseHead,
  UBootDataHead,
  UBootNormalGpioCfg,
  UBootExtHead,
} from './types';

import { 
    WorkMode, 
    StorageType
 } from './constants';

import {
  uint8ArrayToString,
  readUint32LE,
  writeUint32LE,
  readUint16LE,
  readUint32Array,
  writeUint32Array,
  stringToUint8Array,
  writeUint8Array,
} from './utils';

function readInt32LE(buffer: Uint8Array, offset: number): number {
  const value = readUint32LE(buffer, offset);
  return value > 0x7FFFFFFF ? value - 0x100000000 : value;
}

const UBOOT_BASE_HEAD_SIZE = 44;
const UBOOT_GPIO_CFG_SIZE = 8;
const UBOOT_DATA_HEAD_SIZE = 32 * 4 + 4 + 4 + 4 + UBOOT_GPIO_CFG_SIZE * 2 + 4 + UBOOT_GPIO_CFG_SIZE * 2 + 4 + 4 + UBOOT_GPIO_CFG_SIZE * 32 + 256 + UBOOT_GPIO_CFG_SIZE * 32 + 256 + 1 + 1 + 1 + 1 + 4 + 4 + 4 + 4 + 4 * 1 + 2 + 2 + 2 + 1 + 1 + 4 * 2;
const UBOOT_EXT_HEAD_SIZE = 16;
const UBOOT_EXT_COUNT = 15;
const UBOOT_HASH_SIZE = 64;
const UBOOT_HEAD_SIZE = UBOOT_BASE_HEAD_SIZE + UBOOT_DATA_HEAD_SIZE + UBOOT_EXT_HEAD_SIZE * UBOOT_EXT_COUNT + UBOOT_HASH_SIZE;

export class UBootGpioCfg {
  static parse(buffer: Uint8Array, offset: number): UBootNormalGpioCfg {
    return {
      port: buffer[offset],
      port_num: buffer[offset + 1],
      mul_sel: buffer[offset + 2],
      pull: buffer[offset + 3],
      drv_level: buffer[offset + 4],
      data: buffer[offset + 5],
      reserved: [buffer[offset + 6], buffer[offset + 7]],
    };
  }

  static serialize(cfg: UBootNormalGpioCfg, buffer: Uint8Array, offset: number): void {
    buffer[offset] = cfg.port;
    buffer[offset + 1] = cfg.port_num;
    buffer[offset + 2] = cfg.mul_sel;
    buffer[offset + 3] = cfg.pull;
    buffer[offset + 4] = cfg.drv_level;
    buffer[offset + 5] = cfg.data;
    buffer[offset + 6] = cfg.reserved[0];
    buffer[offset + 7] = cfg.reserved[1];
  }

  static toString(cfg: UBootNormalGpioCfg): string {
    return `GPIO(P${String.fromCharCode(65 + cfg.port)}${cfg.port_num}, mul=${cfg.mul_sel}, pull=${cfg.pull}, drv=${cfg.drv_level}, data=${cfg.data})`;
  }
}

export class UBootBaseHeader {
  static parse(buffer: Uint8Array): UBootBaseHead {
    if (buffer.length < UBOOT_BASE_HEAD_SIZE) {
      throw new Error(`Buffer too small for U-Boot base header: ${buffer.length} < ${UBOOT_BASE_HEAD_SIZE}`);
    }

    const magic = uint8ArrayToString(buffer.slice(4, 12));
    if (magic.substring(0, 5) !== 'uboot') {
      throw new Error(`Invalid U-Boot magic: expected "uboot", got "${magic}"`);
    }

    return {
      jump_instruction: readUint32LE(buffer, 0),
      magic,
      check_sum: readUint32LE(buffer, 12),
      align_size: readUint32LE(buffer, 16),
      length: readUint32LE(buffer, 20),
      uboot_length: readUint32LE(buffer, 24),
      version: uint8ArrayToString(buffer.slice(28, 36)),
      platform: uint8ArrayToString(buffer.slice(36, 44)),
      run_addr: readUint32LE(buffer, 44),
    };
  }

  static serialize(header: UBootBaseHead): Uint8Array {
    const buffer = new Uint8Array(UBOOT_BASE_HEAD_SIZE + 4);

    writeUint32LE(buffer, 0, header.jump_instruction);
    writeUint8Array(buffer, 4, stringToUint8Array(header.magic, 8));
    writeUint32LE(buffer, 12, header.check_sum);
    writeUint32LE(buffer, 16, header.align_size);
    writeUint32LE(buffer, 20, header.length);
    writeUint32LE(buffer, 24, header.uboot_length);
    writeUint8Array(buffer, 28, stringToUint8Array(header.version, 8));
    writeUint8Array(buffer, 36, stringToUint8Array(header.platform, 8));
    writeUint32LE(buffer, 44, header.run_addr);

    return buffer.slice(0, UBOOT_BASE_HEAD_SIZE);
  }

  static getRunAddress(buffer: Uint8Array): number {
    return readUint32LE(buffer, 44);
  }

  static toString(header: UBootBaseHead): string {
    return `U-Boot Base Header:
  Jump Instruction: 0x${header.jump_instruction.toString(16).toUpperCase()}
  Magic: "${header.magic}"
  Checksum: 0x${header.check_sum.toString(16).toUpperCase()}
  Align Size: ${header.align_size}
  Length: ${header.length} bytes
  U-Boot Length: ${header.uboot_length} bytes
  Version: "${header.version}"
  Platform: "${header.platform}"
  Run Address: 0x${header.run_addr.toString(16).toUpperCase()}`;
  }
}

export class UBootDataHeader {
  static parse(buffer: Uint8Array, offset: number = 0): UBootDataHead {
    let pos = offset;

    const dram_para = readUint32Array(buffer, pos, 32);
    pos += 32 * 4;

    const run_clock = readInt32LE(buffer, pos);
    pos += 4;

    const run_core_vol = readInt32LE(buffer, pos);
    pos += 4;

    const uart_port = readInt32LE(buffer, pos);
    pos += 4;

    const uart_gpio: UBootNormalGpioCfg[] = [];
    for (let i = 0; i < 2; i++) {
      uart_gpio.push(UBootGpioCfg.parse(buffer, pos));
      pos += UBOOT_GPIO_CFG_SIZE;
    }

    const twi_port = readInt32LE(buffer, pos);
    pos += 4;

    const twi_gpio: UBootNormalGpioCfg[] = [];
    for (let i = 0; i < 2; i++) {
      twi_gpio.push(UBootGpioCfg.parse(buffer, pos));
      pos += UBOOT_GPIO_CFG_SIZE;
    }

    const work_mode = readUint32LE(buffer, pos);
    pos += 4;

    const storage_type = readUint32LE(buffer, pos);
    pos += 4;

    const nand_gpio: UBootNormalGpioCfg[] = [];
    for (let i = 0; i < 32; i++) {
      nand_gpio.push(UBootGpioCfg.parse(buffer, pos));
      pos += UBOOT_GPIO_CFG_SIZE;
    }

    const nand_spare_data = Array.from(buffer.slice(pos, pos + 256));
    pos += 256;

    const sdcard_gpio: UBootNormalGpioCfg[] = [];
    for (let i = 0; i < 32; i++) {
      sdcard_gpio.push(UBootGpioCfg.parse(buffer, pos));
      pos += UBOOT_GPIO_CFG_SIZE;
    }

    const sdcard_spare_data = Array.from(buffer.slice(pos, pos + 256));
    pos += 256;

    const secureos_exist = buffer[pos++];
    const monitor_exist = buffer[pos++];
    const func_mask = buffer[pos++];
    const uboot_backup = buffer[pos++];

    const uboot_start_sector_in_mmc = readUint32LE(buffer, pos);
    pos += 4;

    const dtb_offset = readInt32LE(buffer, pos);
    pos += 4;

    const boot_package_size = readInt32LE(buffer, pos);
    pos += 4;

    const dram_scan_size = readUint32LE(buffer, pos);
    pos += 4;

    const reserved = readUint32Array(buffer, pos, 1);
    pos += 4;

    const pmu_type = readUint16LE(buffer, pos);
    pos += 2;

    const uart_input = readUint16LE(buffer, pos);
    pos += 2;

    const key_input = readUint16LE(buffer, pos);
    pos += 2;

    const secure_mode = buffer[pos++];
    const debug_mode = buffer[pos++];

    const reserved2 = readUint32Array(buffer, pos, 2);

    return {
      dram_para,
      run_clock,
      run_core_vol,
      uart_port,
      uart_gpio,
      twi_port,
      twi_gpio,
      work_mode,
      storage_type,
      nand_gpio,
      nand_spare_data,
      sdcard_gpio,
      sdcard_spare_data,
      secureos_exist,
      monitor_exist,
      func_mask,
      uboot_backup,
      uboot_start_sector_in_mmc,
      dtb_offset,
      boot_package_size,
      dram_scan_size,
      reserved,
      pmu_type,
      uart_input,
      key_input,
      secure_mode,
      debug_mode,
      reserved2,
    };
  }

  static setWorkMode(buffer: Uint8Array, offset: number, mode: WorkMode): void {
    const workModeOffset = offset + 32 * 4 + 4 + 4 + 4 + UBOOT_GPIO_CFG_SIZE * 2 + 4 + UBOOT_GPIO_CFG_SIZE * 2;
    writeUint32LE(buffer, workModeOffset, mode);
  }

  static getWorkMode(buffer: Uint8Array, offset: number): number {
    const workModeOffset = offset + 32 * 4 + 4 + 4 + 4 + UBOOT_GPIO_CFG_SIZE * 2 + 4 + UBOOT_GPIO_CFG_SIZE * 2;
    return readUint32LE(buffer, workModeOffset);
  }

  static setStorageType(buffer: Uint8Array, offset: number, storageType: StorageType): void {
    const storageTypeOffset = offset + 32 * 4 + 4 + 4 + 4 + UBOOT_GPIO_CFG_SIZE * 2 + 4 + UBOOT_GPIO_CFG_SIZE * 2 + 4;
    writeUint32LE(buffer, storageTypeOffset, storageType);
  }

  static getStorageType(buffer: Uint8Array, offset: number): number {
    const storageTypeOffset = offset + 32 * 4 + 4 + 4 + 4 + UBOOT_GPIO_CFG_SIZE * 2 + 4 + UBOOT_GPIO_CFG_SIZE * 2 + 4;
    return readUint32LE(buffer, storageTypeOffset);
  }

  static toString(data: UBootDataHead): string {
    return `U-Boot Data Header:
  Run Clock: ${data.run_clock} MHz
  Run Core Voltage: ${data.run_core_vol} mV
  UART Port: ${data.uart_port}
  UART GPIO: [${data.uart_gpio.map(g => UBootGpioCfg.toString(g)).join(', ')}]
  TWI Port: ${data.twi_port}
  TWI GPIO: [${data.twi_gpio.map(g => UBootGpioCfg.toString(g)).join(', ')}]
  Work Mode: 0x${data.work_mode.toString(16).toUpperCase()} (${WorkMode[data.work_mode] || 'Unknown'})
  Storage Type: ${data.storage_type} (${StorageType[data.storage_type] || 'Unknown'})
  SecureOS Exist: ${data.secureos_exist}
  Monitor Exist: ${data.monitor_exist}
  Func Mask: 0x${data.func_mask.toString(16).toUpperCase()}
  U-Boot Backup: ${data.uboot_backup}
  U-Boot Start Sector in MMC: 0x${data.uboot_start_sector_in_mmc.toString(16).toUpperCase()}
  DTB Offset: 0x${data.dtb_offset.toString(16).toUpperCase()}
  Boot Package Size: ${data.boot_package_size}
  DRAM Scan Size: 0x${data.dram_scan_size.toString(16).toUpperCase()}
  PMU Type: ${data.pmu_type}
  UART Input: ${data.uart_input}
  Key Input: ${data.key_input}
  Secure Mode: ${data.secure_mode}
  Debug Mode: ${data.debug_mode}`;
  }
}

export class UBootExtHeader {
  static parse(buffer: Uint8Array, offset: number): UBootExtHead {
    return {
      data: readUint32Array(buffer, offset, 4),
    };
  }

  static serialize(ext: UBootExtHead, buffer: Uint8Array, offset: number): void {
    writeUint32Array(buffer, offset, ext.data);
  }
}

export class UBootHeaderParser {
  static parse(buffer: Uint8Array): UBootHead {
    if (buffer.length < UBOOT_HEAD_SIZE) {
      throw new Error(`Buffer too small for U-Boot header: ${buffer.length} < ${UBOOT_HEAD_SIZE}`);
    }

    const uboot_head = UBootBaseHeader.parse(buffer);

    const dataOffset = UBOOT_BASE_HEAD_SIZE;
    const uboot_data = UBootDataHeader.parse(buffer, dataOffset);

    const extOffset = dataOffset + UBOOT_DATA_HEAD_SIZE;
    const uboot_ext: UBootExtHead[] = [];
    for (let i = 0; i < UBOOT_EXT_COUNT; i++) {
      uboot_ext.push(UBootExtHeader.parse(buffer, extOffset + i * UBOOT_EXT_HEAD_SIZE));
    }

    const hashOffset = extOffset + UBOOT_EXT_HEAD_SIZE * UBOOT_EXT_COUNT;
    const hash = Array.from(buffer.slice(hashOffset, hashOffset + UBOOT_HASH_SIZE));

    return {
      uboot_head,
      uboot_data,
      uboot_ext,
      hash,
    };
  }

  static isValid(buffer: Uint8Array): boolean {
    if (buffer.length < UBOOT_BASE_HEAD_SIZE) {
      return false;
    }
    const magic = uint8ArrayToString(buffer.slice(4, 12));
    return magic.substring(0, 5) === 'uboot';
  }

  static getRunAddress(buffer: Uint8Array): number {
    return UBootBaseHeader.getRunAddress(buffer);
  }

  static setWorkMode(buffer: Uint8Array, mode: WorkMode): void {
    UBootDataHeader.setWorkMode(buffer, UBOOT_BASE_HEAD_SIZE, mode);
  }

  static getWorkMode(buffer: Uint8Array): number {
    return UBootDataHeader.getWorkMode(buffer, UBOOT_BASE_HEAD_SIZE);
  }

  static setStorageType(buffer: Uint8Array, storageType: StorageType): void {
    UBootDataHeader.setStorageType(buffer, UBOOT_BASE_HEAD_SIZE, storageType);
  }

  static getStorageType(buffer: Uint8Array): number {
    return UBootDataHeader.getStorageType(buffer, UBOOT_BASE_HEAD_SIZE);
  }

  static toString(header: UBootHead): string {
    return `${UBootBaseHeader.toString(header.uboot_head)}${UBootDataHeader.toString(header.uboot_data)}`;
  }
}
