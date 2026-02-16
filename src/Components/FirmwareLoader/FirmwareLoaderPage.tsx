import React from 'react';
import { FirmwareLoader } from '../FirmwareLoader';
import { PageContainer } from '../../CoreUI';

interface FirmwareLoaderPageProps {
  onPartitionData?: (partitionName: string, data: Uint8Array) => void;
  onImageLoaded?: (info: unknown) => void;
}

export const FirmwareLoaderPage: React.FC<FirmwareLoaderPageProps> = ({ onPartitionData, onImageLoaded }) => {
  return (
    <PageContainer
      title="固件镜像解析提取"
      description="加载和解析 Allwinner 格式固件镜像, 提取分区数据"
    >
      <FirmwareLoader onPartitionData={onPartitionData} onImageLoaded={onImageLoaded} />
    </PageContainer>
  );
};

export default FirmwareLoaderPage;
