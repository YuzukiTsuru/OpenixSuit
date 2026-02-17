import React from 'react';
import { useTranslation } from 'react-i18next';
import { MbrInfo } from '../../../FlashConfig';
import { formatSize, formatHex } from '../../../Utils';

interface MbrSectionProps {
  mbrInfo: MbrInfo;
}

export const MbrSection: React.FC<MbrSectionProps> = ({ mbrInfo }) => {
  const { t } = useTranslation();

  return (
    <div className="mbr-info">
      <h3>{t('firmwareLoader.mbr.title')}</h3>
      <div className="info-grid">
        <div className="info-item">
          <span className="label">{t('firmwareLoader.mbr.magic')}</span>
          <span className="value">{mbrInfo.magic}</span>
        </div>
        <div className="info-item">
          <span className="label">{t('firmwareLoader.mbr.version')}</span>
          <span className="value">{formatHex(mbrInfo.version)}</span>
        </div>
        <div className="info-item">
          <span className="label">{t('firmwareLoader.mbr.partitionCount')}</span>
          <span className="value">{mbrInfo.partCount}</span>
        </div>
        <div className="info-item">
          <span className="label">{t('firmwareLoader.mbr.crc32')}</span>
          <span className="value">{formatHex(mbrInfo.crc32)}</span>
        </div>
      </div>
      {mbrInfo.partitions.length > 0 && (
        <div className="mbr-partitions">
          <h4>{t('firmwareLoader.mbr.partitions')}</h4>
          <table className="mbr-table">
            <thead>
              <tr>
                <th>{t('firmwareLoader.mbr.name')}</th>
                <th>{t('firmwareLoader.mbr.address')}</th>
                <th>{t('firmwareLoader.mbr.lengthSector')}</th>
                <th>{t('firmwareLoader.mbr.lengthBytes')}</th>
                <th>{t('firmwareLoader.mbr.readonly')}</th>
              </tr>
            </thead>
            <tbody>
              {mbrInfo.partitions.map((part, index) => (
                <tr key={index}>
                  <td>{part.name}</td>
                  <td>{formatHex(part.address)}</td>
                  <td>{(Number(part.length))}</td>
                  <td>{formatSize(Number(part.length) * 512)}</td>
                  <td>{part.readonly ? t('common.yes') : t('common.no')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default MbrSection;
