import React from 'react';
import { useTranslation } from 'react-i18next';
import { FirmwareLoader } from '../FirmwareLoader';
import { PageContainer } from '../../CoreUI';

interface FirmwareLoaderPageProps {
  onPartitionData?: (partitionName: string, data: Uint8Array) => void;
  onImageLoaded?: (info: unknown) => void;
}

export const FirmwareLoaderPage: React.FC<FirmwareLoaderPageProps> = ({ onPartitionData, onImageLoaded }) => {
  const { t } = useTranslation();

  return (
    <PageContainer
      title={t('firmwareLoader.title')}
      description={t('firmwareLoader.description')}
    >
      <FirmwareLoader onPartitionData={onPartitionData} onImageLoaded={onImageLoaded} />
    </PageContainer>
  );
};

export default FirmwareLoaderPage;
