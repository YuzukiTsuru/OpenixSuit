import { Partition } from './Types';

export class OpenixPartition {
  private mbrSize: number = 0;
  private partitions: Partition[] = [];

  parseFromData(data: Uint8Array): boolean {
    const decoder = new TextDecoder('utf-8');
    const content = decoder.decode(data);
    return this.parseFromContent(content);
  }

  parseFromContent(content: string): boolean {
    const lines = content.split(/\r?\n/);
    let inMbrSection = false;
    let inPartitionSection = false;
    let currentPartition: Partition = this.createEmptyPartition();

    for (let line of lines) {
      line = line.trim();

      if (line.length === 0 || line[0] === ';' || line.startsWith('//')) {
        continue;
      }

      if (line === '[partition_start]') {
        inPartitionSection = true;
        inMbrSection = false;
        continue;
      }

      if (line === '[mbr]') {
        inMbrSection = true;
        inPartitionSection = false;
        continue;
      }

      if (line === '[partition]') {
        inMbrSection = false;

        if (currentPartition.name.length > 0) {
          this.partitions.push(currentPartition);
        }

        currentPartition = this.createEmptyPartition();
        inPartitionSection = true;
        continue;
      }

      if (inMbrSection) {
        const result = this.parseKeyValue(line);
        if (result && result.key === 'size') {
          this.mbrSize = result.value as number;
        }
      }

      if (inPartitionSection && currentPartition.name.length > 0) {
        this.parsePartitionLine(line, currentPartition);
      }

      if (inPartitionSection && currentPartition.name.length === 0 && line.includes('name')) {
        this.parsePartitionLine(line, currentPartition);
      }
    }

    if (inPartitionSection && currentPartition.name.length > 0) {
      this.partitions.push(currentPartition);
    }

    return true;
  }

  private createEmptyPartition(): Partition {
    return {
      name: '',
      size: 0,
      downloadfile: '',
      user_type: 0,
      keydata: false,
      encrypt: false,
      verify: false,
      ro: false,
    };
  }

  private parseKeyValue(line: string): { key: string; value: string | number } | null {
    const eqIndex = line.indexOf('=');
    if (eqIndex === -1) return null;

    const key = line.substring(0, eqIndex).trim();
    let value: string | number = line.substring(eqIndex + 1).trim();

    if (typeof value === 'string') {
      if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      } else if (/^0x[0-9a-fA-F]+$/i.test(value)) {
        value = parseInt(value, 16);
      } else if (/^-?\d+$/.test(value)) {
        value = parseInt(value, 10);
      }
    }

    return { key, value };
  }

  private parsePartitionLine(line: string, partition: Partition): void {
    const result = this.parseKeyValue(line);
    if (!result) return;

    const { key, value } = result;

    switch (key) {
      case 'name':
        partition.name = value as string;
        break;
      case 'size':
        partition.size = value as number;
        break;
      case 'downloadfile':
        partition.downloadfile = value as string;
        break;
      case 'user_type':
        partition.user_type = value as number;
        break;
      case 'keydata':
        partition.keydata = (value as number) !== 0;
        break;
      case 'encrypt':
        partition.encrypt = (value as number) !== 0;
        break;
      case 'verify':
        partition.verify = (value as number) !== 0;
        break;
      case 'ro':
        partition.ro = (value as number) !== 0;
        break;
    }
  }

  getMbrSize(): number {
    return this.mbrSize;
  }

  getPartitions(): Partition[] {
    return this.partitions;
  }

  getPartitionByName(name: string): Partition | null {
    return this.partitions.find((p) => p.name === name) || null;
  }

  isPartitionNameExists(name: string): boolean {
    return this.partitions.some((p) => p.name === name);
  }

  dumpToJson(): string {
    return JSON.stringify(
      {
        mbr_size: this.mbrSize,
        partitions: this.partitions,
      },
      null,
      2
    );
  }

  clear(): void {
    this.mbrSize = 0;
    this.partitions = [];
  }
}
