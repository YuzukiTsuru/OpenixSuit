import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { Layout, ToolItem } from "./CoreUI";
import { FirmwareLoaderPage } from "./Components/FirmwareLoader";
import { FirmwareDownloaderPage } from "./Components/FirmwareDownloader";
import { EFELGui } from "./Components/EFELGui";
import { Settings, AppSettings, loadSettings } from "./Settings";
import { faMicrochip, faUpload, faFolderOpen, faTools } from "@fortawesome/free-solid-svg-icons";

const tools: ToolItem[] = [
  {
    id: 'firmware-flash',
    name: '全志固件烧写',
    description: '将 Allwinner 格式固件镜像烧写到开发板',
    icon: faMicrochip,
  },
  {
    id: 'firmware-raw-flash',
    name: '通用固件烧写',
    icon: faUpload,
    description: '将通用格式原始固件镜像烧写到开发板',
  },
  {
    id: 'firmware-loader',
    name: '固件解析提取',
    icon: faFolderOpen,
    description: '加载和解析 Allwinner 格式固件镜像',
  },
  {
    id: 'efel-gui',
    name: 'EFEL 工具箱',
    icon: faTools,
    description: '使用 FEL 工具进行设备的调试分析',
  },
];

async function showAppWindow() {
  const appWindow = (await import('@tauri-apps/api/window')).getCurrentWindow();
  appWindow.show();
}

const App: React.FC = () => {
  const [activeTool, setActiveTool] = useState('firmware-flash');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);

  useEffect(() => {
    loadSettings().then((loadedSettings) => {
      setSidebarCollapsed(loadedSettings.sidebarCollapsed);
    });
  }, []);

  useEffect(() => {
    const loadingScreen = document.getElementById('loading-screen');
    if (loadingScreen) {
      loadingScreen.classList.add('hidden');
      setTimeout(() => {
        loadingScreen.remove();
      }, 500);
    }
  }, []);

  useEffect(() => {
    showAppWindow();
  }, []);

  const handleSettingsChange = (newSettings: AppSettings) => {
    setSidebarCollapsed(newSettings.sidebarCollapsed);
  };

  const renderTool = () => {
    switch (activeTool) {
      case 'firmware-flash':
        return <FirmwareDownloaderPage />;
      case 'firmware-loader':
        return (
          <FirmwareLoaderPage
            onPartitionData={(name: string, data: Uint8Array) => {
              console.log(`Extracted partition: ${name}, size: ${data.length} bytes`);
            }}
            onImageLoaded={(info) => {
              console.log('Image loaded:', info);
            }}
          />
        );
      case 'efel-gui':
        return <EFELGui />;
      default:
        return (
          <div style={{ padding: 20, color: '#6c7086' }}>
            <h3>工具开发中...</h3>
            <p>该工具尚未实现，敬请期待。</p>
          </div>
        );
    }
  };

  return (
    <>
      <Layout
        tools={tools}
        activeTool={activeTool}
        onToolSelect={setActiveTool}
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={() => setSidebarCollapsed(!sidebarCollapsed)}
        onSettingsClick={() => setSettingsVisible(true)}
      >
        {renderTool()}
      </Layout>
      <Settings
        visible={settingsVisible}
        onClose={() => setSettingsVisible(false)}
        onSettingsChange={handleSettingsChange}
      />
    </>
  );
};

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
