import {
  UBootHead,
  UBootBaseHead,
  UBootDataHead,
  UBootNormalGpioCfg,
  UBootExtHead,
} from './Types';

import {
  WorkMode,
  StorageType
} from './Constants';

import {
  uint8ArrayToString,
  readUint32LE,
  writeUint32LE,
  readUint16LE,
  readUint32Array,
  writeUint32Array,
  stringToUint8Array,
  writeUint8Array,
} from './Utils';

function readInt32LE(buffer: Uint8Array, offset: number): number {
  const value = readUint32LE(buffer, offset);
  return value > 0x7FFFFFFF ? value - 0x100000000 : value;
}

interface FieldDef {
  name: string;
  size: number;
}

function computeOffsets(fields: FieldDef[]): Record<string, number> {
  const offsets: Record<string, number> = {};
  let offset = 0;
  for (const field of fields) {
    offsets[field.name] = offset;
    offset += field.size;
  }
  return offsets;
}

const UBOOT_GPIO_CFG_SIZE = 8;

const UBootBaseHeadFields: FieldDef[] = [
  { name: 'jump_instruction', size: 4 },
  { name: 'magic', size: 8 },
  { name: 'check_sum', size: 4 },
  { name: 'align_size', size: 4 },
  { name: 'length', size: 4 },
  { name: 'uboot_length', size: 4 },
  { name: 'version', size: 8 },
  { name: 'platform', size: 8 },
  { name: 'run_addr', size: 4 },
];

const UBootBaseHeadOffsets = computeOffsets(UBootBaseHeadFields) as {
  jump_instruction: number;
  magic: number;
  check_sum: number;
  align_size: number;
  length: number;
  uboot_length: number;
  version: number;
  platform: number;
  run_addr: number;
};

const UBOOT_BASE_HEAD_SIZE = UBootBaseHeadFields.reduce((sum, f) => sum + f.size, 0);

const UBootDataHeadFields: FieldDef[] = [
  { name: 'dram_para', size: 32 * 4 },
  { name: 'run_clock', size: 4 },
  { name: 'run_core_vol', size: 4 },
  { name: 'uart_port', size: 4 },
  { name: 'uart_gpio', size: UBOOT_GPIO_CFG_SIZE * 2 },
  { name: 'twi_port', size: 4 },
  { name: 'twi_gpio', size: UBOOT_GPIO_CFG_SIZE * 2 },
  { name: 'work_mode', size: 4 },
  { name: 'storage_type', size: 4 },
  { name: 'nand_gpio', size: UBOOT_GPIO_CFG_SIZE * 32 },
  { name: 'nand_spare_data', size: 256 },
  { name: 'sdcard_gpio', size: UBOOT_GPIO_CFG_SIZE * 32 },
  { name: 'sdcard_spare_data', size: 256 },
  { name: 'secureos_exist', size: 1 },
  { name: 'monitor_exist', size: 1 },
  { name: 'func_mask', size: 1 },
  { name: 'uboot_backup', size: 1 },
  { name: 'uboot_start_sector_in_mmc', size: 4 },
  { name: 'dtb_offset', size: 4 },
  { name: 'boot_package_size', size: 4 },
  { name: 'dram_scan_size', size: 4 },
  { name: 'reserved', size: 4 },
  { name: 'pmu_type', size: 2 },
  { name: 'uart_input', size: 2 },
  { name: 'key_input', size: 2 },
  { name: 'secure_mode', size: 1 },
  { name: 'debug_mode', size: 1 },
  { name: 'reserved2', size: 4 * 2 },
];

const UBootDataHeadOffsets = computeOffsets(UBootDataHeadFields) as {
  dram_para: number;
  run_clock: number;
  run_core_vol: number;
  uart_port: number;
  uart_gpio: number;
  twi_port: number;
  twi_gpio: number;
  work_mode: number;
  storage_type: number;
  nand_gpio: number;
  nand_spare_data: number;
  sdcard_gpio: number;
  sdcard_spare_data: number;
  secureos_exist: number;
  monitor_exist: number;
  func_mask: number;
  uboot_backup: number;
  uboot_start_sector_in_mmc: number;
  dtb_offset: number;
  boot_package_size: number;
  dram_scan_size: number;
  reserved: number;
  pmu_type: number;
  uart_input: number;
  key_input: number;
  secure_mode: number;
  debug_mode: number;
  reserved2: number;
};

