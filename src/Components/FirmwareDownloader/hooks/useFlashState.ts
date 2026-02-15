import { useState, useCallback, useEffect } from 'react';
import { flashManager } from '../FlashManager';
import { FlashProgress, LogEntry, FlashDevice, FlashOptions } from '../Types';
import { FlashMode, PostFlashAction } from '../../../Devices';
import { AppSettings } from '../../../Settings/settingsStore';

export function useFlashState(
  addLog: (level: LogEntry['level'], message: string) => void,
  selectedDevice: FlashDevice | null,
  imagePath: string | null,
  imageInfo: { header: { image_size: number } } | null,
  isDeviceReady: (device: FlashDevice | null) => boolean,
  settings: AppSettings | null
) {
  const [flashMode, setFlashMode] = useState<FlashMode>(settings?.defaultFlashMode ?? 'keep_data');
  const [selectedPartitions, setSelectedPartitions] = useState<string[]>([]);
  const [verifyDownload, setVerifyDownload] = useState(settings?.verifyDownload ?? true);
  const [postFlashAction, setPostFlashAction] = useState<PostFlashAction>(settings?.postFlashAction ?? 'reboot');
  const [isFlashing, setIsFlashing] = useState(false);
  const [progress, setProgress] = useState<FlashProgress | null>(null);

  useEffect(() => {
    if (settings) {
      setFlashMode(settings.defaultFlashMode);
      setVerifyDownload(settings.verifyDownload);
      setPostFlashAction(settings.postFlashAction);
    }
  }, [settings]);

  useEffect(() => {
    const unsubProgress = flashManager.onProgress((p) => setProgress(p));

    const unsubLog = flashManager.onLog((log) => {
      addLog(log.level, log.message);
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
  }, [addLog]);

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
      verifyDownload,
      postFlashAction,
    };

    try {
      await flashManager.start(selectedDevice, imagePath, options);
    } catch (err) {
      addLog('error', `烧写失败: ${err}`);
      setIsFlashing(false);
    }
  }, [selectedDevice, imagePath, imageInfo, flashMode, selectedPartitions, verifyDownload, postFlashAction, addLog, isDeviceReady]);

  const handleCancelFlash = useCallback(() => {
    flashManager.cancel();
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

  return {
    flashMode,
    setFlashMode,
    selectedPartitions,
    setSelectedPartitions,
    verifyDownload,
    setVerifyDownload,
    postFlashAction,
    setPostFlashAction,
    isFlashing,
    setIsFlashing,
    progress,
    setProgress,
    handleStartFlash,
    handleCancelFlash,
    handlePartitionToggle,
  };
}
