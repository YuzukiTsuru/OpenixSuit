import React from 'react';
import { FlashDevice } from '../Types';

interface DeviceListProps {
  devices: FlashDevice[];
  selectedDevice: FlashDevice | null;
  scanning: boolean;
  isFlashing: boolean;
  isDeviceReady: (device: FlashDevice | null) => boolean;
  getDeviceStatusDisplay: (device: FlashDevice) => string;
  onScan: () => void;
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
  return (
    <div className="fd-section fd-section-device">
      <div className="fd-section-header">
        <h3>设备列表</h3>
        <button
          onClick={onScan}
          disabled={scanning || isFlashing}
          className="fd-button fd-button-secondary"
        >
          {scanning ? '扫描中...' : '刷新'}
        </button>
      </div>
      <div className="fd-device-list">
        {devices.length === 0 ? (
          <div className="fd-empty-state">
            <span>未发现设备</span>
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
