import { useState, useCallback, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { open } from '@tauri-apps/plugin-dialog';
import { readFile } from '@tauri-apps/plugin-fs';
import { OpenixPacker, ImageInfo, Partition, getPartitionData, getSysConfig } from '../../../Library/OpenixIMG';
import { OpenixPartition } from '../../../Library/OpenixIMG';
import { SunxiSysConfigParser, SysConfig } from '../../../FlashConfig';
import { LogEntry } from '../Types';
import { AppSettings, saveSettings } from '../../../Settings/settingsStore';

export function useImageLoader(
  addLog: (level: LogEntry['level'], message: string) => void,
  settings: AppSettings | null
) {
  const { t } = useTranslation();
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [imageInfo, setImageInfo] = useState<ImageInfo | null>(null);
  const [partitions, setPartitions] = useState<Partition[]>([]);
  const [loading, setLoading] = useState(false);
  const [sysConfig, setSysConfig] = useState<SysConfig | null>(null);
  const packer = useRef(new OpenixPacker());
  const hasAutoLoaded = useRef(false);

  const loadImage = useCallback(async (path: string): Promise<boolean> => {
    try {
      setLoading(true);
      setSysConfig(null);
      setImageInfo(null);
      setPartitions([]);

      const fileData = await readFile(path);
      const success = packer.current.loadImage(fileData.buffer);

      if (!success) {
        addLog('error', t('imageLoader.loadFailed'));
        setLoading(false);
        return false;
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
          addLog('error', t('imageLoader.parseSysConfigFailed', { error: err }));
        }
      }

      setImagePath(path);
      addLog('success', t('imageLoader.loaded', { path }));
      setLoading(false);
      return true;
    } catch (err) {
      addLog('error', t('imageLoader.fileLoadFailed', { error: err }));
      setLoading(false);
      return false;
    }
  }, [addLog, t]);

  useEffect(() => {
    if (settings?.rememberLastImage && settings.lastImagePath && !hasAutoLoaded.current) {
      hasAutoLoaded.current = true;
      loadImage(settings.lastImagePath);
    } else if (settings && !settings.rememberLastImage) {
      hasAutoLoaded.current = true;
    }
  }, [settings, loadImage]);

  const handleOpenFile = useCallback(async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [
          { name: 'Image Files', extensions: ['img', 'bin'] },
        ],
      });

      if (!selected) {
        return;
      }

      const path = selected as string;
      const success = await loadImage(path);

      if (success && settings?.rememberLastImage) {
        await saveSettings({ ...settings, lastImagePath: path });
      }
    } catch (err) {
      addLog('error', t('imageLoader.openFileFailed', { error: err }));
    }
  }, [addLog, loadImage, settings, t]);

  const resetPartitions = useCallback(() => {
    setPartitions([]);
  }, []);

  return {
    imagePath,
    setImagePath,
    imageInfo,
    partitions,
    loading,
    sysConfig,
    packer,
    handleOpenFile,
    resetPartitions,
  };
}
