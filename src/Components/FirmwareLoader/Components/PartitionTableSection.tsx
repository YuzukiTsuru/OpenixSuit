import React from 'react';
import { useTranslation } from 'react-i18next';
import { Partition } from '../../../Library/OpenixIMG';
import { formatSize, formatHex } from '../../../Utils';

interface PartitionTableSectionProps {
  partitions: Partition[];
  onExtract: (partition: Partition) => void;
}

export const PartitionTableSection: React.FC<PartitionTableSectionProps> = ({
  partitions,
  onExtract,
}) => {
  const { t } = useTranslation();

  const renderFlags = (partition: Partition): string => {
    const flags: string[] = [];
    if (partition.keydata) flags.push('K');
    if (partition.encrypt) flags.push('E');
    if (partition.verify) flags.push('V');
    if (partition.ro) flags.push('R');
    return flags.length > 0 ? flags.join('') : '-';
  };

  return (
    <div className="partitions-section">
      <h3>{t('firmwareLoader.partitionTable.title')}</h3>
      <table className="partitions-table">
        <thead>
          <tr>
            <th>{t('firmwareLoader.partitionTable.name')}</th>
            <th>{t('firmwareLoader.partitionTable.sizeSector')}</th>
            <th>{t('firmwareLoader.partitionTable.sizeBytes')}</th>
            <th>{t('firmwareLoader.partitionTable.downloadFile')}</th>
            <th>{t('firmwareLoader.partitionTable.userType')}</th>
            <th>{t('firmwareLoader.partitionTable.flags')}</th>
            <th>{t('firmwareLoader.partitionTable.action')}</th>
          </tr>
        </thead>
        <tbody>
          {partitions.map((partition, index) => (
            <tr key={index}>
              <td>{partition.name}</td>
              <td>{partition.size}</td>
              <td>{formatSize(partition.size * 512)}</td>
              <td>{partition.downloadfile || '-'}</td>
              <td>{formatHex(partition.user_type)}</td>
              <td>{renderFlags(partition)}</td>
              <td>
                {partition.downloadfile && (
                  <button onClick={() => onExtract(partition)} className="extract-button">
                    {t('common.extract')}
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="flags-legend">
        <span>{t('firmwareLoader.partitionTable.flagsLegend.K')}</span>
        <span>{t('firmwareLoader.partitionTable.flagsLegend.E')}</span>
        <span>{t('firmwareLoader.partitionTable.flagsLegend.V')}</span>
        <span>{t('firmwareLoader.partitionTable.flagsLegend.R')}</span>
        <span>{t('firmwareLoader.partitionTable.flagsLegend.none')}</span>
      </div>
    </div>
  );
};

export default PartitionTableSection;
