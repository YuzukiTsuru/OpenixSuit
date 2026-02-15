import React from 'react';
import { FlashProgress, FlashDevice, LogEntry } from '../Types';
import { FlashLog } from './FlashLog';
import { PostFlashAction, POST_FLASH_ACTION_OPTIONS } from '../../../Devices';

interface FlashControlProps {
  progress: FlashProgress | null;
  verifyDownload: boolean;
  postFlashAction: PostFlashAction;
  isFlashing: boolean;
  isCancelling: boolean;
  selectedDevice: FlashDevice | null;
  imagePath: string | null;
  logs: LogEntry[];
  isDeviceReady: (device: FlashDevice | null) => boolean;
  onVerifyDownloadChange: (checked: boolean) => void;
  onPostFlashActionChange: (action: PostFlashAction) => void;
  onStartFlash: () => void;
  onCancelFlash: () => void;
}

export const FlashControl: React.FC<FlashControlProps> = ({
  progress,
  verifyDownload,
  postFlashAction,
  isFlashing,
  isCancelling,
  selectedDevice,
  imagePath,
  logs,
  isDeviceReady,
  onVerifyDownloadChange,
  onPostFlashActionChange,
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
                checked={verifyDownload}
                onChange={(e) => onVerifyDownloadChange(e.target.checked)}
                disabled={isFlashing}
              />
              <span className="fd-checkbox-label">验证下载镜像</span>
            </label>
            <label className="fd-select-item">
              <span className="fd-select-label">烧录完成后</span>
              <select
                value={postFlashAction}
                onChange={(e) => onPostFlashActionChange(e.target.value as PostFlashAction)}
                disabled={isFlashing}
                className="fd-select"
              >
                {POST_FLASH_ACTION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="fd-section fd-section-action">
          <h3>烧录控制</h3>
          <div className="fd-progress-container">
            <div className={`fd-progress-bar ${isCancelling ? 'fd-progress-bar--cancelling' : ''}`}>
              <div
                className="fd-progress-fill"
                style={{ width: `${isCancelling ? 0 : (progress?.percent ?? 0)}%` }}
              />
            </div>
            <div className="fd-progress-info">
              <span className="fd-progress-percent">{isCancelling ? '0.0' : (progress?.percent ?? 0).toFixed(1)}%</span>
              <span className="fd-progress-stage">{isCancelling ? '正在取消...' : (progress?.stage ?? '等待开始')}</span>
            </div>
            {progress?.speed && !isCancelling && (
              <div className="fd-progress-speed">速度: {progress.speed}</div>
            )}
          </div>
          <button
            onClick={isFlashing ? onCancelFlash : onStartFlash}
            disabled={isCancelling || (!isFlashing && (!selectedDevice || !imagePath || !isDeviceReady(selectedDevice)))}
            className={`fd-button fd-button-large ${isCancelling ? 'fd-button-warning' : (isFlashing ? 'fd-button-danger' : 'fd-button-success')}`}
          >
            {isCancelling ? '正在取消烧写...' : (isFlashing ? '取消烧写' : '开始烧写')}
          </button>
        </div>
      </div>

      <FlashLog logs={logs} />
    </div>
  );
};
