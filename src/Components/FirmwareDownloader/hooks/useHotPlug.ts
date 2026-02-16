import { useEffect, useRef, useCallback } from 'react';
import { hotPlugManager, UsbHotPlugCallback } from '../../../Devices';

export function useHotPlug(onDeviceChange: (event: UsbHotPlugCallback) => void) {
  const startedRef = useRef(false);

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
    startHotPlug();

    const unsubscribe = hotPlugManager.onHotPlug(onDeviceChange);

    return () => {
      unsubscribe();
    };
  }, [startHotPlug, onDeviceChange]);

  return {
    isStarted: startedRef.current,
  };
}
