import React, { useState, useCallback, useEffect } from 'react';
import { useDeviceScanner, useImageLoader, useFlashState } from './hooks';
import { FirmwareInfo, DeviceList, FlashConfig, FlashControl } from './Components';
import { LogEntry } from './Types';
import { loadSettings, AppSettings } from '../../Settings/settingsStore';
import './FirmwareDownloader.css';

export const FirmwareDownloader: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    loadSettings().then(setSettings);
  }, []);

  const addLog = useCallback((level: LogEntry['level'], message: string) => {
    setLogs((prev) => [...prev.slice(-500), { timestamp: new Date(), level, message }]);
  }, []);

  const {
    devices,
    selectedDevice,
    scanning,
    handleScanDevices,
    isDeviceReady,
    getDeviceStatusDisplay,
    setSelectedDevice,
  } = useDeviceScanner(addLog, settings?.autoScanDevices);

  const {
    imagePath,
    imageInfo,
    partitions,
    loading,
    sysConfig,
    handleOpenFile,
  } = useImageLoader(addLog);

  const {
    flashMode,
    selectedPartitions,
    verifyDownload,
    postFlashAction,
    isFlashing,
    progress,
    setFlashMode,
    setVerifyDownload,
    setPostFlashAction,
    handleStartFlash,
    handleCancelFlash,
    handlePartitionToggle,
  } = useFlashState(addLog, selectedDevice, imagePath, imageInfo, isDeviceReady, settings);

  return (
    <div className="firmware-downloader">
      <div className="fd-row">
        <FirmwareInfo
          imagePath={imagePath}
          imageInfo={imageInfo}
          sysConfig={sysConfig}
          loading={loading}
          isFlashing={isFlashing}
          onOpenFile={handleOpenFile}
        />

        <DeviceList
          devices={devices}
          selectedDevice={selectedDevice}
          scanning={scanning}
          isFlashing={isFlashing}
          isDeviceReady={isDeviceReady}
          getDeviceStatusDisplay={getDeviceStatusDisplay}
          onScan={handleScanDevices}
          onSelectDevice={setSelectedDevice}
        />
      </div>

      <div className="fd-row fd-row-main">
        <FlashConfig
          flashMode={flashMode}
          partitions={partitions}
          selectedPartitions={selectedPartitions}
          isFlashing={isFlashing}
          onFlashModeChange={setFlashMode}
          onPartitionToggle={handlePartitionToggle}
        />

        <FlashControl
          progress={progress}
          verifyDownload={verifyDownload}
          postFlashAction={postFlashAction}
          isFlashing={isFlashing}
          selectedDevice={selectedDevice}
          imagePath={imagePath}
          logs={logs}
          isDeviceReady={isDeviceReady}
          onVerifyDownloadChange={setVerifyDownload}
          onPostFlashActionChange={setPostFlashAction}
          onStartFlash={handleStartFlash}
          onCancelFlash={handleCancelFlash}
        />
      </div>
    </div>
  );
};

export default FirmwareDownloader;
