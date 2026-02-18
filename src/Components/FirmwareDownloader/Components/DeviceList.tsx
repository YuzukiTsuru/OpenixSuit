import React from 'react';
import { useTranslation } from 'react-i18next';
import { FlashDevice } from '../Types';

interface DeviceListProps {
  devices: FlashDevice[];
  selectedDevice: FlashDevice | null;
  scanning: boolean;
  isFlashing: boolean;
  isDeviceReady: (device: FlashDevice | null) => boolean;
  getDeviceStatusDisplay: (device: FlashDevice) => string;
  onScan: (hotPlug?: boolean, isKeyPress?: boolean) => void;
  onSelectDevice: (device: FlashDevice) => void;
}

export const DeviceList: React.FC<DeviceListProps> = ({
  devices,
  selectedDevice,
  scanning,
  isFlashing,
  isDeviceReady,
  getDeviceStatusDisplay,
  onScan,
  onSelectDevice,
}) => {
  const { t } = useTranslation();

  return (
    <div className="fd-section fd-section-device">
      <div className="fd-section-header">
        <h3>{t('firmwareDownloader.deviceList.title')}</h3>
        <button
          onClick={() => onScan(false, true)}
          disabled={scanning || isFlashing}
          className="fd-button fd-button-secondary"
        >
          {scanning ? t('common.scanning') : t('common.refresh')}
        </button>
      </div>
      <div className="fd-device-list">
        {devices.length === 0 ? (
          <div className="fd-empty-state">
            <span>{t('firmwareDownloader.deviceList.noDevice')}</span>
          </div>
        ) : (
          devices.map((device) => (
            <div
              key={device.id}
              className={`fd-device-item ${selectedDevice?.id === device.id ? 'selected' : ''}`}
              onClick={() => !isFlashing && onSelectDevice(device)}
            >
              <div className="fd-device-info">
                <span className="fd-device-name">{device.name}</span>
                <span className="fd-device-type">{device.modeStr}</span>
              </div>
              <div className={`fd-device-status ${isDeviceReady(device) ? 'status-ready' : 'status-disconnected'}`}>
                {getDeviceStatusDisplay(device)}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
