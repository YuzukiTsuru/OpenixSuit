import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useDeviceScanner, useImageLoader, useFlashState, usePopup, useHotPlug } from './Hooks';
import { FirmwareInfo, DeviceList, FlashConfig, FlashControl } from './Components';
import { LogEntry } from './Types';
import { loadSettings, AppSettings } from '../../Settings/settingsStore';
import { Popup } from '../../CoreUI';
import { UsbHotPlugCallback } from '../../Devices';
import './FirmwareDownloader.css';

export const FirmwareDownloader: React.FC = () => {
  const { t } = useTranslation();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    loadSettings().then(setSettings);
  }, []);

  const addLog = useCallback((level: LogEntry['level'], message: string) => {
    setLogs((prev) => [...prev.slice(-500), { timestamp: new Date(), level, message }]);
  }, []);

  const { popup, showPopup, hidePopup } = usePopup();

  const {
    devices,
    selectedDevice,
    scanning,
    handleScanDevices,
    clearDevices,
    isDeviceReady,
    getDeviceStatusDisplay,
    setSelectedDevice,
  } = useDeviceScanner(addLog, showPopup);

  const {
    imagePath,
    imageInfo,
    partitions,
    loading,
    sysConfig,
    handleOpenFile,
  } = useImageLoader(addLog, settings);

  const {
    flashMode,
    selectedPartitions,
    verifyDownload,
    postFlashAction,
    isFlashing,
    isCancelling,
    progress,
    setFlashMode,
    setVerifyDownload,
    setPostFlashAction,
    handleStartFlash,
    handleCancelFlash,
    handlePartitionToggle,
  } = useFlashState(addLog, selectedDevice, imagePath, imageInfo, isDeviceReady, settings, showPopup);

  const handleHotPlug = useCallback(
    (event: UsbHotPlugCallback) => {
      if (event.event === 'arrived') {
        addLog('info', t('firmwareDownloader.log.devicePlugged'));
        handleScanDevices(true);
      } else {
        addLog('info', t('firmwareDownloader.log.deviceUnplugged'));
        clearDevices();
      }
    },
    [addLog, handleScanDevices, clearDevices, t]
  );

  useHotPlug(handleHotPlug, settings?.autoScanDevices ?? true);

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
          isCancelling={isCancelling}
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
        onClose={hidePopup}
      />
    </div>
  );
};

export default FirmwareDownloader;
