import { useState, useCallback, useEffect } from 'react';
import { flashManager } from '../FlashManager';
import { FlashProgress, LogEntry, FlashDevice, FlashOptions } from '../Types';
import { FlashMode, PostFlashAction, hotPlugManager } from '../../../Devices';
import { AppSettings } from '../../../Settings/settingsStore';
import { PopupType } from '../../../CoreUI';

export function useFlashState(
  addLog: (level: LogEntry['level'], message: string) => void,
  selectedDevice: FlashDevice | null,
  imagePath: string | null,
  imageInfo: { header: { image_size: number } } | null,
  isDeviceReady: (device: FlashDevice | null) => boolean,
  settings: AppSettings | null,
  showPopup: (type: PopupType, title: string, message: string) => void
) {
  const [flashMode, setFlashMode] = useState<FlashMode>(settings?.defaultFlashMode ?? 'keep_data');
  const [selectedPartitions, setSelectedPartitions] = useState<string[]>([]);
  const [verifyDownload, setVerifyDownload] = useState(settings?.verifyDownload ?? true);
  const [postFlashAction, setPostFlashAction] = useState<PostFlashAction>(settings?.postFlashAction ?? 'reboot');
  const [isFlashing, setIsFlashing] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [progress, setProgress] = useState<FlashProgress | null>(null);

  useEffect(() => {
    if (settings) {
      setFlashMode(settings.defaultFlashMode);
      setVerifyDownload(settings.verifyDownload);
      setPostFlashAction(settings.postFlashAction);
    }
  }, [settings]);

  useEffect(() => {
    if (!selectedDevice) {
      setProgress(null);
      setIsFlashing(false);
      setIsCancelling(false);
    }
  }, [selectedDevice]);

  useEffect(() => {
    const unsubProgress = flashManager.onProgress((p) => setProgress(p));

    const unsubLog = flashManager.onLog((log) => {
      addLog(log.level, log.message);
    });

    const unsubComplete = flashManager.onComplete((success) => {
      setIsFlashing(false);
      setIsCancelling(false);
      hotPlugManager.resume();
      if (success) {
        setProgress((p) => p ? { ...p, percent: 100, stage: '烧写完成' } : null);
      } else {
        setProgress(null);
      }
    });

    const unsubShowPopup = flashManager.onShowPopup((type, title, message) => {
      showPopup(type, title, message);
    });

    return () => {
      unsubProgress();
      unsubLog();
      unsubComplete();
      unsubShowPopup();
    };
  }, [addLog, showPopup]);

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
    setIsCancelling(false);
    setProgress({ percent: 0, stage: '准备烧写...' });

    hotPlugManager.pause();

    const options: FlashOptions = {
      mode: flashMode,
      partitions: flashMode === 'partition' ? selectedPartitions : undefined,
      verifyDownload,
      postFlashAction,
    };

    try {
      await flashManager.start(selectedDevice, imagePath, options);
    } catch {
      setIsFlashing(false);
      setIsCancelling(false);
      hotPlugManager.resume();
    }
  }, [selectedDevice, imagePath, imageInfo, flashMode, selectedPartitions, verifyDownload, postFlashAction, addLog, isDeviceReady]);

  const handleCancelFlash = useCallback(() => {
    setIsCancelling(true);
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
    isCancelling,
    progress,
    setProgress,
    handleStartFlash,
    handleCancelFlash,
    handlePartitionToggle,
  };
}
