import React, { useState, useEffect, useCallback, useMemo } from "react";
import ReactDOM from "react-dom/client";
import { useTranslation } from "react-i18next";
import { Layout, ToolItem } from "./CoreUI";
import { FirmwareLoaderPage } from "./Components/FirmwareLoader";
import { FirmwareDownloaderPage } from "./Components/FirmwareDownloader";
import { EFELGui } from "./Components/EFELGui";
import { Settings, AppSettings, loadSettings } from "./Settings";
import { flashManager } from "./Components/FirmwareDownloader/FlashManager";
import { EfexContext } from "./Library/libEFEX";
import { faMicrochip, faUpload, faFolderOpen, faTools } from "@fortawesome/free-solid-svg-icons";
import './i18n';
import i18n from './i18n';

async function showAppWindow() {
  const appWindow = (await import('@tauri-apps/api/window')).getCurrentWindow();
  appWindow.show();
}

const App: React.FC = () => {
  const { t } = useTranslation();
  const [activeTool, setActiveTool] = useState('firmware-flash');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [isWorking, setIsWorking] = useState(false);

  const tools: ToolItem[] = useMemo(() => [
    {
      id: 'firmware-flash',
      name: t('tools.firmwareFlash.name'),
      description: t('tools.firmwareFlash.description'),
      icon: faMicrochip,
    },
    {
      id: 'firmware-raw-flash',
      name: t('tools.firmwareRawFlash.name'),
      icon: faUpload,
      description: t('tools.firmwareRawFlash.description'),
    },
    {
      id: 'firmware-loader',
      name: t('tools.firmwareLoader.name'),
      icon: faFolderOpen,
      description: t('tools.firmwareLoader.description'),
    },
    {
      id: 'efel-gui',
      name: t('tools.efelGui.name'),
      icon: faTools,
      description: t('tools.efelGui.description'),
    },
  ], [t]);

  useEffect(() => {
    loadSettings().then(async (loadedSettings) => {
      setSidebarCollapsed(loadedSettings.sidebarCollapsed);
      if (loadedSettings.language) {
        i18n.changeLanguage(loadedSettings.language);
      }
      try {
        await EfexContext.setUsbBackend(loadedSettings.usbBackend);
      } catch (e) {
        console.error('Failed to set USB backend:', e);
      }
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

  useEffect(() => {
    const checkFlashingState = () => {
      setIsWorking(flashManager.getIsFlashing());
    };

    const unsubProgress = flashManager.onProgress(() => {
      checkFlashingState();
    });

    const unsubComplete = flashManager.onComplete(() => {
      setTimeout(checkFlashingState, 100);
    });

    checkFlashingState();

    return () => {
      unsubProgress();
      unsubComplete();
    };
  }, []);

  const handleSettingsChange = (newSettings: AppSettings) => {
    setSidebarCollapsed(newSettings.sidebarCollapsed);
  };

  const handleToolSelect = useCallback((toolId: string) => {
    setActiveTool(toolId);
  }, []);

  const handleToggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => !prev);
  }, []);

  const renderTool = () => {
    switch (activeTool) {
      case 'firmware-flash':
        return <FirmwareDownloaderPage />;
      case 'firmware-loader':
        return (
          <FirmwareLoaderPage
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
            <h3>{t('tools.developing.title')}</h3>
            <p>{t('tools.developing.description')}</p>
          </div>
        );
    }
  };

  return (
    <>
      <Layout
        tools={tools}
        activeTool={activeTool}
        onToolSelect={handleToolSelect}
        sidebarCollapsed={sidebarCollapsed}
        onToggleSidebar={handleToggleSidebar}
        onSettingsClick={() => setSettingsVisible(true)}
        sidebarLocked={isWorking}
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
