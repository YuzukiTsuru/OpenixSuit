export const formatHex = (num: number): string =>
  `0x${num.toString(16).toUpperCase().padStart(8, '0')}`;

export const formatTime = (date: Date): string =>
  date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

export const parseAddress = (addr: string): number | null => {
  try {
    const trimmed = addr.trim().toLowerCase();
    if (trimmed.startsWith('0x')) {
      return parseInt(trimmed.slice(2), 16);
    }
    return parseInt(trimmed, 10);
  } catch {
    return null;
  }
};
