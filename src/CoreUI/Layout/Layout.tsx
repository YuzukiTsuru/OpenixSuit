import React from 'react';
import { Sidebar, ToolItem } from '../Sidebar';
import './Layout.css';

interface LayoutProps {
  tools: ToolItem[];
  activeTool: string;
  onToolSelect: (toolId: string) => void;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ 
  tools, 
  activeTool, 
  onToolSelect, 
  sidebarCollapsed,
  onToggleSidebar,
  children 
}) => {
  return (
    <div className="layout">
      <Sidebar 
        tools={tools} 
        activeTool={activeTool} 
        onToolSelect={onToolSelect}
        collapsed={sidebarCollapsed}
        onToggleCollapse={onToggleSidebar}
      />
      <main className="layout-main">
        {children}
      </main>
    </div>
  );
};

export default Layout;
