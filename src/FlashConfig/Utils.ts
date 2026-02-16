export function uint8ArrayToString(arr: Uint8Array, maxLength?: number): string {
  const len = maxLength ?? arr.length;
  let result = '';
  for (let i = 0; i < len && arr[i] !== 0; i++) {
    result += String.fromCharCode(arr[i]);
  }
  return result;
}

export function stringToUint8Array(str: string, length: number): Uint8Array {
  const arr = new Uint8Array(length);
  for (let i = 0; i < str.length && i < length; i++) {
    arr[i] = str.charCodeAt(i);
  }
  return arr;
}

export function readUint32LE(buffer: Uint8Array, offset: number): number {
  return (
    buffer[offset] |
    (buffer[offset + 1] << 8) |
    (buffer[offset + 2] << 16) |
    (buffer[offset + 3] << 24)
  ) >>> 0;
}

export function writeUint32LE(buffer: Uint8Array, offset: number, value: number): void {
  buffer[offset] = value & 0xff;
  buffer[offset + 1] = (value >> 8) & 0xff;
  buffer[offset + 2] = (value >> 16) & 0xff;
  buffer[offset + 3] = (value >> 24) & 0xff;
}

export function readUint16LE(buffer: Uint8Array, offset: number): number {
  return buffer[offset] | (buffer[offset + 1] << 8);
}

export function writeUint16LE(buffer: Uint8Array, offset: number, value: number): void {
  buffer[offset] = value & 0xff;
  buffer[offset + 1] = (value >> 8) & 0xff;
}

export function readUint8Array(buffer: Uint8Array, offset: number, length: number): Uint8Array {
  return buffer.slice(offset, offset + length);
}

export function writeUint8Array(target: Uint8Array, offset: number, source: Uint8Array): void {
  target.set(source, offset);
}

export function readUint32Array(buffer: Uint8Array, offset: number, count: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < count; i++) {
    result.push(readUint32LE(buffer, offset + i * 4));
  }
  return result;
}

export function writeUint32Array(buffer: Uint8Array, offset: number, values: number[]): void {
  for (let i = 0; i < values.length; i++) {
    writeUint32LE(buffer, offset + i * 4, values[i]);
  }
}

export function combineHiLo(hi: number, lo: number): bigint {
  return (BigInt(hi) << 32n) | BigInt(lo);
}

export function formatHex(value: number | bigint, padding: number = 8): string {
  return '0x' + value.toString(16).toUpperCase().padStart(padding, '0');
}

export function formatSize(bytes: number | bigint): string {
  const size = Number(bytes);
  if (size < 1024) {
    return `${size} B`;
  } else if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(2)} KB`;
  } else if (size < 1024 * 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(2)} MB`;
  } else {
    return `${(size / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  }
}

export function calculateChecksum(buffer: Uint8Array, start: number, length: number): number {
  let sum = 0;
  const end = start + length;
  for (let i = start; i < end; i += 4) {
    const value = readUint32LE(buffer, i);
    sum = (sum + value) >>> 0;
  }
  return sum;
}

export function generateStamp(): number {
  return Math.floor(Date.now() / 1000);
}

export function addSum(data: Uint8Array, offset: number = 0, length?: number): number {
  const len = length ?? (data.length - offset);
  let sum = 0;

  const dwordCount = len >> 2;
  for (let i = 0; i < dwordCount; i++) {
    const pos = offset + i * 4;
    sum = (sum + readUint32LE(data, pos)) >>> 0;
  }

  const remaining = len & 0x03;
  if (remaining > 0) {
    const pos = offset + dwordCount * 4;
    let lastValue = 0;
    switch (remaining) {
      case 1:
        lastValue = data[pos] & 0x000000ff;
        break;
      case 2:
        lastValue = (data[pos] | (data[pos + 1] << 8)) & 0x0000ffff;
        break;
      case 3:
        lastValue = (data[pos] | (data[pos + 1] << 8) | (data[pos + 2] << 16)) & 0x00ffffff;
        break;
    }
    sum = (sum + lastValue) >>> 0;
  }

  return sum;
}
