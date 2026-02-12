import { invoke } from '@tauri-apps/api/core';
import { EfexError } from './error';
import { DeviceMode, EfexDevice, PayloadArch } from './types';
import { FelOperations, createFelOperations } from './fel';
import { FesOperations, createFesOperations } from './fes';

export interface PayloadsOperations {
  readl(addr: number): Promise<number>;
  writel(value: number, addr: number): Promise<void>;
}

export class EfexContext {
  private _handle: number | null = null;
  private _mode: DeviceMode = 'unknown';
  private _modeStr: string = '';
  private _fel: FelOperations | null = null;
  private _fes: FesOperations | null = null;
  private _payloads: PayloadsOperations | null = null;

  get handle(): number | null {
    return this._handle;
  }

  get mode(): DeviceMode {
    return this._mode;
  }

  get modeStr(): string {
    return this._modeStr;
  }

  get fel(): FelOperations {
    if (!this._fel) {
      throw new Error('Device not opened');
    }
    return this._fel;
  }

  get fes(): FesOperations {
    if (!this._fes) {
      throw new Error('Device not opened');
    }
    return this._fes;
  }

  get payloads(): PayloadsOperations {
    if (!this._payloads) {
      throw new Error('Device not opened');
    }
    return this._payloads;
  }

  get isOpened(): boolean {
    return this._handle !== null;
  }

  static async scanDevices(): Promise<EfexDevice[]> {
    try {
      return await invoke<EfexDevice[]>('efex_scan_devices');
    } catch (e) {
      throw EfexError.fromData(e as any);
    }
  }

  async open(index: number = 0): Promise<void> {
    if (this._handle !== null) {
      throw new Error('Device already opened');
    }

    try {
      this._handle = await invoke<number>('efex_open_device', { index });
      this._fel = createFelOperations(this._handle);
      this._fes = createFesOperations(this._handle);
      this._payloads = this.createPayloadsOperations();

      await this.refreshMode();
    } catch (e) {
      this._handle = null;
      this._fel = null;
      this._fes = null;
      this._payloads = null;
      throw EfexError.fromData(e as any);
    }
  }

  async close(): Promise<void> {
    if (this._handle === null) {
      return;
    }

    try {
      await invoke('efex_close_device', { handle: this._handle });
    } catch (e) {
      throw EfexError.fromData(e as any);
    } finally {
      this._handle = null;
      this._fel = null;
      this._fes = null;
      this._payloads = null;
      this._mode = 'unknown';
      this._modeStr = '';
    }
  }

  async refreshMode(): Promise<void> {
    if (this._handle === null) {
      throw new Error('Device not opened');
    }

    try {
      this._mode = await invoke<DeviceMode>('efex_get_device_mode', {
        handle: this._handle,
      });
      this._modeStr = await invoke<string>('efex_get_device_mode_str', {
        handle: this._handle,
      });
    } catch (e) {
      throw EfexError.fromData(e as any);
    }
  }

  private createPayloadsOperations(): PayloadsOperations {
    const handle = this._handle!;
    return {
      async readl(addr: number): Promise<number> {
        try {
          return await invoke<number>('efex_payloads_readl', {
            handle,
            addr,
          });
        } catch (e) {
          throw EfexError.fromData(e as any);
        }
      },

      async writel(value: number, addr: number): Promise<void> {
        try {
          await invoke('efex_payloads_writel', {
            handle,
            value,
            addr,
          });
        } catch (e) {
          throw EfexError.fromData(e as any);
        }
      },
    };
  }

  static async payloadsInit(arch: PayloadArch): Promise<void> {
    try {
      await invoke('efex_payloads_init', { arch });
    } catch (e) {
      throw EfexError.fromData(e as any);
    }
  }
}

export async function withEfexContext<T>(
  callback: (ctx: EfexContext) => Promise<T>
): Promise<T> {
  const ctx = new EfexContext();
  try {
    await ctx.open();
    return await callback(ctx);
  } finally {
    await ctx.close();
  }
}
