import React from 'react';
import { useTranslation } from 'react-i18next';
import { FirmwareDownloader } from './FirmwareDownloader';
import { PageContainer } from '../../CoreUI';

export const FirmwareDownloaderPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <PageContainer
      title={t('firmwareDownloader.title')}
      description={t('firmwareDownloader.description')}
    >
      <FirmwareDownloader />
    </PageContainer>
  );
};

export default FirmwareDownloaderPage;
