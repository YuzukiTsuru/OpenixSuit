import { useState, useCallback, useRef, useEffect } from 'react';
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
        addLog('error', '无法加载镜像文件');
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
          addLog('error', `解析系统配置失败: ${err}`);
        }
      }

      setImagePath(path);
      addLog('success', `已加载镜像: ${path}`);
      setLoading(false);
      return true;
    } catch (err) {
      addLog('error', `加载文件失败: ${err}`);
      setLoading(false);
      return false;
    }
  }, [addLog]);

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
      addLog('error', `打开文件失败: ${err}`);
    }
  }, [addLog, loadImage, settings]);

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
