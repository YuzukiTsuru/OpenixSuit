import React from 'react';
import { FirmwareDownloader } from './FirmwareDownloader';
import { PageContainer } from '../../CoreUI';

export const FirmwareDownloaderPage: React.FC = () => {
  return (
    <PageContainer
      title="全志固件烧写"
      description="将 Allwinner 格式固件镜像烧写到开发板"
    >
      <FirmwareDownloader />
    </PageContainer>
  );
};

export default FirmwareDownloaderPage;
