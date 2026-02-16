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
