import React, { useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { open, save, message } from '@tauri-apps/plugin-dialog';
import { readFile, writeFile } from '@tauri-apps/plugin-fs';
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
import './FirmwareLoader.css';

interface FirmwareLoaderProps {
  onPartitionData?: (partitionName: string, data: Uint8Array) => void;
  onImageLoaded?: (info: ImageInfo) => void;
}

export const FirmwareLoader: React.FC<FirmwareLoaderProps> = ({ onPartitionData, onImageLoaded }) => {
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

      const fileData = await readFile(path);
      const arrayBuffer = fileData.buffer;

      const success = packer.current.loadImage(arrayBuffer);

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

      const partitionFileData = getPartitionData(packer.current);
      if (partitionFileData) {
        partitionParser.current.parseFromData(partitionFileData);
        setPartitions(partitionParser.current.getPartitions());
      } else {
        setPartitions([]);
      }

      const configFileData = packer.current.getFileDataByFilename('image.cfg');
      if (configFileData) {
        console.log('Config file found, size:', configFileData.length);
      }

      const boot0Data = getFes(packer.current);
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

      const ubootData = getUboot(packer.current);
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

      const mbrData = getMbr(packer.current);
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

      const sysConfigData = getSysConfig(packer.current);
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

      const data = packer.current.getFileDataByFilename(partition.downloadfile);
      if (!data) {
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
        await writeFile(savePath, data);
        onPartitionData?.(partition.name, data);
        await message(t('firmwareLoader.errors.saved', { path: savePath }), { title: t('firmwareLoader.errors.saveComplete'), kind: 'info' });
      } catch (err) {
        setError(`${t('firmwareLoader.errors.saveFailed')} ${err}`);
      }
    },
    [onPartitionData, t]
  );

  const handleExtractFile = useCallback(
    async (file: FileInfo) => {
      const data = packer.current.getFileDataByFilename(file.filename);
      if (!data) {
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
        await writeFile(savePath, data);
        onPartitionData?.(file.filename, data);
        await message(t('firmwareLoader.errors.saved', { path: savePath }), { title: t('firmwareLoader.errors.saveComplete'), kind: 'info' });
      } catch (err) {
        setError(`${t('firmwareLoader.errors.saveFailed')} ${err}`);
      }
    },
    [onPartitionData, t]
  );

  const formatSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const getFunctionBySubtype = (subtype: string): string => {
    return packer.current.getFunctionBySubtype(subtype) || '-';
  };

  const getPartitionsTotalSize = (): string => {
    return formatSize(partitions.reduce((total, partition) => total + partition.size, 0) * 512);
  };

  const checkImageEncrypt = (): boolean => {
    return packer.current.isEncryptedImage();
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
        <div className="image-info">
          <h3>{t('firmwareLoader.imageInfo.title')}</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="label">{t('firmwareLoader.imageInfo.fullSize')}</span>
              <span className="value">{formatSize(imageInfo.header.image_size)}</span>
            </div>
            <div className="info-item">
              <span className="label">{t('firmwareLoader.imageInfo.partitionSize')}</span>
              <span className="value">{getPartitionsTotalSize()}</span>
            </div>
            <div className="info-item">
              <span className="label">{t('firmwareLoader.imageInfo.fileCount')}</span>
              <span className="value">{imageInfo.files.length}</span>
            </div>
            <div className="info-item">
              <span className="label">{t('firmwareLoader.imageInfo.encrypted')}</span>
              <span className="value">{checkImageEncrypt() ? t('common.yes') : t('common.no')}</span>
            </div>
          </div>
        </div>
      )}

      {sysConfig && (
        <div className="sysconfig-info">
          <h3>{t('firmwareLoader.sysConfig.title')}</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="label">{t('firmwareLoader.sysConfig.debugPrint')}</span>
              <span className="value">{sysConfig.debug_mode > 0 ? t('common.yes') : t('common.no')}</span>
            </div>
            <div className="info-item">
              <span className="label">{t('firmwareLoader.sysConfig.storageType')}</span>
              <span className="value">
                {SunxiSysConfigParser.getStorageType(sysConfig)}
              </span>
            </div>
            <div className="info-item">
              <span className="label">{t('firmwareLoader.sysConfig.i2cPort')}</span>
              <span className="value">{sysConfig.twi_para.twi_port}</span>
            </div>
            <div className="info-item">
              <span className="label">{t('firmwareLoader.sysConfig.uartPort')}</span>
              <span className="value">{sysConfig.uart_para.uart_debug_port}</span>
            </div>
          </div>
          {sysConfig.twi_para.twi_scl && (
            <div className="twi-info">
              <h4>{t('firmwareLoader.sysConfig.i2cConfig')}</h4>
              <div className="info-grid">
                <div className="info-item">
                  <span className="label">{t('firmwareLoader.sysConfig.sclPin')}</span>
                  <span className="value">
                    {sysConfig.twi_para.twi_scl.port}
                    {sysConfig.twi_para.twi_scl.bank}
                    {sysConfig.twi_para.twi_scl.pin}
                  </span>
                </div>
                <div className="info-item">
                  <span className="label">{t('firmwareLoader.sysConfig.sdaPin')}</span>
                  <span className="value">
                    {sysConfig.twi_para.twi_sda?.port}
                    {sysConfig.twi_para.twi_sda?.bank}
                    {sysConfig.twi_para.twi_sda?.pin || '-'}
                  </span>
                </div>
              </div>
            </div>
          )}
          {sysConfig.uart_para.uart_debug_tx && (
            <div className="uart-info">
              <h4>{t('firmwareLoader.sysConfig.uartConfig')}</h4>
              <div className="info-grid">
                <div className="info-item">
                  <span className="label">{t('firmwareLoader.sysConfig.baudRate')}</span>
                  <span className="value">
                    {sysConfig.uart_para.uart_baud_rate}
                  </span>
                </div>
                <div className="info-item">
                  <span className="label">{t('firmwareLoader.sysConfig.txPin')}</span>
                  <span className="value">
                    {sysConfig.uart_para.uart_debug_tx.port}
                    {sysConfig.uart_para.uart_debug_tx.bank}
                    {sysConfig.uart_para.uart_debug_tx.pin}
                  </span>
                </div>
                <div className="info-item">
                  <span className="label">{t('firmwareLoader.sysConfig.rxPin')}</span>
                  <span className="value">
                    {sysConfig.uart_para.uart_debug_rx?.port}
                    {sysConfig.uart_para.uart_debug_rx?.bank}
                    {sysConfig.uart_para.uart_debug_rx?.pin || '-'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      {boot0Header && (
        <div className="boot0-info">
          <h3>{t('firmwareLoader.boot0.title')}</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="label">{t('firmwareLoader.boot0.magic')}</span>
              <span className="value">{boot0Header.magic}</span>
            </div>
            <div className="info-item">
              <span className="label">{t('firmwareLoader.boot0.length')}</span>
              <span className="value">{formatSize(boot0Header.length)}</span>
            </div>
            <div className="info-item">
              <span className="label">{t('firmwareLoader.boot0.runAddr')}</span>
              <span className="value">0x{boot0Header.run_addr.toString(16).toUpperCase()}</span>
            </div>
            <div className="info-item">
              <span className="label">{t('firmwareLoader.boot0.retAddr')}</span>
              <span className="value">0x{boot0Header.ret_addr.toString(16).toUpperCase()}</span>
            </div>
            <div className="info-item">
              <span className="label">{t('firmwareLoader.boot0.platform')}</span>
              <span className="value">{boot0Header.platform}</span>
            </div>
            <div className="info-item">
              <span className="label">{t('firmwareLoader.boot0.checksum')}</span>
              <span className="value">0x{boot0Header.check_sum.toString(16).toUpperCase()}</span>
            </div>
          </div>
        </div>
      )}

      {ubootHeader && (
        <div className="uboot-info">
          <h3>{t('firmwareLoader.uboot.title')}</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="label">{t('firmwareLoader.uboot.magic')}</span>
              <span className="value">{ubootHeader.uboot_head.magic}</span>
            </div>
            <div className="info-item">
              <span className="label">{t('firmwareLoader.uboot.version')}</span>
              <span className="value">{ubootHeader.uboot_head.version}</span>
            </div>
            <div className="info-item">
              <span className="label">{t('firmwareLoader.uboot.length')}</span>
              <span className="value">{formatSize(ubootHeader.uboot_head.length)}</span>
            </div>
            <div className="info-item">
              <span className="label">{t('firmwareLoader.uboot.runAddr')}</span>
              <span className="value">0x{ubootHeader.uboot_head.run_addr.toString(16).toUpperCase()}</span>
            </div>
            <div className="info-item">
              <span className="label">{t('firmwareLoader.uboot.platform')}</span>
              <span className="value">{ubootHeader.uboot_head.platform}</span>
            </div>
            <div className="info-item">
              <span className="label">{t('firmwareLoader.uboot.workMode')}</span>
              <span className="value">0x{ubootHeader.uboot_data.work_mode.toString(16).toUpperCase()}</span>
            </div>
          </div>
        </div>
      )}

      {mbrInfo && (
        <div className="mbr-info">
          <h3>{t('firmwareLoader.mbr.title')}</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="label">{t('firmwareLoader.mbr.magic')}</span>
              <span className="value">{mbrInfo.magic}</span>
            </div>
            <div className="info-item">
              <span className="label">{t('firmwareLoader.mbr.version')}</span>
              <span className="value">0x{mbrInfo.version.toString(16).toUpperCase()}</span>
            </div>
            <div className="info-item">
              <span className="label">{t('firmwareLoader.mbr.partitionCount')}</span>
              <span className="value">{mbrInfo.partCount}</span>
            </div>
            <div className="info-item">
              <span className="label">{t('firmwareLoader.mbr.crc32')}</span>
              <span className="value">0x{mbrInfo.crc32.toString(16).toUpperCase()}</span>
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
                      <td>0x{part.address.toString(16).toUpperCase()}</td>
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
      )}

      {partitions.length > 0 && (
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
                  <td>0x{partition.user_type.toString(16)}</td>
                  <td>
                    {partition.keydata && 'K'}
                    {partition.encrypt && 'E'}
                    {partition.verify && 'V'}
                    {partition.ro && 'R'}
                    {!partition.keydata && !partition.encrypt && !partition.verify && !partition.ro && '-'}
                  </td>
                  <td>
                    {partition.downloadfile && (
                      <button onClick={() => handleExtractPartition(partition)} className="extract-button">
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
      )}

      {imageInfo && imageInfo.files.length > 0 && (
        <div className="files-section">
          <h3>{t('firmwareLoader.fileList.title')}</h3>
          <table className="files-table">
            <thead>
              <tr>
                <th>{t('firmwareLoader.fileList.filename')}</th>
                <th>{t('firmwareLoader.fileList.mainType')}</th>
                <th>{t('firmwareLoader.fileList.subType')}</th>
                <th>{t('firmwareLoader.fileList.function')}</th>
                <th>{t('firmwareLoader.fileList.originalSize')}</th>
                <th>{t('firmwareLoader.fileList.storedSize')}</th>
                <th>{t('firmwareLoader.fileList.action')}</th>
              </tr>
            </thead>
            <tbody>
              {imageInfo.files.map((file, index) => (
                <tr key={index}>
                  <td>{file.filename || '-'}</td>
                  <td>{file.maintype}</td>
                  <td>{file.subtype}</td>
                  <td>{getFunctionBySubtype(file.subtype)}</td>
                  <td>{formatSize(file.originalLength)}</td>
                  <td>{formatSize(file.storedLength)}</td>
                  <td>
                    <button onClick={() => handleExtractFile(file)} className="extract-button">
                      {t('common.extract')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default FirmwareLoader;
