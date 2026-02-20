import { SunxiPartition, SunxiMbr, PartitionInfo, MbrInfo } from './Types';
import {
  MBR_MAGIC,
  MBR_MAX_PART_CNT,
  MBR_SIZE,
  MBR_VERSION,
  MBR_RESERVED,
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
  crc32,
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

export function createEmptyPartition(): SunxiPartition {
  return {
    addrhi: 0,
    addrlo: 0,
    lenhi: 0,
    lenlo: 0,
    classname: '',
    name: '',
    user_type: 0,
    keydata: 0,
    ro: 0,
    res: new Array(PART_SIZE_RES_LEN).fill(0),
  };
}

export function createPartitionFromInfo(info: PartitionInfo): SunxiPartition {
  return {
    addrhi: Number((info.address >> 32n) & 0xffffffffn),
    addrlo: Number(info.address & 0xffffffffn),
    lenhi: Number((info.length >> 32n) & 0xffffffffn),
    lenlo: Number(info.length & 0xffffffffn),
    classname: info.classname,
    name: info.name,
    user_type: info.user_type,
    keydata: info.keydata,
    ro: info.readonly ? 1 : 0,
    res: new Array(PART_SIZE_RES_LEN).fill(0),
  };
}

export class MbrBuilder {
  private mbr: SunxiMbr;

  constructor(mbr?: SunxiMbr) {
    if (mbr) {
      this.mbr = JSON.parse(JSON.stringify(mbr));
    } else {
      this.mbr = {
        crc32: 0,
        version: MBR_VERSION,
        magic: MBR_MAGIC,
        copy: 1,
        index: 0,
        PartCount: 0,
        stamp: [Math.floor(Date.now() / 1000)],
        array: new Array(MBR_MAX_PART_CNT).fill(null).map(() => createEmptyPartition()),
        res: new Array(MBR_RESERVED).fill(0),
      };
    }
  }

  static fromBuffer(buffer: Uint8Array): MbrBuilder {
    const mbr = SunxiMbrParser.parse(buffer);
    return new MbrBuilder(mbr);
  }

  static fromMbrInfo(info: MbrInfo): MbrBuilder {
    const builder = new MbrBuilder();
    builder.mbr.crc32 = info.crc32;
    builder.mbr.version = info.version;
    builder.mbr.copy = info.copy;
    builder.mbr.index = info.index;
    builder.mbr.PartCount = info.partCount;
    for (let i = 0; i < info.partCount; i++) {
      builder.mbr.array[i] = createPartitionFromInfo(info.partitions[i]);
    }
    return builder;
  }

  getMbr(): SunxiMbr {
    return this.mbr;
  }

  getMbrInfo(): MbrInfo {
    return SunxiMbrParser.toMbrInfo(this.mbr);
  }

  getPartCount(): number {
    return this.mbr.PartCount;
  }

  getPartition(index: number): SunxiPartition | undefined {
    if (index < 0 || index >= this.mbr.PartCount) {
      return undefined;
    }
    return this.mbr.array[index];
  }

  getPartitionInfo(index: number): PartitionInfo | undefined {
    const partition = this.getPartition(index);
    if (!partition) {
      return undefined;
    }
    return SunxiPartitionParser.toPartitionInfo(partition);
  }

  findPartitionByName(name: string): number {
    for (let i = 0; i < this.mbr.PartCount; i++) {
      if (this.mbr.array[i].name === name) {
        return i;
      }
    }
    return -1;
  }

  addPartition(partition: SunxiPartition | PartitionInfo): number {
    if (this.mbr.PartCount >= MBR_MAX_PART_CNT) {
      throw new Error(`Maximum partition count reached (${MBR_MAX_PART_CNT})`);
    }
    const sunxiPartition = 'address' in partition ? createPartitionFromInfo(partition) : partition;
    this.mbr.array[this.mbr.PartCount] = sunxiPartition;
    this.mbr.PartCount++;
    return this.mbr.PartCount - 1;
  }

  addPartitionAt(index: number, partition: SunxiPartition | PartitionInfo): void {
    if (index < 0 || index > this.mbr.PartCount) {
      throw new Error(`Invalid index: ${index}`);
    }
    if (this.mbr.PartCount >= MBR_MAX_PART_CNT) {
      throw new Error(`Maximum partition count reached (${MBR_MAX_PART_CNT})`);
    }
    const sunxiPartition = 'address' in partition ? createPartitionFromInfo(partition) : partition;
    for (let i = this.mbr.PartCount; i > index; i--) {
      this.mbr.array[i] = this.mbr.array[i - 1];
    }
    this.mbr.array[index] = sunxiPartition;
    this.mbr.PartCount++;
  }

  updatePartition(index: number, partition: SunxiPartition | PartitionInfo): boolean {
    if (index < 0 || index >= this.mbr.PartCount) {
      return false;
    }
    const sunxiPartition = 'address' in partition ? createPartitionFromInfo(partition) : partition;
    this.mbr.array[index] = sunxiPartition;
    return true;
  }

  updatePartitionField(index: number, field: keyof SunxiPartition, value: unknown): boolean {
    if (index < 0 || index >= this.mbr.PartCount) {
      return false;
    }
    const partition = this.mbr.array[index];
    if (field in partition) {
      (partition as unknown as Record<string, unknown>)[field] = value;
      return true;
    }
    return false;
  }

  removePartition(index: number): boolean {
    if (index < 0 || index >= this.mbr.PartCount) {
      return false;
    }
    for (let i = index; i < this.mbr.PartCount - 1; i++) {
      this.mbr.array[i] = this.mbr.array[i + 1];
    }
    this.mbr.array[this.mbr.PartCount - 1] = createEmptyPartition();
    this.mbr.PartCount--;
    return true;
  }

  removePartitionByName(name: string): boolean {
    const index = this.findPartitionByName(name);
    if (index === -1) {
      return false;
    }
    return this.removePartition(index);
  }

  clearPartitions(): void {
    for (let i = 0; i < MBR_MAX_PART_CNT; i++) {
      this.mbr.array[i] = createEmptyPartition();
    }
    this.mbr.PartCount = 0;
  }

  setVersion(version: number): void {
    this.mbr.version = version;
  }

  setCopy(copy: number): void {
    this.mbr.copy = copy;
  }

  setIndex(index: number): void {
    this.mbr.index = index;
  }

  updateStamp(): void {
    this.mbr.stamp = [Math.floor(Date.now() / 1000)];
  }

  calculateCrc32(): number {
    const buffer = this.serializeWithoutCrc();
    return crc32(buffer, SunxiMbrHeaderOffsets.crc32 + 4);
  }

  updateCrc32(): void {
    this.mbr.crc32 = this.calculateCrc32();
  }

  serializeWithoutCrc(): Uint8Array {
    const buffer = new Uint8Array(SUNXI_MBR_SIZE);
    writeUint32LE(buffer, SunxiMbrHeaderOffsets.crc32, 0);
    writeUint32LE(buffer, SunxiMbrHeaderOffsets.version, this.mbr.version);
    buffer.set(stringToUint8Array(this.mbr.magic, 8), SunxiMbrHeaderOffsets.magic);
    writeUint32LE(buffer, SunxiMbrHeaderOffsets.copy, this.mbr.copy);
    writeUint32LE(buffer, SunxiMbrHeaderOffsets.index, this.mbr.index);
    writeUint32LE(buffer, SunxiMbrHeaderOffsets.PartCount, this.mbr.PartCount);
    writeUint32LE(buffer, SunxiMbrHeaderOffsets.stamp, this.mbr.stamp[0]);
    const partitionsOffset = SUNXI_MBR_HEADER_SIZE;
    for (let i = 0; i < MBR_MAX_PART_CNT; i++) {
      SunxiPartitionParser.serialize(this.mbr.array[i], buffer, partitionsOffset + i * SUNXI_PARTITION_SIZE);
    }
    const resOffset = partitionsOffset + MBR_MAX_PART_CNT * SUNXI_PARTITION_SIZE;
    buffer.set(new Uint8Array(this.mbr.res), resOffset);
    return buffer;
  }

  serialize(): Uint8Array {
    this.updateCrc32();
    return SunxiMbrParser.serialize(this.mbr);
  }

  clone(): MbrBuilder {
    return new MbrBuilder(this.mbr);
  }
}
