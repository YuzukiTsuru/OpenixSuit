import { SunxiPartition, SunxiMbr, PartitionInfo, MbrInfo } from './Types';
import {
  MBR_MAGIC,
  MBR_MAX_PART_CNT,
  MBR_SIZE,
  PART_NAME_MAX_LEN,
  PART_SIZE_RES_LEN,
} from './Constants';
import {
  uint8ArrayToString,
  readUint32LE,
  writeUint32LE,
  stringToUint8Array,
  combineHiLo,
  formatHex,
  formatSize,
} from '../Utils';

const SUNXI_PARTITION_SIZE = 4 + 4 + 4 + 4 + PART_NAME_MAX_LEN + PART_NAME_MAX_LEN + 4 + 4 + 4 + PART_SIZE_RES_LEN;
const SUNXI_MBR_SIZE = MBR_SIZE;

export class SunxiPartitionParser {
  static parse(buffer: Uint8Array, offset: number): SunxiPartition {
    let pos = offset;

    const addrhi = readUint32LE(buffer, pos);
    pos += 4;

    const addrlo = readUint32LE(buffer, pos);
    pos += 4;

    const lenhi = readUint32LE(buffer, pos);
    pos += 4;

    const lenlo = readUint32LE(buffer, pos);
    pos += 4;

    const classname = uint8ArrayToString(buffer.slice(pos, pos + PART_NAME_MAX_LEN));
    pos += PART_NAME_MAX_LEN;

    const name = uint8ArrayToString(buffer.slice(pos, pos + PART_NAME_MAX_LEN));
    pos += PART_NAME_MAX_LEN;

    const user_type = readUint32LE(buffer, pos);
    pos += 4;

    const keydata = readUint32LE(buffer, pos);
    pos += 4;

    const ro = readUint32LE(buffer, pos);
    pos += 4;

    const res = Array.from(buffer.slice(pos, pos + PART_SIZE_RES_LEN));

    return {
      addrhi,
      addrlo,
      lenhi,
      lenlo,
      classname,
      name,
      user_type,
      keydata,
      ro,
      res,
    };
  }

  static serialize(partition: SunxiPartition, buffer: Uint8Array, offset: number): void {
    let pos = offset;

    writeUint32LE(buffer, pos, partition.addrhi);
    pos += 4;

    writeUint32LE(buffer, pos, partition.addrlo);
    pos += 4;

    writeUint32LE(buffer, pos, partition.lenhi);
    pos += 4;

    writeUint32LE(buffer, pos, partition.lenlo);
    pos += 4;

    buffer.set(stringToUint8Array(partition.classname, PART_NAME_MAX_LEN), pos);
    pos += PART_NAME_MAX_LEN;

    buffer.set(stringToUint8Array(partition.name, PART_NAME_MAX_LEN), pos);
    pos += PART_NAME_MAX_LEN;

    writeUint32LE(buffer, pos, partition.user_type);
    pos += 4;

    writeUint32LE(buffer, pos, partition.keydata);
    pos += 4;

    writeUint32LE(buffer, pos, partition.ro);
    pos += 4;

    buffer.set(new Uint8Array(partition.res), pos);
  }

  static toPartitionInfo(partition: SunxiPartition): PartitionInfo {
    return {
      name: partition.name,
      classname: partition.classname,
      address: combineHiLo(partition.addrhi, partition.addrlo),
      length: combineHiLo(partition.lenhi, partition.lenlo),
      user_type: partition.user_type,
      keydata: partition.keydata,
      readonly: partition.ro !== 0,
    };
  }

  static toString(partition: SunxiPartition): string {
    const info = SunxiPartitionParser.toPartitionInfo(partition);
    return `Partition "${partition.name}":
    Classname: "${partition.classname}"
    Address: ${formatHex(info.address, 16)}
    Length: ${formatSize(info.length)} (${formatHex(info.length, 16)})
    User Type: ${formatHex(partition.user_type)}
    Key Data: ${partition.keydata}
    Read-Only: ${info.readonly}`;
  }
}

export class SunxiMbrParser {
  static parse(buffer: Uint8Array): SunxiMbr {
    if (buffer.length < SUNXI_MBR_SIZE) {
      throw new Error(`Buffer too small for MBR: ${buffer.length} < ${SUNXI_MBR_SIZE}`);
    }

    let pos = 0;

    const crc32 = readUint32LE(buffer, pos);
    pos += 4;

    const version = readUint32LE(buffer, pos);
    pos += 4;

    const magic = uint8ArrayToString(buffer.slice(pos, pos + 8));
    pos += 8;

    if (magic !== MBR_MAGIC) {
      throw new Error(`Invalid MBR magic: expected "${MBR_MAGIC}", got "${magic}"`);
    }

    const copy = readUint32LE(buffer, pos);
    pos += 4;

    const index = readUint32LE(buffer, pos);
    pos += 4;

    const PartCount = readUint32LE(buffer, pos);
    pos += 4;

    const stamp = [readUint32LE(buffer, pos)];
    pos += 4;

    const array: SunxiPartition[] = [];
    for (let i = 0; i < MBR_MAX_PART_CNT; i++) {
      array.push(SunxiPartitionParser.parse(buffer, pos));
      pos += SUNXI_PARTITION_SIZE;
    }

    const res = Array.from(buffer.slice(pos, SUNXI_MBR_SIZE));

    return {
      crc32,
      version,
      magic,
      copy,
      index,
      PartCount,
      stamp,
      array,
      res,
    };
  }

