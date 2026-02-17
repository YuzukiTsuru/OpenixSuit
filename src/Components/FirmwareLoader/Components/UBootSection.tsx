import React from 'react';
import { useTranslation } from 'react-i18next';
import { UBootHead } from '../../../FlashConfig';
import { formatSize, formatHex } from '../../../Utils';

interface UBootSectionProps {
  ubootHeader: UBootHead;
}

export const UBootSection: React.FC<UBootSectionProps> = ({ ubootHeader }) => {
  const { t } = useTranslation();

  return (
    <div className="uboot-info">
      <h3>{t('firmwareLoader.uboot.title')}</h3>
      <div className="info-grid">
        <div className="info-item">
          <span className="label">{t('firmwareLoader.uboot.magic')}</span>
          <span className="value">{ubootHeader.uboot_head.magic}</span>
        </div>
        <div className="info-item">
          <span className="label">{t('firmwareLoader.uboot.version')}</span>
          <span className="value">{ubootHeader.uboot_head.version}</span>
        </div>
        <div className="info-item">
          <span className="label">{t('firmwareLoader.uboot.length')}</span>
          <span className="value">{formatSize(ubootHeader.uboot_head.length)}</span>
        </div>
        <div className="info-item">
          <span className="label">{t('firmwareLoader.uboot.runAddr')}</span>
          <span className="value">{formatHex(ubootHeader.uboot_head.run_addr)}</span>
        </div>
        <div className="info-item">
          <span className="label">{t('firmwareLoader.uboot.platform')}</span>
          <span className="value">{ubootHeader.uboot_head.platform}</span>
        </div>
        <div className="info-item">
          <span className="label">{t('firmwareLoader.uboot.workMode')}</span>
          <span className="value">{formatHex(ubootHeader.uboot_data.work_mode)}</span>
        </div>
      </div>
    </div>
  );
};

export default UBootSection;
