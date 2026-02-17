import React from 'react';
import { useTranslation } from 'react-i18next';
import { FirmwareLoader } from '../FirmwareLoader';
import { PageContainer } from '../../CoreUI';
import { ImageInfo } from '../../Library/OpenixIMG';

interface FirmwareLoaderPageProps {
  onImageLoaded?: (info: ImageInfo) => void;
}

export const FirmwareLoaderPage: React.FC<FirmwareLoaderPageProps> = ({ onImageLoaded }) => {
  const { t } = useTranslation();

  return (
    <PageContainer
      title={t('firmwareLoader.title')}
      description={t('firmwareLoader.description')}
    >
      <FirmwareLoader onImageLoaded={onImageLoaded} />
    </PageContainer>
  );
};

export default FirmwareLoaderPage;
