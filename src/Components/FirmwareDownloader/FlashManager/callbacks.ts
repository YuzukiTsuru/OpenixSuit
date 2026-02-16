import { FlashProgress, LogEntry } from '../Types';
import { PopupType } from '../../../CoreUI';

export interface FlashCallbacks {
  onProgress: (progress: FlashProgress) => void;
  onLog: (log: LogEntry) => void;
  onComplete: (success: boolean) => void;
  onRescan: () => void;
  checkCancelled: () => void;
  onShowPopup?: (type: PopupType, title: string, message: string) => void;
}

export class CallbackManager {
  private progressCallbacks: Set<(progress: FlashProgress) => void> = new Set();
  private logCallbacks: Set<(log: LogEntry) => void> = new Set();
  private completeCallbacks: Set<(success: boolean) => void> = new Set();
  private rescanCallbacks: Set<() => void> = new Set();
  private showPopupCallbacks: Set<(type: PopupType, title: string, message: string) => void> = new Set();

  emitProgress(progress: FlashProgress): void {
    this.progressCallbacks.forEach((cb) => cb(progress));
  }

  emitLog(log: LogEntry): void {
    this.logCallbacks.forEach((cb) => cb(log));
  }

  emitComplete(success: boolean): void {
    this.completeCallbacks.forEach((cb) => cb(success));
  }

  emitRescan(): void {
    this.rescanCallbacks.forEach((cb) => cb());
  }

  emitShowPopup(type: PopupType, title: string, message: string): void {
    this.showPopupCallbacks.forEach((cb) => cb(type, title, message));
  }

  onProgress(callback: (progress: FlashProgress) => void): () => void {
    this.progressCallbacks.add(callback);
    return () => this.progressCallbacks.delete(callback);
  }

  onLog(callback: (log: LogEntry) => void): () => void {
    this.logCallbacks.add(callback);
    return () => this.logCallbacks.delete(callback);
  }

  onComplete(callback: (success: boolean) => void): () => void {
    this.completeCallbacks.add(callback);
    return () => this.completeCallbacks.delete(callback);
  }

  onRescan(callback: () => void): () => void {
    this.rescanCallbacks.add(callback);
    return () => this.rescanCallbacks.delete(callback);
  }

  onShowPopup(callback: (type: PopupType, title: string, message: string) => void): () => void {
    this.showPopupCallbacks.add(callback);
    return () => this.showPopupCallbacks.delete(callback);
  }
}
