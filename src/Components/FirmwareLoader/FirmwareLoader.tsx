import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { open, save, message } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';
import {
  OpenixPacker,
  OpenixPartition,
  ImageInfo,
  Partition,
  FileInfo,
  getFes,
  getUboot,
  getMbr,
  getSysConfig,
  getPartitionData
} from '../../Library/OpenixIMG';
import {
  Boot0Header,
  UBootHeaderParser,
  SunxiMbrParser,
  SunxiSysConfigParser,
  BootFileHead,
  UBootHead,
  MbrInfo,
  SysConfig,
} from '../../FlashConfig';
import {
  ImageInfoSection,
  SysConfigSection,
  Boot0Section,
  UBootSection,
  MbrSection,
  PartitionTableSection,
  FileListSection,
} from './Components';
import './FirmwareLoader.css';

interface ExtractResult {
  success: boolean;
  message: string;
  bytes_written: number;
}

interface FirmwareLoaderProps {
  onImageLoaded?: (info: ImageInfo) => void;
}

export const FirmwareLoader: React.FC<FirmwareLoaderProps> = ({ onImageLoaded }) => {
  const { t } = useTranslation();
  const [imageInfo, setImageInfo] = useState<ImageInfo | null>(null);
  const [partitions, setPartitions] = useState<Partition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filePath, setFilePath] = useState<string | null>(null);
  const [boot0Header, setBoot0Header] = useState<BootFileHead | null>(null);
  const [ubootHeader, setUbootHeader] = useState<UBootHead | null>(null);
  const [mbrInfo, setMbrInfo] = useState<MbrInfo | null>(null);
  const [sysConfig, setSysConfig] = useState<SysConfig | null>(null);

  const packer = React.useRef(new OpenixPacker());
  const partitionParser = React.useRef(new OpenixPartition());

  const handleOpenFile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setImageInfo(null);
      setPartitions([]);
      setFilePath(null);
      setBoot0Header(null);
      setUbootHeader(null);
      setMbrInfo(null);
      setSysConfig(null);

      partitionParser.current.clear();

      const selected = await open({
        multiple: false,
        filters: [
          {
            name: 'Image Files',
            extensions: ['img', 'bin'],
          },
        ],
      });

      if (!selected) {
        setLoading(false);
        return;
      }

      const path = selected as string;
      setFilePath(path);

      const success = await packer.current.loadImageFromPath(path);

      if (!success) {
        if (packer.current.isEncryptedImage()) {
          setError(t('firmwareLoader.errors.encrypted'));
        } else {
          setError(t('firmwareLoader.errors.loadFailed'));
        }
        setLoading(false);
        return;
      }

      const info = packer.current.getImageInfo();
      setImageInfo(info);
      onImageLoaded?.(info!);

      const partitionFileData = await getPartitionData(packer.current);
      if (partitionFileData) {
        partitionParser.current.parseFromData(partitionFileData);
        setPartitions(partitionParser.current.getPartitions());
      } else {
        setPartitions([]);
      }

      const configFileData = await packer.current.getFileDataByFilename('image.cfg');
      if (configFileData) {
        console.log('Config file found, size:', configFileData.length);
      }

      const boot0Data = await getFes(packer.current);
      if (boot0Data) {
        try {
          const header = Boot0Header.parse(boot0Data);
          setBoot0Header(header);
          console.log('Boot0 header parsed successfully:', header);
        } catch (err) {
          console.log('Failed to parse Boot0 header:', err);
        }
      } else {
        console.log('fes.fex not found');
      }

      const ubootData = await getUboot(packer.current);
      if (ubootData) {
        try {
          const header = UBootHeaderParser.parse(ubootData);
          setUbootHeader(header);
          console.log('U-Boot header parsed successfully:', header);
        } catch (err) {
          console.log('Failed to parse U-Boot header:', err);
        }
      } else {
        console.log('u-boot.fex not found');
      }

      const mbrData = await getMbr(packer.current);
      if (mbrData) {
        try {
          const mbr = SunxiMbrParser.parse(mbrData);
          const info = SunxiMbrParser.toMbrInfo(mbr);
          setMbrInfo(info);
          console.log('MBR parsed successfully:', info);
        } catch (err) {
          console.log('Failed to parse MBR:', err);
        }
      } else {
        console.log('sunxi_mbr.fex not found');
      }

      const sysConfigData = await getSysConfig(packer.current);
      if (sysConfigData) {
        try {
          const config = SunxiSysConfigParser.parse(sysConfigData);
          setSysConfig(config);
          console.log('SysConfig parsed successfully:', config);
        } catch (err) {
          console.log('Failed to parse SysConfig:', err);
        }
      } else {
        console.log('sys_config.fex not found');
      }
      setLoading(false);
    } catch (err) {
      setError(`${t('firmwareLoader.errors.fileLoadFailed')} ${err}`);
      setLoading(false);
    }
  }, [onImageLoaded, t]);

  const handleExtractPartition = useCallback(
    async (partition: Partition) => {
      if (!partition.downloadfile) {
        setError(t('firmwareLoader.errors.noDownloadFile', { name: partition.name }));
        return;
      }

      if (!filePath) {
        setError(t('firmwareLoader.errors.loadFailed'));
        return;
      }

      const fileInfo = packer.current.getFileInfoByFilename(partition.downloadfile);
      if (!fileInfo) {
        setError(t('firmwareLoader.errors.extractFailed', { name: partition.name }));
        return;
      }

      let defaultName = partition.downloadfile;
      if (!defaultName.toLowerCase().endsWith('.fex')) {
        defaultName = defaultName.replace(/\.[^.]+$/, '') + '.fex';
      }

      const savePath = await save({
        defaultPath: defaultName,
        filters: [
          {
            name: 'FEX Files',
            extensions: ['fex'],
          },
        ],
      });

      if (!savePath) {
        return;
      }

      try {
        const result = await invoke<ExtractResult>('extract_file_chunked', {
          sourcePath: filePath,
          destPath: savePath,
          offset: fileInfo.offset,
          length: fileInfo.length,
        });

        if (result.success) {
          await message(
            t('firmwareLoader.errors.saved', { path: savePath }),
            { title: t('firmwareLoader.errors.saveComplete'), kind: 'info' }
          );
        } else {
          setError(result.message);
        }
      } catch (err) {
        setError(`${t('firmwareLoader.errors.saveFailed')} ${err}`);
      }
    },
    [filePath, t]
  );

  const handleExtractFile = useCallback(
    async (file: FileInfo) => {
      if (!filePath) {
        setError(t('firmwareLoader.errors.loadFailed'));
        return;
      }

      const fileInfo = packer.current.getFileInfoByFilename(file.filename);
      if (!fileInfo) {
        setError(t('firmwareLoader.errors.extractFileFailed', { filename: file.filename }));
        return;
      }

      let defaultName = file.filename.replace(/^\//, '');
      if (!defaultName.toLowerCase().endsWith('.fex')) {
        defaultName = defaultName.replace(/\.[^.]+$/, '') + '.fex';
      }

      const savePath = await save({
        defaultPath: defaultName,
        filters: [
          {
            name: 'FEX Files',
            extensions: ['fex'],
          },
        ],
      });

      if (!savePath) {
        return;
      }

      try {
        const result = await invoke<ExtractResult>('extract_file_chunked', {
          sourcePath: filePath,
          destPath: savePath,
          offset: fileInfo.offset,
          length: fileInfo.length,
        });

        if (result.success) {
          await message(
            t('firmwareLoader.errors.saved', { path: savePath }),
            { title: t('firmwareLoader.errors.saveComplete'), kind: 'info' }
          );
        } else {
          setError(result.message);
        }
      } catch (err) {
        setError(`${t('firmwareLoader.errors.saveFailed')} ${err}`);
      }
    },
    [filePath, t]
  );

  const getFunctionBySubtype = (subtype: string): string => {
    return packer.current.getFunctionBySubtype(subtype) || '-';
  };

  return (
    <div className="firmware-loader">
      <div className="firmware-loader-header">
        <h2>{t('firmwareLoader.openImage')}</h2>
        <button onClick={handleOpenFile} disabled={loading} className="open-button">
          {loading ? t('common.loading') : t('firmwareLoader.openImage')}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {filePath && (
        <div className="file-path">
          <strong>{t('firmwareLoader.filePath')}</strong> <span>{filePath}</span>
        </div>
      )}

      {imageInfo && (
        <ImageInfoSection
          imageInfo={imageInfo}
          partitions={partitions}
          isEncrypted={packer.current.isEncryptedImage()}
        />
      )}

      {sysConfig && <SysConfigSection sysConfig={sysConfig} />}

      {boot0Header && <Boot0Section boot0Header={boot0Header} />}

      {ubootHeader && <UBootSection ubootHeader={ubootHeader} />}

      {mbrInfo && <MbrSection mbrInfo={mbrInfo} />}

      {partitions.length > 0 && (
        <PartitionTableSection
          partitions={partitions}
          onExtract={handleExtractPartition}
        />
      )}

      {imageInfo && imageInfo.files.length > 0 && (
        <FileListSection
          files={imageInfo.files}
          getFunctionBySubtype={getFunctionBySubtype}
          onExtract={handleExtractFile}
        />
      )}
    </div>
  );
};

export default FirmwareLoader;