  static serialize(mbr: SunxiMbr): Uint8Array {
    const buffer = new Uint8Array(SUNXI_MBR_SIZE);
    let pos = 0;

    writeUint32LE(buffer, pos, mbr.crc32);
    pos += 4;

    writeUint32LE(buffer, pos, mbr.version);
    pos += 4;

    buffer.set(stringToUint8Array(mbr.magic, 8), pos);
    pos += 8;

    writeUint32LE(buffer, pos, mbr.copy);
    pos += 4;

    writeUint32LE(buffer, pos, mbr.index);
    pos += 4;

    writeUint32LE(buffer, pos, mbr.PartCount);
    pos += 4;

    writeUint32LE(buffer, pos, mbr.stamp[0]);
    pos += 4;

    for (let i = 0; i < MBR_MAX_PART_CNT; i++) {
      SunxiPartitionParser.serialize(mbr.array[i], buffer, pos);
      pos += SUNXI_PARTITION_SIZE;
    }

    buffer.set(new Uint8Array(mbr.res), pos);

    return buffer;
  }

  static isValid(buffer: Uint8Array): boolean {
    if (buffer.length < 16) {
      return false;
    }
    const magic = uint8ArrayToString(buffer.slice(8, 16));
    return magic === MBR_MAGIC;
  }

  static getPartCount(buffer: Uint8Array): number {
    return readUint32LE(buffer, 24);
  }

  static toMbrInfo(mbr: SunxiMbr): MbrInfo {
    const partitions: PartitionInfo[] = [];
    for (let i = 0; i < mbr.PartCount; i++) {
      partitions.push(SunxiPartitionParser.toPartitionInfo(mbr.array[i]));
    }

    return {
      crc32: mbr.crc32,
      version: mbr.version,
      magic: mbr.magic,
      copy: mbr.copy,
      index: mbr.index,
      partCount: mbr.PartCount,
      partitions,
    };
  }

  static toString(mbr: SunxiMbr): string {
    const info = SunxiMbrParser.toMbrInfo(mbr);
    let result = `MBR Info:
  CRC32: ${formatHex(mbr.crc32)}
  Version: ${formatHex(mbr.version)}
  Magic: "${mbr.magic}"
  Copy: ${mbr.copy}
  Index: ${mbr.index}
  Partition Count: ${mbr.PartCount}
  Partitions:`;

    for (let i = 0; i < mbr.PartCount; i++) {
      const part = mbr.array[i];
      result += `\n    [${i}] "${part.name}" - ${formatSize(info.partitions[i].length)} @ ${formatHex(info.partitions[i].address, 16)}`;
    }

    return result;
  }

  static dump(mbr: SunxiMbr): string {
    const info = SunxiMbrParser.toMbrInfo(mbr);
    let result = `MBR Dump:
========================================
CRC32:         ${formatHex(mbr.crc32)}
Version:       ${formatHex(mbr.version)}
Magic:         "${mbr.magic}"
Copy:          ${mbr.copy}
Index:         ${mbr.index}
PartCount:     ${mbr.PartCount}
========================================
Partitions:
`;

    for (let i = 0; i < mbr.PartCount; i++) {
      const part = mbr.array[i];
      const partInfo = info.partitions[i];
      result += `
----------------------------------------
Partition ${i}:
  Name:       "${part.name}"
  Classname:  "${part.classname}"
  Address:    ${formatHex(partInfo.address, 16)}
  Length:     ${formatSize(partInfo.length)} (${formatHex(partInfo.length, 16)})
  User Type:  ${formatHex(part.user_type)}
  Key Data:   ${part.keydata}
  Read-Only:  ${partInfo.readonly}`;
    }

    result += '\n========================================';
    return result;
  }
}

export function parseMbrFromBuffer(buffer: Uint8Array): MbrInfo {
  const mbr = SunxiMbrParser.parse(buffer);
  return SunxiMbrParser.toMbrInfo(mbr);
}

export function isValidMbr(buffer: Uint8Array): boolean {
  return SunxiMbrParser.isValid(buffer);
}
