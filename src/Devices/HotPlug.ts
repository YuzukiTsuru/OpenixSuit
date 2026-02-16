import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';

export type UsbHotPlugEvent = 'arrived' | 'left';

export interface UsbHotPlugCallback {
  event: UsbHotPlugEvent;
  vendor_id: number;
  product_id: number;
}

export const SUNXI_USB_VENDOR = 0x1f3a;
export const SUNXI_USB_PRODUCT = 0xefe8;

export type HotPlugCallback = (event: UsbHotPlugCallback) => void;

class HotPlugManager {
  private unlisten: UnlistenFn | null = null;
  private callbacks: Set<HotPlugCallback> = new Set();
  private started: boolean = false;
  private paused: boolean = false;
  private lastEventTime: number = 0;
  private lastEventType: UsbHotPlugEvent | null = null;
  private readonly DEBOUNCE_MS = 100;

  async start(): Promise<void> {
    if (this.started) {
      return;
    }

    this.unlisten = await listen<UsbHotPlugCallback>('usb-hotplug', (event) => {
      if (this.paused) {
        return;
      }

      const callback = event.payload;

      if (callback.vendor_id === SUNXI_USB_VENDOR && callback.product_id === SUNXI_USB_PRODUCT) {
        const now = Date.now();
        
        if (this.lastEventType === callback.event && 
            now - this.lastEventTime < this.DEBOUNCE_MS) {
          return;
        }
        
        this.lastEventTime = now;
        this.lastEventType = callback.event;
        
        this.callbacks.forEach((cb) => cb(callback));
      }
    });

    await invoke('hotplug_start');

    this.started = true;
  }

  stop(): void {
    if (this.unlisten) {
      this.unlisten();
      this.unlisten = null;
    }
    this.started = false;
    this.paused = false;
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
    this.lastEventTime = 0;
    this.lastEventType = null;
  }

  isPaused(): boolean {
    return this.paused;
  }

  onHotPlug(callback: HotPlugCallback): () => void {
    this.callbacks.add(callback);

    return () => {
      this.callbacks.delete(callback);
    };
  }

  isStarted(): boolean {
    return this.started;
  }

  waitForDeviceArrive(timeoutMs: number = 30000): Promise<UsbHotPlugCallback> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error(`等待设备超时 (${timeoutMs}ms)`));
      }, timeoutMs);

      const cleanup = this.onHotPlug((event) => {
        if (event.event === 'arrived') {
          clearTimeout(timeout);
          cleanup();
          resolve(event);
        }
      });
    });
  }
}

export const hotPlugManager = new HotPlugManager();
