import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { faChevronLeft, faChevronRight, faCog } from '@fortawesome/free-solid-svg-icons';
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
}

export const Sidebar: React.FC<SidebarProps> = ({
  tools,
  activeTool,
  onToolSelect,
  collapsed,
  onToggleCollapse,
  onSettingsClick
}) => {
  return (
    <div className={`sidebar ${collapsed ? 'sidebar--collapsed' : ''}`}>
      <div className="sidebar-header">
        {!collapsed && (
          <>
            <h1>OpenixSuit</h1>
            <span className="sidebar-subtitle">Allwinner 芯片设备开发调试工具</span>
          </>
        )}
        <button
          className="sidebar-toggle"
          onClick={onToggleCollapse}
          title={collapsed ? '展开侧边栏' : '收起侧边栏'}
        >
          <FontAwesomeIcon icon={collapsed ? faChevronRight : faChevronLeft} />
        </button>
      </div>
      <nav className="sidebar-nav">
        {tools.map((tool) => (
          <button
            key={tool.id}
            className={`sidebar-item ${activeTool === tool.id ? 'active' : ''}`}
            onClick={() => onToolSelect(tool.id)}
            title={collapsed ? tool.name : tool.description}
          >
            <span className="sidebar-item-icon">
              <FontAwesomeIcon icon={tool.icon} />
            </span>
            {!collapsed && <span className="sidebar-item-name">{tool.name}</span>}
          </button>
        ))}
      </nav>
      <div className="sidebar-footer">
        {onSettingsClick && (
          <button
            className="sidebar-settings-btn"
            onClick={onSettingsClick}
            title="设置"
          >
            <FontAwesomeIcon icon={faCog} />
            {!collapsed && <span>设置</span>}
          </button>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
