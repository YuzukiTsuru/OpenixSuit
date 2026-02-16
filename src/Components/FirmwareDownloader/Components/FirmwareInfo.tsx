import React from 'react';
import { useTranslation } from 'react-i18next';
import { ImageInfo } from '../../../Library/OpenixIMG';
import { SysConfig } from '../../../FlashConfig';
import { SunxiSysConfigParser } from '../../../FlashConfig';
import { formatSize } from '../Utils';

interface FirmwareInfoProps {
  imagePath: string | null;
  imageInfo: ImageInfo | null;
  sysConfig: SysConfig | null;
  loading: boolean;
  isFlashing: boolean;
  onOpenFile: () => void;
}

export const FirmwareInfo: React.FC<FirmwareInfoProps> = ({
  imagePath,
  imageInfo,
  sysConfig,
  loading,
  isFlashing,
  onOpenFile,
}) => {
  const { t } = useTranslation();

  return (
    <div className="fd-section fd-section-firmware">
      <div className="fd-section-header">
        <h3>{t('firmwareDownloader.firmwareInfo.title')}</h3>
        <button
          onClick={onOpenFile}
          disabled={loading || isFlashing}
          className="fd-button fd-button-primary"
        >
          {loading ? t('common.loading') : t('firmwareDownloader.firmwareInfo.selectFirmware')}
        </button>
      </div>
      <div className="fd-info-card">
        <div className="fd-info-row fd-info-row-path">
          <span className="fd-info-label">{t('firmwareDownloader.firmwareInfo.filePath')}</span>
          <span className="fd-info-value fd-info-value-scrollable">{imagePath ?? t('common.notSelected')}</span>
        </div>
        <div className="fd-info-row">
          <span className="fd-info-label">{t('firmwareDownloader.firmwareInfo.imageSize')}</span>
          <span className="fd-info-value">{imageInfo ? formatSize(imageInfo.header.image_size) : '-'}</span>
          <span className="fd-info-label">{t('firmwareDownloader.firmwareInfo.storageType')}</span>
          <span className="fd-info-value">{sysConfig ? SunxiSysConfigParser.getStorageType(sysConfig) : '-'}</span>
          <span className="fd-info-label">{t('firmwareDownloader.firmwareInfo.debugPrint')}</span>
          <span className="fd-info-value">{sysConfig ? (sysConfig.debug_mode > 0 ? t('firmwareDownloader.firmwareInfo.debugOn') : t('firmwareDownloader.firmwareInfo.debugOff')) : '-'}</span>
          <span className="fd-info-label">{t('firmwareDownloader.firmwareInfo.uartPort')}</span>
          <span className="fd-info-value">{sysConfig ? `${SunxiSysConfigParser.getGpioString(sysConfig.uart_para.uart_debug_tx)}|${SunxiSysConfigParser.getGpioString(sysConfig.uart_para.uart_debug_rx)}` : '-'}</span>
        </div>
      </div>
    </div>
  );
};
