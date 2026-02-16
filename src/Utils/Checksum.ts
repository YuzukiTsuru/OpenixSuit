import { readUint32LE } from './Binary';

export function calculateChecksum(buffer: Uint8Array, start: number, length: number): number {
  let sum = 0;
  const end = start + length;
  for (let i = start; i < end; i += 4) {
    const value = readUint32LE(buffer, i);
    sum = (sum + value) >>> 0;
  }
  return sum;
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

export function generateStamp(): number {
  return Math.floor(Date.now() / 1000);
}
