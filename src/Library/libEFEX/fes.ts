import { invoke } from '@tauri-apps/api/core';
import { EfexError } from './Error';

export interface FesOperations {
  queryStorage(): Promise<number>;
  querySecure(): Promise<number>;
  probeFlashSize(): Promise<number>;
  flashSetOnoff(storageType: number, onOff: boolean): Promise<void>;
}

export function createFesOperations(): FesOperations {
  return {
    async queryStorage(): Promise<number> {
      try {
        const storageType = await invoke<number>('efex_fes_query_storage');
        return storageType;
      } catch (e) {
        throw EfexError.fromData(e as any);
      }
    },

    async querySecure(): Promise<number> {
      try {
        return await invoke<number>('efex_fes_query_secure');
      } catch (e) {
        throw EfexError.fromData(e as any);
      }
    },

    async probeFlashSize(): Promise<number> {
      try {
        return await invoke<number>('efex_fes_probe_flash_size');
      } catch (e) {
        throw EfexError.fromData(e as any);
      }
    },

    async flashSetOnoff(storageType: number, onOff: boolean): Promise<void> {
      try {
        await invoke('efex_fes_flash_set_onoff', {
          storageType,
          onOff,
        });
      } catch (e) {
        throw EfexError.fromData(e as any);
      }
    },
  };
}
