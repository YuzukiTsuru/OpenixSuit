import { useEffect, useRef, useCallback } from 'react';
import { hotPlugManager, UsbHotPlugCallback } from '../../../Devices';

export function useHotPlug(
  onDeviceChange: (event: UsbHotPlugCallback) => void,
  enabled: boolean = true
) {
  const startedRef = useRef(false);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const startHotPlug = useCallback(async () => {
    if (startedRef.current) {
      return;
    }

    try {
      await hotPlugManager.start();
      startedRef.current = true;
    } catch (error) {
      console.error('Failed to start hotplug watcher:', error);
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      hotPlugManager.pause();
      return;
    }

    startHotPlug();
    hotPlugManager.resume();

    const unsubscribe = hotPlugManager.onHotPlug(onDeviceChange);
    unsubscribeRef.current = unsubscribe;

    return () => {
      unsubscribe();
      unsubscribeRef.current = null;
    };
  }, [enabled, startHotPlug, onDeviceChange]);

  return {
    isStarted: startedRef.current,
  };
}
