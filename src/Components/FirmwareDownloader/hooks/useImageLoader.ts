import { useState, useCallback, useRef } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { readFile } from '@tauri-apps/plugin-fs';
import { OpenixPacker, ImageInfo, Partition, getPartitionData, getSysConfig } from '../../../Library/OpenixIMG';
import { OpenixPartition } from '../../../Library/OpenixIMG';
import { SunxiSysConfigParser, SysConfig } from '../../../FlashConfig';
import { LogEntry } from '../Types';

export function useImageLoader(addLog: (level: LogEntry['level'], message: string) => void) {
  const [imagePath, setImagePath] = useState<string | null>(null);
  const [imageInfo, setImageInfo] = useState<ImageInfo | null>(null);
  const [partitions, setPartitions] = useState<Partition[]>([]);
  const [loading, setLoading] = useState(false);
  const [sysConfig, setSysConfig] = useState<SysConfig | null>(null);
  const packer = useRef(new OpenixPacker());

  const handleOpenFile = useCallback(async () => {
    try {
      setLoading(true);
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
          addLog('error', `解析系统配置失败: ${err}`);
        }
      }

      addLog('success', `已加载镜像: ${path}`);
      setLoading(false);
    } catch (err) {
      addLog('error', `加载文件失败: ${err}`);
      setLoading(false);
    }
  }, [addLog]);

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
