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

const SunxiPartitionFields: FieldDef[] = [
  { name: 'addrhi', size: 4 },
  { name: 'addrlo', size: 4 },
  { name: 'lenhi', size: 4 },
  { name: 'lenlo', size: 4 },
  { name: 'classname', size: PART_NAME_MAX_LEN },
  { name: 'name', size: PART_NAME_MAX_LEN },
  { name: 'user_type', size: 4 },
  { name: 'keydata', size: 4 },
  { name: 'ro', size: 4 },
  { name: 'res', size: PART_SIZE_RES_LEN },
];

const SunxiPartitionOffsets = computeOffsets(SunxiPartitionFields) as {
  addrhi: number;
  addrlo: number;
  lenhi: number;
  lenlo: number;
  classname: number;
  name: number;
  user_type: number;
  keydata: number;
  ro: number;
  res: number;
};

const SUNXI_PARTITION_SIZE = SunxiPartitionFields.reduce((sum, f) => sum + f.size, 0);

const SunxiMbrHeaderFields: FieldDef[] = [
  { name: 'crc32', size: 4 },
  { name: 'version', size: 4 },
  { name: 'magic', size: 8 },
  { name: 'copy', size: 4 },
  { name: 'index', size: 4 },
  { name: 'PartCount', size: 4 },
  { name: 'stamp', size: 4 },
];

const SunxiMbrHeaderOffsets = computeOffsets(SunxiMbrHeaderFields) as {
  crc32: number;
  version: number;
  magic: number;
  copy: number;
  index: number;
  PartCount: number;
  stamp: number;
};

const SUNXI_MBR_HEADER_SIZE = SunxiMbrHeaderFields.reduce((sum, f) => sum + f.size, 0);
const SUNXI_MBR_SIZE = MBR_SIZE;

export class SunxiPartitionParser {
  static parse(buffer: Uint8Array, offset: number): SunxiPartition {
    return {
      addrhi: readUint32LE(buffer, offset + SunxiPartitionOffsets.addrhi),
      addrlo: readUint32LE(buffer, offset + SunxiPartitionOffsets.addrlo),
      lenhi: readUint32LE(buffer, offset + SunxiPartitionOffsets.lenhi),
      lenlo: readUint32LE(buffer, offset + SunxiPartitionOffsets.lenlo),
      classname: uint8ArrayToString(buffer.slice(offset + SunxiPartitionOffsets.classname, offset + SunxiPartitionOffsets.classname + PART_NAME_MAX_LEN)),
      name: uint8ArrayToString(buffer.slice(offset + SunxiPartitionOffsets.name, offset + SunxiPartitionOffsets.name + PART_NAME_MAX_LEN)),
      user_type: readUint32LE(buffer, offset + SunxiPartitionOffsets.user_type),
      keydata: readUint32LE(buffer, offset + SunxiPartitionOffsets.keydata),
      ro: readUint32LE(buffer, offset + SunxiPartitionOffsets.ro),
      res: Array.from(buffer.slice(offset + SunxiPartitionOffsets.res, offset + SunxiPartitionOffsets.res + PART_SIZE_RES_LEN)),
    };
  }

  static serialize(partition: SunxiPartition, buffer: Uint8Array, offset: number): void {
    writeUint32LE(buffer, offset + SunxiPartitionOffsets.addrhi, partition.addrhi);
    writeUint32LE(buffer, offset + SunxiPartitionOffsets.addrlo, partition.addrlo);
    writeUint32LE(buffer, offset + SunxiPartitionOffsets.lenhi, partition.lenhi);
    writeUint32LE(buffer, offset + SunxiPartitionOffsets.lenlo, partition.lenlo);
    buffer.set(stringToUint8Array(partition.classname, PART_NAME_MAX_LEN), offset + SunxiPartitionOffsets.classname);
    buffer.set(stringToUint8Array(partition.name, PART_NAME_MAX_LEN), offset + SunxiPartitionOffsets.name);
    writeUint32LE(buffer, offset + SunxiPartitionOffsets.user_type, partition.user_type);
    writeUint32LE(buffer, offset + SunxiPartitionOffsets.keydata, partition.keydata);
    writeUint32LE(buffer, offset + SunxiPartitionOffsets.ro, partition.ro);
    buffer.set(new Uint8Array(partition.res), offset + SunxiPartitionOffsets.res);
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

    const crc32 = readUint32LE(buffer, SunxiMbrHeaderOffsets.crc32);
    const version = readUint32LE(buffer, SunxiMbrHeaderOffsets.version);
    const magic = uint8ArrayToString(buffer.slice(SunxiMbrHeaderOffsets.magic, SunxiMbrHeaderOffsets.magic + 8));

    if (magic !== MBR_MAGIC) {
      throw new Error(`Invalid MBR magic: expected "${MBR_MAGIC}", got "${magic}"`);
    }

    const copy = readUint32LE(buffer, SunxiMbrHeaderOffsets.copy);
    const index = readUint32LE(buffer, SunxiMbrHeaderOffsets.index);
    const PartCount = readUint32LE(buffer, SunxiMbrHeaderOffsets.PartCount);
    const stamp = [readUint32LE(buffer, SunxiMbrHeaderOffsets.stamp)];

    const array: SunxiPartition[] = [];
    const partitionsOffset = SUNXI_MBR_HEADER_SIZE;
    for (let i = 0; i < MBR_MAX_PART_CNT; i++) {
      array.push(SunxiPartitionParser.parse(buffer, partitionsOffset + i * SUNXI_PARTITION_SIZE));
    }

    const resOffset = partitionsOffset + MBR_MAX_PART_CNT * SUNXI_PARTITION_SIZE;
    const res = Array.from(buffer.slice(resOffset, SUNXI_MBR_SIZE));

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

    writeUint32LE(buffer, SunxiMbrHeaderOffsets.crc32, mbr.crc32);
    writeUint32LE(buffer, SunxiMbrHeaderOffsets.version, mbr.version);
    buffer.set(stringToUint8Array(mbr.magic, 8), SunxiMbrHeaderOffsets.magic);
    writeUint32LE(buffer, SunxiMbrHeaderOffsets.copy, mbr.copy);
    writeUint32LE(buffer, SunxiMbrHeaderOffsets.index, mbr.index);
    writeUint32LE(buffer, SunxiMbrHeaderOffsets.PartCount, mbr.PartCount);
    writeUint32LE(buffer, SunxiMbrHeaderOffsets.stamp, mbr.stamp[0]);

    const partitionsOffset = SUNXI_MBR_HEADER_SIZE;
    for (let i = 0; i < MBR_MAX_PART_CNT; i++) {
      SunxiPartitionParser.serialize(mbr.array[i], buffer, partitionsOffset + i * SUNXI_PARTITION_SIZE);
    }

    const resOffset = partitionsOffset + MBR_MAX_PART_CNT * SUNXI_PARTITION_SIZE;
    buffer.set(new Uint8Array(mbr.res), resOffset);

    return buffer;
  }

  static isValid(buffer: Uint8Array): boolean {
    if (buffer.length < SunxiMbrHeaderOffsets.magic + 8) {
      return false;
    }
    const magic = uint8ArrayToString(buffer.slice(SunxiMbrHeaderOffsets.magic, SunxiMbrHeaderOffsets.magic + 8));
    return magic === MBR_MAGIC;
  }

  static getPartCount(buffer: Uint8Array): number {
    return readUint32LE(buffer, SunxiMbrHeaderOffsets.PartCount);
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
