import { invoke } from '@tauri-apps/api/core';
import { EfexError } from './error';

export interface FelOperations {
  read(addr: number, len: number): Promise<Uint8Array>;
  write(addr: number, data: Uint8Array): Promise<void>;
  exec(addr: number): Promise<void>;
  setWriteTimeout(timeoutSecs: number): Promise<void>;
}

export function createFelOperations(): FelOperations {
  return {
    async read(addr: number, len: number): Promise<Uint8Array> {
      try {
        const result = await invoke<number[]>('efex_fel_read', {
          addr,
          len,
        });
        return new Uint8Array(result);
      } catch (e) {
        throw EfexError.fromData(e as any);
      }
    },

    async write(addr: number, data: Uint8Array): Promise<void> {
      try {
        await invoke('efex_fel_write', {
          addr,
          data: Array.from(data),
        });
      } catch (e) {
        throw EfexError.fromData(e as any);
      }
    },

    async exec(addr: number): Promise<void> {
      try {
        await invoke('efex_fel_exec', {
          addr,
        });
      } catch (e) {
        throw EfexError.fromData(e as any);
      }
    },

    async setWriteTimeout(timeoutSecs: number): Promise<void> {
      try {
        await invoke('efex_set_fel_write_timeout', {
          timeoutSecs,
        });
      } catch (e) {
        throw EfexError.fromData(e as any);
      }
    },
  };
}
