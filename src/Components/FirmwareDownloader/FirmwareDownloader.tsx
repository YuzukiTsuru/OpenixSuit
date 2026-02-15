import React, { useState, useCallback } from 'react';
import { useDeviceScanner, useImageLoader, useFlashState } from './hooks';
import { FirmwareInfo, DeviceList, FlashConfig, FlashControl } from './Components';
import { LogEntry } from './Types';
import { Popup, PopupState } from '../../CoreUI';
import './FirmwareDownloader.css';

export const FirmwareDownloader: React.FC = () => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [popup, setPopup] = useState<PopupState>({
    visible: false,
    type: 'error',
    title: '',
    message: '',
  });

  const addLog = useCallback((level: LogEntry['level'], message: string) => {
    setLogs((prev) => [...prev.slice(-500), { timestamp: new Date(), level, message }]);
    if (level === 'error') {
      setPopup({
        visible: true,
        type: 'error',
        title: '错误',
        message,
      });
    }
  }, []);

  const {
    devices,
    selectedDevice,
    scanning,
    handleScanDevices,
    isDeviceReady,
    getDeviceStatusDisplay,
    setSelectedDevice,
  } = useDeviceScanner(addLog);

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
  } = useFlashState(addLog, selectedDevice, imagePath, imageInfo, isDeviceReady);

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

      <Popup
        visible={popup.visible}
        type={popup.type}
        title={popup.title}
        message={popup.message}
        onClose={() => setPopup(prev => ({ ...prev, visible: false }))}
      />
    </div>
  );
};

export default FirmwareDownloader;
