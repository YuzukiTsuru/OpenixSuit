import { invoke } from '@tauri-apps/api/core';
import { EfexError } from './error';
import { StorageType, STORAGE_TYPES } from './types';

export interface FesOperations {
  queryStorage(): Promise<StorageType>;
  querySecure(): Promise<number>;
  probeFlashSize(): Promise<number>;
  flashSetOnoff(storageType: number, onOff: boolean): Promise<void>;
}

export function createFesOperations(): FesOperations {
  return {
    async queryStorage(): Promise<StorageType> {
      try {
        const storageType = await invoke<number>('efex_fes_query_storage');
        return STORAGE_TYPES[storageType] || 'unknown';
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
