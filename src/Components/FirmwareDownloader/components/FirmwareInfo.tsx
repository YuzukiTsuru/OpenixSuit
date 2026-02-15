import React from 'react';
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
  return (
    <div className="fd-section fd-section-firmware">
      <div className="fd-section-header">
        <h3>固件选择</h3>
        <button
          onClick={onOpenFile}
          disabled={loading || isFlashing}
          className="fd-button fd-button-primary"
        >
          {loading ? '加载中...' : '选择固件'}
        </button>
      </div>
      <div className="fd-info-card">
        <div className="fd-info-row">
          <span className="fd-info-label">文件路径:</span>
          <span className="fd-info-value">{imagePath ?? '未选择'}</span>
        </div>
        <div className="fd-info-row">
          <span className="fd-info-label">镜像大小:</span>
          <span className="fd-info-value">{imageInfo ? formatSize(imageInfo.header.image_size) : '-'}</span>
          <span className="fd-info-label">存储类型:</span>
          <span className="fd-info-value">{sysConfig ? SunxiSysConfigParser.getStorageType(sysConfig) : '-'}</span>
          <span className="fd-info-label">调试打印:</span>
          <span className="fd-info-value">{sysConfig ? (sysConfig.debug_mode > 0 ? '开启' : '关闭') : '-'}</span>
          <span className="fd-info-label">UART 端口:</span>
          <span className="fd-info-value">{sysConfig ? `${SunxiSysConfigParser.getGpioString(sysConfig.uart_para.uart_debug_tx)}|${SunxiSysConfigParser.getGpioString(sysConfig.uart_para.uart_debug_rx)}` : '-'}</span>
        </div>
      </div>
    </div>
  );
};
