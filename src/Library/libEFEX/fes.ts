import { invoke } from '@tauri-apps/api/core';
import { EfexError } from './Error';
import {
  FesDataType,
  FesToolMode,
  FesVerifyResp,
  FES_DATA_TYPE_VALUES,
  FES_TOOL_MODE_VALUES
} from './Types';

export interface FesOperations {
  queryStorage(): Promise<number>;
  querySecure(): Promise<number>;
  probeFlashSize(): Promise<number>;
  flashSetOnoff(storageType: number, onOff: boolean): Promise<void>;
  getChipId(): Promise<string>;
  down(buf: Uint8Array, addr: number, dataType: FesDataType): Promise<void>;
  up(buf: Uint8Array, addr: number, dataType: FesDataType): Promise<void>;
  verifyValue(addr: number, size: number): Promise<FesVerifyResp>;
  verifyStatus(tag: number): Promise<FesVerifyResp>;
  verifyUbootBlk(tag: number): Promise<FesVerifyResp>;
  toolMode(toolMode: FesToolMode, nextMode: FesToolMode): Promise<void>;
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

    async getChipId(): Promise<string> {
      try {
        return await invoke<string>('efex_fes_get_chipid');
      } catch (e) {
        throw EfexError.fromData(e as any);
      }
    },

    async down(buf: Uint8Array, addr: number, dataType: FesDataType): Promise<void> {
      try {
        await invoke('efex_fes_down', {
          buf: Array.from(buf),
          addr,
          dataType: FES_DATA_TYPE_VALUES[dataType],
        });
      } catch (e) {
        throw EfexError.fromData(e as any);
      }
    },

    async up(buf: Uint8Array, addr: number, dataType: FesDataType): Promise<void> {
      try {
        const result = await invoke<number[]>('efex_fes_up', {
          len: buf.length,
          addr,
          dataType: FES_DATA_TYPE_VALUES[dataType],
        });
        buf.set(new Uint8Array(result));
      } catch (e) {
        throw EfexError.fromData(e as any);
      }
    },

    async verifyValue(addr: number, size: number): Promise<FesVerifyResp> {
      try {
        return await invoke<FesVerifyResp>('efex_fes_verify_value', {
          addr,
          size,
        });
      } catch (e) {
        throw EfexError.fromData(e as any);
      }
    },

    async verifyStatus(tag: number): Promise<FesVerifyResp> {
      try {
        return await invoke<FesVerifyResp>('efex_fes_verify_status', {
          tag,
        });
      } catch (e) {
        throw EfexError.fromData(e as any);
      }
    },

    async verifyUbootBlk(tag: number): Promise<FesVerifyResp> {
      try {
        return await invoke<FesVerifyResp>('efex_fes_verify_uboot_blk', {
          tag,
        });
      } catch (e) {
        throw EfexError.fromData(e as any);
      }
    },

    async toolMode(toolMode: FesToolMode, nextMode: FesToolMode): Promise<void> {
      try {
        await invoke('efex_fes_tool_mode', {
          toolMode: FES_TOOL_MODE_VALUES[toolMode],
          nextMode: FES_TOOL_MODE_VALUES[nextMode],
        });
      } catch (e) {
        throw EfexError.fromData(e as any);
      }
    },
  };
}
