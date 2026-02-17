import React from 'react';
import { useTranslation } from 'react-i18next';
import { FileInfo } from '../../../Library/OpenixIMG';
import { formatSize } from '../../../Utils';

interface FileListSectionProps {
  files: FileInfo[];
  getFunctionBySubtype: (subtype: string) => string;
  onExtract: (file: FileInfo) => void;
}

export const FileListSection: React.FC<FileListSectionProps> = ({
  files,
  getFunctionBySubtype,
  onExtract,
}) => {
  const { t } = useTranslation();

  return (
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
          {files.map((file, index) => (
            <tr key={index}>
              <td>{file.filename || '-'}</td>
              <td>{file.maintype}</td>
              <td>{file.subtype}</td>
              <td>{getFunctionBySubtype(file.subtype)}</td>
              <td>{formatSize(file.originalLength)}</td>
              <td>{formatSize(file.storedLength)}</td>
              <td>
                <button onClick={() => onExtract(file)} className="extract-button">
                  {t('common.extract')}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default FileListSection;
