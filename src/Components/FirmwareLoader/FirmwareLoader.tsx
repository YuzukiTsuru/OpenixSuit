import React, { useState, useCallback } from 'react';
import { open, save } from '@tauri-apps/plugin-dialog';
import { readFile, writeFile } from '@tauri-apps/plugin-fs';
import { message } from '@tauri-apps/plugin-dialog';
import { OpenixPacker, OpenixPartition, ImageInfo, Partition, FileInfo } from '../../Library/OpenixIMG';
import './FirmwareLoader.css';

interface FirmwareLoaderProps {
  onPartitionData?: (partitionName: string, data: Uint8Array) => void;
  onImageLoaded?: (info: ImageInfo) => void;
}

export const FirmwareLoader: React.FC<FirmwareLoaderProps> = ({ onPartitionData, onImageLoaded }) => {
  const [imageInfo, setImageInfo] = useState<ImageInfo | null>(null);
  const [partitions, setPartitions] = useState<Partition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filePath, setFilePath] = useState<string | null>(null);

  const packer = React.useRef(new OpenixPacker());
  const partitionParser = React.useRef(new OpenixPartition());

  const handleOpenFile = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setImageInfo(null);
      setPartitions([]);
      setFilePath(null);
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
          setError('该镜像已加密，不支持解析加密镜像');
        } else {
          setError('无法加载镜像文件');
        }
        setLoading(false);
        return;
      }

      const info = packer.current.getImageInfo();
      setImageInfo(info);
      onImageLoaded?.(info!);

      const partitionFileData = packer.current.getFileDataByFilename('sys_partition.bin');
      if (partitionFileData) {
        partitionParser.current.parseFromData(partitionFileData);
        setPartitions(partitionParser.current.getPartitions());
      } else {
        const partitionFexData = packer.current.getFileDataByFilename('sys_partition.fex');
        if (partitionFexData) {
          partitionParser.current.parseFromData(partitionFexData);
          setPartitions(partitionParser.current.getPartitions());
        } else {
          setPartitions([]);
        }
      }

      const configFileData = packer.current.getFileDataByFilename('image.cfg');
      if (configFileData) {
        console.log('Config file found, size:', configFileData.length);
      }

      setLoading(false);
    } catch (err) {
      setError(`加载文件失败: ${err}`);
      setLoading(false);
    }
  }, [onImageLoaded]);

  const handleExtractPartition = useCallback(
    async (partition: Partition) => {
      if (!partition.downloadfile) {
        setError(`分区 ${partition.name} 没有关联的下载文件`);
        return;
      }

      const data = packer.current.getFileDataByFilename(partition.downloadfile);
      if (!data) {
        setError(`无法提取分区 ${partition.name} 的数据`);
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
        await message(`文件已保存到: ${savePath}`, { title: '保存完成', kind: 'info' });
      } catch (err) {
        setError(`保存文件失败: ${err}`);
      }
    },
    [onPartitionData]
  );

  const handleExtractFile = useCallback(
    async (file: FileInfo) => {
      const data = packer.current.getFileDataByFilename(file.filename);
      if (!data) {
        setError(`无法提取文件 ${file.filename} 的数据`);
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
        await message(`文件已保存到: ${savePath}`, { title: '保存完成', kind: 'info' });
      } catch (err) {
        setError(`保存文件失败: ${err}`);
      }
    },
    [onPartitionData]
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
        <h2>打开镜像文件</h2>
        <button onClick={handleOpenFile} disabled={loading} className="open-button">
          {loading ? '加载中...' : '打开镜像文件'}
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}

      {filePath && (
        <div className="file-path">
          <strong>文件路径:</strong> <span>{filePath}</span>
        </div>
      )}

      {imageInfo && (
        <div className="image-info">
          <h3>镜像信息</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="label">完整镜像大小:</span>
              <span className="value">{formatSize(imageInfo.header.image_size)}</span>
            </div>
            <div className="info-item">
              <span className="label">逻辑分区大小:</span>
              <span className="value">{getPartitionsTotalSize()}</span>
            </div>
            <div className="info-item">
              <span className="label">文件数量:</span>
              <span className="value">{imageInfo.files.length}</span>
            </div>
            <div className="info-item">
              <span className="label">加密镜像:</span>
              <span className="value">{checkImageEncrypt() ? '是' : '否'}</span>
            </div>
          </div>
        </div>
      )}

      {partitions.length > 0 && (
        <div className="partitions-section">
          <h3>分区表</h3>
          <table className="partitions-table">
            <thead>
              <tr>
                <th>名称</th>
                <th>大小 (扇区)</th>
                <th>大小 (字节)</th>
                <th>下载文件</th>
                <th>用户类型</th>
                <th>标志</th>
                <th>操作</th>
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
                        提取
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="flags-legend">
            <span>K = KeyData</span>
            <span>E = Encrypt</span>
            <span>V = Verify</span>
            <span>R = Read-Only</span>
            <span>- = None</span>
          </div>
        </div>
      )}

      {imageInfo && imageInfo.files.length > 0 && (
        <div className="files-section">
          <h3>二进制打包文件列表</h3>
          <table className="files-table">
            <thead>
              <tr>
                <th>文件名</th>
                <th>主类型</th>
                <th>子类型</th>
                <th>功能</th>
                <th>原始大小</th>
                <th>存储大小</th>
                <th>操作</th>
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
                      提取
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