const UBOOT_DATA_HEAD_SIZE = UBootDataHeadFields.reduce((sum, f) => sum + f.size, 0);

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

    const magic = uint8ArrayToString(buffer.slice(UBootBaseHeadOffsets.magic, UBootBaseHeadOffsets.magic + 8));
    if (magic.substring(0, 5) !== 'uboot') {
      throw new Error(`Invalid U-Boot magic: expected "uboot", got "${magic}"`);
    }

    return {
      jump_instruction: readUint32LE(buffer, UBootBaseHeadOffsets.jump_instruction),
      magic,
      check_sum: readUint32LE(buffer, UBootBaseHeadOffsets.check_sum),
      align_size: readUint32LE(buffer, UBootBaseHeadOffsets.align_size),
      length: readUint32LE(buffer, UBootBaseHeadOffsets.length),
      uboot_length: readUint32LE(buffer, UBootBaseHeadOffsets.uboot_length),
      version: uint8ArrayToString(buffer.slice(UBootBaseHeadOffsets.version, UBootBaseHeadOffsets.version + 8)),
      platform: uint8ArrayToString(buffer.slice(UBootBaseHeadOffsets.platform, UBootBaseHeadOffsets.platform + 8)),
      run_addr: readUint32LE(buffer, UBootBaseHeadOffsets.run_addr),
    };
  }

  static serialize(header: UBootBaseHead): Uint8Array {
    const buffer = new Uint8Array(UBOOT_BASE_HEAD_SIZE + 4);

    writeUint32LE(buffer, UBootBaseHeadOffsets.jump_instruction, header.jump_instruction);
    writeUint8Array(buffer, UBootBaseHeadOffsets.magic, stringToUint8Array(header.magic, 8));
    writeUint32LE(buffer, UBootBaseHeadOffsets.check_sum, header.check_sum);
    writeUint32LE(buffer, UBootBaseHeadOffsets.align_size, header.align_size);
    writeUint32LE(buffer, UBootBaseHeadOffsets.length, header.length);
    writeUint32LE(buffer, UBootBaseHeadOffsets.uboot_length, header.uboot_length);
    writeUint8Array(buffer, UBootBaseHeadOffsets.version, stringToUint8Array(header.version, 8));
    writeUint8Array(buffer, UBootBaseHeadOffsets.platform, stringToUint8Array(header.platform, 8));
    writeUint32LE(buffer, UBootBaseHeadOffsets.run_addr, header.run_addr);

    return buffer.slice(0, UBOOT_BASE_HEAD_SIZE);
  }

  static getRunAddress(buffer: Uint8Array): number {
    return readUint32LE(buffer, UBootBaseHeadOffsets.run_addr);
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
  static parse(buffer: Uint8Array, baseOffset: number = 0): UBootDataHead {
    const dram_para = readUint32Array(buffer, baseOffset + UBootDataHeadOffsets.dram_para, 32);
    const run_clock = readInt32LE(buffer, baseOffset + UBootDataHeadOffsets.run_clock);
    const run_core_vol = readInt32LE(buffer, baseOffset + UBootDataHeadOffsets.run_core_vol);
    const uart_port = readInt32LE(buffer, baseOffset + UBootDataHeadOffsets.uart_port);

    const uart_gpio: UBootNormalGpioCfg[] = [];
    for (let i = 0; i < 2; i++) {
      uart_gpio.push(UBootGpioCfg.parse(buffer, baseOffset + UBootDataHeadOffsets.uart_gpio + i * UBOOT_GPIO_CFG_SIZE));
    }

    const twi_port = readInt32LE(buffer, baseOffset + UBootDataHeadOffsets.twi_port);

    const twi_gpio: UBootNormalGpioCfg[] = [];
    for (let i = 0; i < 2; i++) {
      twi_gpio.push(UBootGpioCfg.parse(buffer, baseOffset + UBootDataHeadOffsets.twi_gpio + i * UBOOT_GPIO_CFG_SIZE));
    }

    const work_mode = readUint32LE(buffer, baseOffset + UBootDataHeadOffsets.work_mode);
    const storage_type = readUint32LE(buffer, baseOffset + UBootDataHeadOffsets.storage_type);

    const nand_gpio: UBootNormalGpioCfg[] = [];
    for (let i = 0; i < 32; i++) {
      nand_gpio.push(UBootGpioCfg.parse(buffer, baseOffset + UBootDataHeadOffsets.nand_gpio + i * UBOOT_GPIO_CFG_SIZE));
    }

    const nand_spare_data = Array.from(buffer.slice(baseOffset + UBootDataHeadOffsets.nand_spare_data, baseOffset + UBootDataHeadOffsets.nand_spare_data + 256));

    const sdcard_gpio: UBootNormalGpioCfg[] = [];
    for (let i = 0; i < 32; i++) {
      sdcard_gpio.push(UBootGpioCfg.parse(buffer, baseOffset + UBootDataHeadOffsets.sdcard_gpio + i * UBOOT_GPIO_CFG_SIZE));
    }

    const sdcard_spare_data = Array.from(buffer.slice(baseOffset + UBootDataHeadOffsets.sdcard_spare_data, baseOffset + UBootDataHeadOffsets.sdcard_spare_data + 256));

    const secureos_exist = buffer[baseOffset + UBootDataHeadOffsets.secureos_exist];
    const monitor_exist = buffer[baseOffset + UBootDataHeadOffsets.monitor_exist];
    const func_mask = buffer[baseOffset + UBootDataHeadOffsets.func_mask];
    const uboot_backup = buffer[baseOffset + UBootDataHeadOffsets.uboot_backup];
    const uboot_start_sector_in_mmc = readUint32LE(buffer, baseOffset + UBootDataHeadOffsets.uboot_start_sector_in_mmc);
    const dtb_offset = readInt32LE(buffer, baseOffset + UBootDataHeadOffsets.dtb_offset);
    const boot_package_size = readInt32LE(buffer, baseOffset + UBootDataHeadOffsets.boot_package_size);
    const dram_scan_size = readUint32LE(buffer, baseOffset + UBootDataHeadOffsets.dram_scan_size);
    const reserved = readUint32Array(buffer, baseOffset + UBootDataHeadOffsets.reserved, 1);
    const pmu_type = readUint16LE(buffer, baseOffset + UBootDataHeadOffsets.pmu_type);
    const uart_input = readUint16LE(buffer, baseOffset + UBootDataHeadOffsets.uart_input);
    const key_input = readUint16LE(buffer, baseOffset + UBootDataHeadOffsets.key_input);
    const secure_mode = buffer[baseOffset + UBootDataHeadOffsets.secure_mode];
    const debug_mode = buffer[baseOffset + UBootDataHeadOffsets.debug_mode];
    const reserved2 = readUint32Array(buffer, baseOffset + UBootDataHeadOffsets.reserved2, 2);

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

  static setWorkMode(buffer: Uint8Array, baseOffset: number, mode: WorkMode): void {
    writeUint32LE(buffer, baseOffset + UBootDataHeadOffsets.work_mode, mode);
  }

  static getWorkMode(buffer: Uint8Array, baseOffset: number): number {
    return readUint32LE(buffer, baseOffset + UBootDataHeadOffsets.work_mode);
  }

  static setStorageType(buffer: Uint8Array, baseOffset: number, storageType: StorageType): void {
    writeUint32LE(buffer, baseOffset + UBootDataHeadOffsets.storage_type, storageType);
  }

  static getStorageType(buffer: Uint8Array, baseOffset: number): number {
    return readUint32LE(buffer, baseOffset + UBootDataHeadOffsets.storage_type);
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
    const magic = uint8ArrayToString(buffer.slice(UBootBaseHeadOffsets.magic, UBootBaseHeadOffsets.magic + 8));
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

  static getSunxiBootFileModeString(type: number): string {
    switch (type) {
      case 0:
        return 'Normal Boot File';
      case 1:
        return 'TOC Boot File';
      case 2:
        return 'Reserved Boot File 0';
      case 3:
        return 'Reserved Boot File 1';
      case 4:
        return 'Boot Package File';
      default:
        return 'Unknown Boot File Type';
    }
  }

  static toString(header: UBootHead): string {
    return `${UBootBaseHeader.toString(header.uboot_head)}${UBootDataHeader.toString(header.uboot_data)}`;
  }
}
