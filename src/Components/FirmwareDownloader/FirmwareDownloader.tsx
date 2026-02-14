import React, { useState, useCallback, useEffect, useRef } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { readFile } from '@tauri-apps/plugin-fs';
import {
  flashManager,
  FlashDevice,
  FlashProgress,
  FlashOptions,
  LogEntry,
  FlashMode,
  formatLogTime,
} from './flash';
import { OpenixPacker, ImageInfo, Partition, OpenixPartition, getPartitionData, getSysConfig } from '../../Library/OpenixIMG';
import { DeviceMode } from '../../Library/libEFEX';
import {
  SunxiSysConfigParser,
  SysConfig,
} from '../../FlashConfig';
import './FirmwareDownloader.css';

const READY_MODES: DeviceMode[] = ['fel', 'srv'];

export const FirmwareDownloader: React.FC = () => {
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [imageInfo, setImageInfo] = useState<ImageInfo | null>(null);
  const [partitions, setPartitions] = useState<Partition[]>([]);
  const [devices, setDevices] = useState<FlashDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<FlashDevice | null>(null);
  const [flashMode, setFlashMode] = useState<FlashMode>('keep_data');
  const [selectedPartitions, setSelectedPartitions] = useState<string[]>([]);
  const [reloadImage, setReloadImage] = useState(true);
  const [autoFlash, setAutoFlash] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [progress, setProgress] = useState<FlashProgress | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sysConfig, setSysConfig] = useState<SysConfig | null>(null);

  const packer = useRef(new OpenixPacker());
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const unsubProgress = flashManager.onProgress((p) => setProgress(p));
    const unsubLog = flashManager.onLog((log) => {
      setLogs((prev) => [...prev.slice(-500), log]);
    });
    const unsubComplete = flashManager.onComplete((success) => {
      setIsFlashing(false);
      if (success) {
        setProgress((p) => p ? { ...p, percent: 100, stage: '烧写完成' } : null);
      }
    });

    return () => {
      unsubProgress();
      unsubLog();
      unsubComplete();
    };
  }, []);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    if (autoFlash && selectedDevice && imagePath && imageInfo && !isFlashing && isDeviceReady(selectedDevice)) {
      handleStartFlash();
    }
  }, [autoFlash, selectedDevice, imagePath]);

  const isDeviceReady = (device: FlashDevice | null): boolean => {
    if (!device) return false;
    return READY_MODES.includes(device.mode);
  };

  const getDeviceStatusDisplay = (device: FlashDevice): string => {
    if (READY_MODES.includes(device.mode)) {
      return '就绪';
    }
    return device.modeStr || '未知';
  };

  const handleOpenFile = useCallback(async () => {
    try {
      setLoading(true);
      setSelectedPartitions([]);
      setSysConfig(null);
      setImageInfo(null);
      setPartitions([]);
      const selected = await open({
        multiple: false,
        filters: [
          { name: 'Image Files', extensions: ['img', 'bin'] },
        ],
      });

      if (!selected) {
        setLoading(false);
        return;
      }

      const path = selected as string;
      setImagePath(path);

      const fileData = await readFile(path);
      const success = packer.current.loadImage(fileData.buffer);

      if (!success) {
        addLog('error', '无法加载镜像文件');
        setLoading(false);
        return;
      }

      const info = packer.current.getImageInfo();
      setImageInfo(info);

      const partitionData = getPartitionData(packer.current);

      if (partitionData) {
        const parser = new OpenixPartition();
        parser.parseFromData(partitionData);
        setPartitions(parser.getPartitions());
      } else {
        setPartitions([]);
      }

      const sysConfigData = getSysConfig(packer.current);
      if (sysConfigData) {
        try {
          const config = SunxiSysConfigParser.parse(sysConfigData);
          setSysConfig(config);
        } catch (err) {
          console.log('Failed to parse SysConfig:', err);
        }
      }

      addLog('success', `已加载镜像: ${path}`);
      setLoading(false);
    } catch (err) {
      addLog('error', `加载文件失败: ${err}`);
      setLoading(false);
    }
  }, []);

  const handleScanDevices = useCallback(async () => {
    setScanning(true);

    try {
      const foundDevices = await flashManager.scan();
      setDevices(foundDevices);

      if (foundDevices.length > 0 && !selectedDevice) {
        const readyDevice = foundDevices.find(d => isDeviceReady(d));
        if (readyDevice) {
          setSelectedDevice(readyDevice);
        }
      }
    } catch (err) {
      addLog('error', `扫描设备失败: ${err}`);
    } finally {
      setScanning(false);
    }
  }, [selectedDevice]);

  const handleStartFlash = useCallback(async () => {
    if (!selectedDevice) {
      addLog('error', '请先选择目标设备');
      return;
    }

    if (!imagePath || !imageInfo) {
      addLog('error', '请先选择固件文件');
      return;
    }

    if (!isDeviceReady(selectedDevice)) {
      addLog('error', '所选设备未就绪');
      return;
    }

    setIsFlashing(true);
    setProgress({ percent: 0, stage: '准备烧写...' });

    const options: FlashOptions = {
      mode: flashMode,
      partitions: flashMode === 'partition' ? selectedPartitions : undefined,
      reloadImage,
      autoFlash,
    };

    try {
      await flashManager.start(selectedDevice, imagePath, options);
    } catch (err) {
      addLog('error', `烧写失败: ${err}`);
      setIsFlashing(false);
    }
  }, [selectedDevice, imagePath, imageInfo, flashMode, selectedPartitions, reloadImage, autoFlash]);

  const handleCancelFlash = useCallback(() => {
    flashManager.cancel();
  }, []);

  const addLog = useCallback((level: LogEntry['level'], message: string) => {
    setLogs((prev) => [...prev.slice(-500), { timestamp: new Date(), level, message }]);
  }, []);

  const handlePartitionToggle = useCallback((partitionName: string) => {
    const isSelected = selectedPartitions.includes(partitionName);
    if (isSelected) {
      addLog('info', `取消选择分区: ${partitionName}`);
      setSelectedPartitions(prev => prev.filter((p) => p !== partitionName));
    } else {
      addLog('info', `选择分区: ${partitionName}`);
      setSelectedPartitions(prev => [...prev, partitionName]);
    }
  }, [selectedPartitions, addLog]);

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const getModeLabel = (mode: FlashMode): string => {
    const labels: Record<FlashMode, string> = {
      partition: '指定分区烧录',
      keep_data: '保留数据升级',
      partition_erase: '分区擦除升级',
      full_erase: '全盘擦除升级',
    };
    return labels[mode];
  };

  const getLogClassName = (level: LogEntry['level']): string => {
    return `log-entry log-${level}`;
  };

  const getLogLevelDisplay = (level: LogEntry['level']): string => {
    const displays: Record<LogEntry['level'], string> = {
      info: 'INFO',
      warn: 'WARN',
      error: 'ERRO',
      success: 'OKAY',
    };
    return displays[level];
  };

  return (
    <div className="firmware-downloader">
      <div className="fd-row">
        <div className="fd-section fd-section-firmware">
          <div className="fd-section-header">
            <h3>固件选择</h3>
            <button
              onClick={handleOpenFile}
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

        <div className="fd-section fd-section-device">
          <div className="fd-section-header">
            <h3>设备列表</h3>
            <button
              onClick={handleScanDevices}
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
                  onClick={() => !isFlashing && setSelectedDevice(device)}
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
      </div>

      <div className="fd-row fd-row-main">
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
                  onChange={() => setFlashMode(mode)}
                  disabled={isFlashing}
                />
                <span className="fd-radio-label">{getModeLabel(mode)}</span>
              </label>
            ))}
          </div>

          <div className="fd-partition-selector">
            <h4>{flashMode === 'partition' ? '选择需要烧录的分区' : '将要烧录分区'}</h4>
            <div className="fd-partition-list">
              {partitions.filter(p => p.downloadfile).length > 0 ? (
                partitions.filter(p => p.downloadfile).map((partition, index) => (
                  <div
                    key={index}
                    className={`fd-partition-item ${flashMode === 'partition' && selectedPartitions.includes(partition.name) ? 'fd-partition-selected' : ''}`}
                    onClick={flashMode === 'partition' && !isFlashing ? () => handlePartitionToggle(partition.name) : undefined}
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

        <div className="fd-right-column">
          <div className="fd-row fd-row-top">
            <div className="fd-section fd-section-options">
              <h3>功能配置</h3>
              <div className="fd-checkbox-group">
                <label className="fd-checkbox-item">
                  <input
                    type="checkbox"
                    checked={reloadImage}
                    onChange={(e) => setReloadImage(e.target.checked)}
                    disabled={isFlashing}
                  />
                  <span className="fd-checkbox-label">每次烧写重新读取镜像</span>
                </label>
                <label className="fd-checkbox-item">
                  <input
                    type="checkbox"
                    checked={autoFlash}
                    onChange={(e) => setAutoFlash(e.target.checked)}
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
                onClick={isFlashing ? handleCancelFlash : handleStartFlash}
                disabled={!isFlashing && (!selectedDevice || !imagePath || !isDeviceReady(selectedDevice))}
                className={`fd-button fd-button-large ${isFlashing ? 'fd-button-danger' : 'fd-button-success'}`}
              >
                {isFlashing ? '取消烧写' : '开始烧写'}
              </button>
            </div>
          </div>

          <div className="fd-section fd-section-log">
            <h3>烧录日志</h3>
            <div className="fd-log-container" ref={logContainerRef}>
              {logs.length === 0 ? (
                <div className="fd-empty-state">
                  <span>暂无日志</span>
                </div>
              ) : (
                logs.map((log, index) => (
                  <div key={index} className={getLogClassName(log.level)}>
                    <span className="log-time">[{formatLogTime(log.timestamp)}]</span>
                    <span className="log-level">[{getLogLevelDisplay(log.level)}]</span>
                    <span className="log-message">{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FirmwareDownloader;
