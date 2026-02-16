export function parseAddress(addr: string): number | null {
  try {
    const trimmed = addr.trim().toLowerCase();
    if (trimmed.startsWith('0x')) {
      return parseInt(trimmed.slice(2), 16);
    }
    return parseInt(trimmed, 10);
  } catch {
    return null;
  }
}

export function parseKeyValue(line: string): { key: string; value: string | number } | null {
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

export function parseStringValue(value: string): string {
  if (value.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1);
  }
  return value;
}
