export interface DeviceOpsOptions {
  onProgress?: (stage: string, progress?: number) => void;
  onLog?: (level: 'info' | 'warn' | 'error', message: string) => void;
}
