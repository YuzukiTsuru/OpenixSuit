import React from 'react';
import { Partition } from '../../../Library/OpenixIMG';
import { FlashMode } from '../../../Devices';
import { formatSize, getModeLabel } from '../Utils';

interface FlashConfigProps {
  flashMode: FlashMode;
  partitions: Partition[];
  selectedPartitions: string[];
  isFlashing: boolean;
  onFlashModeChange: (mode: FlashMode) => void;
  onPartitionToggle: (partitionName: string) => void;
}

export const FlashConfig: React.FC<FlashConfigProps> = ({
  flashMode,
  partitions,
  selectedPartitions,
  isFlashing,
  onFlashModeChange,
  onPartitionToggle,
}) => {
  const downloadablePartitions = partitions.filter(p => p.downloadfile);

  return (
    <div className="fd-section fd-section-config">
      <h3>烧录配置</h3>
      <div className="fd-radio-group">
        {(['partition', 'keep_data', 'partition_erase', 'full_erase'] as FlashMode[]).map((mode) => (
          <label key={mode} className="fd-radio-item">
            <input
              type="radio"
              name="flashMode"
              value={mode}
              checked={flashMode === mode}
              onChange={() => onFlashModeChange(mode)}
              disabled={isFlashing}
            />
            <span className="fd-radio-label">{getModeLabel(mode)}</span>
          </label>
        ))}
      </div>

      <div className="fd-partition-selector">
        <h4>{flashMode === 'partition' ? '选择需要烧录的分区' : '将要烧录分区'}</h4>
        <div className="fd-partition-list">
          {downloadablePartitions.length > 0 ? (
            downloadablePartitions.map((partition, index) => (
              <div
                key={index}
                className={`fd-partition-item ${flashMode === 'partition' && selectedPartitions.includes(partition.name) ? 'fd-partition-selected' : ''}`}
                onClick={flashMode === 'partition' && !isFlashing ? () => onPartitionToggle(partition.name) : undefined}
              >
                <div className="fd-partition-item-readonly">
                  <span className="fd-partition-name">{partition.name}</span>
                  <span className="fd-partition-size">{formatSize(partition.size * 512)}</span>
                </div>
              </div>
            ))
          ) : (
            <div className="fd-empty-state fd-empty-state-small">
              <span>未加载固件</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
