import { useState, useCallback, useEffect } from 'react';
import { flashManager } from '../FlashManager';
import { FlashDevice, LogEntry, READY_MODES } from '../Types';
import { getErrorSolution, formatErrorForLog } from '../ErrorHandler';

export function useDeviceScanner(
  addLog: (level: LogEntry['level'], message: string) => void,
  showPopup: (type: 'error' | 'warning' | 'info', title: string, message: string) => void
) {
  const [devices, setDevices] = useState<FlashDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<FlashDevice | null>(null);
  const [scanning, setScanning] = useState(false);

  const handleScanDevices = useCallback(async () => {
    setScanning(true);

    try {
      const foundDevices = await flashManager.scan();
      setDevices(foundDevices);

      if (foundDevices.length > 0 && !selectedDevice) {
        const readyDevice = foundDevices.find(d => isDeviceReady(d));
        if (readyDevice) {
          setSelectedDevice(readyDevice);
        }
      }
    } catch (err) {
      addLog('error', `扫描设备失败: ${formatErrorForLog(err)}`);
      setDevices([]);
      setSelectedDevice(null);

      const solution = getErrorSolution(err);
      if (solution) {
        showPopup(solution.type, solution.title, solution.message);
      }
    } finally {
      setScanning(false);
    }
  }, [selectedDevice, addLog, showPopup]);

  const clearDevices = useCallback(() => {
    setDevices([]);
    setSelectedDevice(null);
  }, []);

  useEffect(() => {
    const unsubRescan = flashManager.onRescan(() => {
      handleScanDevices();
    });

    return () => {
      unsubRescan();
    };
  }, [handleScanDevices]);

  const isDeviceReady = (device: FlashDevice | null): boolean => {
    if (!device) return false;
    return READY_MODES.includes(device.mode);
  };

  const getDeviceStatusDisplay = (device: FlashDevice): string => {
    if (READY_MODES.includes(device.mode)) {
      return '就绪';
    }
    return device.modeStr || '未知';
  };

  return {
    devices,
    setDevices,
    selectedDevice,
    setSelectedDevice,
    scanning,
    handleScanDevices,
    clearDevices,
    isDeviceReady,
    getDeviceStatusDisplay,
  };
}
