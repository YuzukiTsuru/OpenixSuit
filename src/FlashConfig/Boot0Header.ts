import { BootFileHead, DramParamInfo } from './types';
import { BOOT0_MAGIC } from './constants';
import {
  uint8ArrayToString,
  readUint32LE,
  writeUint32LE,
  readUint32Array,
  writeUint32Array,
  stringToUint8Array,
  writeUint8Array,
} from './utils';

const BOOT_FILE_HEAD_SIZE = 48;
const DRAM_PARAM_INFO_SIZE = 4 + 4 + 32 * 4;

export class Boot0Header {
  static parse(buffer: Uint8Array): BootFileHead {
    if (buffer.length < BOOT_FILE_HEAD_SIZE) {
      throw new Error(`Buffer too small for BOOT0 header: ${buffer.length} < ${BOOT_FILE_HEAD_SIZE}`);
    }

    const magic = uint8ArrayToString(buffer.slice(4, 12));
    if (magic !== BOOT0_MAGIC) {
      throw new Error(`Invalid BOOT0 magic: expected "${BOOT0_MAGIC}", got "${magic}"`);
    }

    return {
      jump_instruction: readUint32LE(buffer, 0),
      magic,
      check_sum: readUint32LE(buffer, 12),
      length: readUint32LE(buffer, 16),
      pub_head_size: readUint32LE(buffer, 20),
      pub_head_vsn: Array.from(buffer.slice(24, 28)),
      ret_addr: readUint32LE(buffer, 28),
      run_addr: readUint32LE(buffer, 32),
      boot_cpu: readUint32LE(buffer, 36),
      platform: uint8ArrayToString(buffer.slice(40, 48)),
    };
  }

  static serialize(header: BootFileHead): Uint8Array {
    const buffer = new Uint8Array(BOOT_FILE_HEAD_SIZE);

    writeUint32LE(buffer, 0, header.jump_instruction);
    writeUint8Array(buffer, 4, stringToUint8Array(header.magic, 8));
    writeUint32LE(buffer, 12, header.check_sum);
    writeUint32LE(buffer, 16, header.length);
    writeUint32LE(buffer, 20, header.pub_head_size);
    buffer.set(header.pub_head_vsn, 24);
    writeUint32LE(buffer, 28, header.ret_addr);
    writeUint32LE(buffer, 32, header.run_addr);
    writeUint32LE(buffer, 36, header.boot_cpu);
    writeUint8Array(buffer, 40, stringToUint8Array(header.platform, 8));

    return buffer;
  }

  static isValid(buffer: Uint8Array): boolean {
    if (buffer.length < BOOT_FILE_HEAD_SIZE) {
      return false;
    }
    const magic = uint8ArrayToString(buffer.slice(4, 12));
    return magic === BOOT0_MAGIC;
  }

  static getRunAddress(buffer: Uint8Array): number {
    return readUint32LE(buffer, 32);
  }

  static getRetAddress(buffer: Uint8Array): number {
    return readUint32LE(buffer, 28);
  }

  static getLength(buffer: Uint8Array): number {
    return readUint32LE(buffer, 16);
  }

  static toString(header: BootFileHead): string {
    return `BOOT0 Header:
  Jump Instruction: 0x${header.jump_instruction.toString(16).toUpperCase()}
  Magic: "${header.magic}"
  Checksum: 0x${header.check_sum.toString(16).toUpperCase()}
  Length: ${header.length} bytes
  Public Header Size: ${header.pub_head_size}
  Public Header Version: [${header.pub_head_vsn.join(', ')}]
  Return Address: 0x${header.ret_addr.toString(16).toUpperCase()}
  Run Address: 0x${header.run_addr.toString(16).toUpperCase()}
  Boot CPU: 0x${header.boot_cpu.toString(16).toUpperCase()}
  Platform: "${header.platform}"`;
  }
}

export class DramParamParser {
  static parse(buffer: Uint8Array): DramParamInfo {
    if (buffer.length < DRAM_PARAM_INFO_SIZE) {
      throw new Error(`Buffer too small for DRAM param: ${buffer.length} < ${DRAM_PARAM_INFO_SIZE}`);
    }

    return {
      dram_init_flag: readUint32LE(buffer, 0),
      dram_update_flag: readUint32LE(buffer, 4),
      dram_para: readUint32Array(buffer, 8, 32),
    };
  }

  static serialize(info: DramParamInfo): Uint8Array {
    const buffer = new Uint8Array(DRAM_PARAM_INFO_SIZE);

    writeUint32LE(buffer, 0, info.dram_init_flag);
    writeUint32LE(buffer, 4, info.dram_update_flag);
    writeUint32Array(buffer, 8, info.dram_para);

    return buffer;
  }

  static createEmpty(): DramParamInfo {
    return {
      dram_init_flag: 0,
      dram_update_flag: 0,
      dram_para: new Array(32).fill(0),
    };
  }

  static toString(info: DramParamInfo): string {
    let result = `DRAM Param Info:
  Init Flag: ${info.dram_init_flag}
  Update Flag: ${info.dram_update_flag}
  DRAM Params:`;

    for (let i = 0; i < 32; i++) {
      result += `\n    [${i.toString().padStart(2, ' ')}] 0x${info.dram_para[i].toString(16).toUpperCase().padStart(8, '0')}`;
    }

    return result;
  }
}
