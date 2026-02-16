import React from 'react';
import { useTranslation } from 'react-i18next';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { faChevronLeft, faChevronRight, faCog } from '@fortawesome/free-solid-svg-icons';
import packageJson from '../../../package.json';
import './Sidebar.css';

export interface ToolItem {
  id: string;
  name: string;
  icon: IconDefinition;
  description?: string;
}

interface SidebarProps {
  tools: ToolItem[];
  activeTool: string;
  onToolSelect: (toolId: string) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
  onSettingsClick?: () => void;
  locked?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  tools,
  activeTool,
  onToolSelect,
  collapsed,
  onToggleCollapse,
  onSettingsClick,
  locked = false
}) => {
  const { t } = useTranslation();

  return (
    <div className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''} ${locked ? 'sidebar--locked' : ''}`}>
      <div className="sidebar-header">
        {!collapsed && (
          <>
            <h1>{t('sidebar.title')} <span className="sidebar-version">v{packageJson.version}</span></h1>
            <span className="sidebar-subtitle">{t('sidebar.subtitle')}</span>
          </>
        )}
        <button
          className="sidebar-toggle"
          onClick={onToggleCollapse}
          title={collapsed ? t('sidebar.expand') : t('sidebar.collapse')}
          disabled={locked}
        >
          <FontAwesomeIcon icon={collapsed ? faChevronRight : faChevronLeft} />
        </button>
      </div>
      <nav className="sidebar-nav">
        {tools.map((tool) => {
          const isActive = activeTool === tool.id;
          const isDisabled = locked && !isActive;
          return (
            <button
              key={tool.id}
              className={`sidebar-item ${isActive ? 'active' : ''} ${isDisabled ? 'sidebar-item--disabled' : ''}`}
              onClick={() => !isDisabled && onToolSelect(tool.id)}
              title={collapsed ? tool.name : tool.description}
              disabled={isDisabled}
            >
              <span className="sidebar-item-icon">
                <FontAwesomeIcon icon={tool.icon} />
              </span>
              {!collapsed && <span className="sidebar-item-name">{tool.name}</span>}
            </button>
          );
        })}
      </nav>
      <div className="sidebar-footer">
        {onSettingsClick && (
          <button
            className="sidebar-settings-btn"
            onClick={onSettingsClick}
            title={t('sidebar.settings')}
            disabled={locked}
          >
            <FontAwesomeIcon icon={faCog} />
            {!collapsed && <span>{t('sidebar.settings')}</span>}
          </button>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
