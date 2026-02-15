import React from 'react';
import { FlashProgress, FlashDevice, LogEntry } from '../Types';
import { FlashLog } from './FlashLog';

interface FlashControlProps {
  progress: FlashProgress | null;
  reloadImage: boolean;
  autoFlash: boolean;
  isFlashing: boolean;
  selectedDevice: FlashDevice | null;
  imagePath: string | null;
  logs: LogEntry[];
  isDeviceReady: (device: FlashDevice | null) => boolean;
  onReloadImageChange: (checked: boolean) => void;
  onAutoFlashChange: (checked: boolean) => void;
  onStartFlash: () => void;
  onCancelFlash: () => void;
}

export const FlashControl: React.FC<FlashControlProps> = ({
  progress,
  reloadImage,
  autoFlash,
  isFlashing,
  selectedDevice,
  imagePath,
  logs,
  isDeviceReady,
  onReloadImageChange,
  onAutoFlashChange,
  onStartFlash,
  onCancelFlash,
}) => {
  return (
    <div className="fd-right-column">
      <div className="fd-row fd-row-top">
        <div className="fd-section fd-section-options">
          <h3>功能配置</h3>
          <div className="fd-checkbox-group">
            <label className="fd-checkbox-item">
              <input
                type="checkbox"
                checked={reloadImage}
                onChange={(e) => onReloadImageChange(e.target.checked)}
                disabled={isFlashing}
              />
              <span className="fd-checkbox-label">每次烧写重新读取镜像</span>
            </label>
            <label className="fd-checkbox-item">
              <input
                type="checkbox"
                checked={autoFlash}
                onChange={(e) => onAutoFlashChange(e.target.checked)}
                disabled={isFlashing}
              />
              <span className="fd-checkbox-label">识别到设备立刻烧录</span>
            </label>
          </div>
        </div>

        <div className="fd-section fd-section-action">
          <h3>烧录控制</h3>
          <div className="fd-progress-container">
            <div className="fd-progress-bar">
              <div
                className="fd-progress-fill"
                style={{ width: `${progress?.percent ?? 0}%` }}
              />
            </div>
            <div className="fd-progress-info">
              <span className="fd-progress-percent">{(progress?.percent ?? 0).toFixed(1)}%</span>
              <span className="fd-progress-stage">{progress?.stage ?? '等待开始'}</span>
            </div>
            {progress?.speed && (
              <div className="fd-progress-speed">速度: {progress.speed}</div>
            )}
          </div>
          <button
            onClick={isFlashing ? onCancelFlash : onStartFlash}
            disabled={!isFlashing && (!selectedDevice || !imagePath || !isDeviceReady(selectedDevice))}
            className={`fd-button fd-button-large ${isFlashing ? 'fd-button-danger' : 'fd-button-success'}`}
          >
            {isFlashing ? '取消烧写' : '开始烧写'}
          </button>
        </div>
      </div>

      <FlashLog logs={logs} />
    </div>
  );
};
