import React from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();

  return (
    <div className="fd-right-column">
      <div className="fd-row fd-row-top">
        <div className="fd-section fd-section-options">
          <h3>{t('firmwareDownloader.flashControl.optionsTitle')}</h3>
          <div className="fd-checkbox-group">
            <label className="fd-checkbox-item">
              <input
                type="checkbox"
                checked={verifyDownload}
                onChange={(e) => onVerifyDownloadChange(e.target.checked)}
                disabled={isFlashing}
              />
              <span className="fd-checkbox-label">{t('firmwareDownloader.flashControl.verifyDownload')}</span>
            </label>
            <label className="fd-select-item">
              <span className="fd-select-label">{t('firmwareDownloader.flashControl.postFlashAction')}</span>
              <select
                value={postFlashAction}
                onChange={(e) => onPostFlashActionChange(e.target.value as PostFlashAction)}
                disabled={isFlashing}
                className="fd-select"
              >
                {POST_FLASH_ACTION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {t(option.label)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="fd-section fd-section-action">
          <h3>{t('firmwareDownloader.flashControl.controlTitle')}</h3>
          <div className="fd-progress-container">
            <div className="fd-progress-row">
              <div className={`fd-progress-bar ${isCancelling ? 'fd-progress-bar--cancelling' : ''} ${progress?.indeterminate ? 'fd-progress-bar--indeterminate' : ''}`}>
                <div
                  className="fd-progress-fill"
                  style={{ width: `${isCancelling || progress?.indeterminate ? 0 : (progress?.percent ?? 0)}%` }}
                />
              </div>
              <span className="fd-progress-percent">{isCancelling || progress?.indeterminate ? '0.0' : (progress?.percent ?? 0).toFixed(1)}%</span>
            </div>
            <div className="fd-progress-stage">{isCancelling ? t('firmwareDownloader.flashControl.cancelling') : (progress?.stage ?? t('firmwareDownloader.flashControl.waiting'))}</div>
            {progress?.speed && !isCancelling && !progress?.indeterminate && (
              <div className="fd-progress-speed">{t('firmwareDownloader.flashControl.speed')} {progress.speed}</div>
            )}
          </div>
          <button
            onClick={isFlashing ? onCancelFlash : onStartFlash}
            disabled={isCancelling || (!isFlashing && (!selectedDevice || !imagePath || !isDeviceReady(selectedDevice)))}
            className={`fd-button fd-button-large ${isCancelling ? 'fd-button-warning' : (isFlashing ? 'fd-button-danger' : 'fd-button-success')}`}
          >
            {isCancelling ? t('firmwareDownloader.flashControl.cancellingFlash') : (isFlashing ? t('firmwareDownloader.flashControl.cancelFlash') : t('firmwareDownloader.flashControl.startFlash'))}
          </button>
        </div>
      </div>

      <FlashLog logs={logs} />
    </div>
  );
};
