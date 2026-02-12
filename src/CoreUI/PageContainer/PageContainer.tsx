import React from 'react';
import './PageContainer.css';

interface PageContainerProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export const PageContainer: React.FC<PageContainerProps> = ({ title, description, children }) => {
  return (
    <div className="page-container">
      <div className="page-header">
        <h2 className="page-title">{title}</h2>
        {description && <p className="page-description">{description}</p>}
      </div>
      <div className="page-content">
        {children}
      </div>
    </div>
  );
};

export default PageContainer;
