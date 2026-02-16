import React, { useState, useEffect } from 'react';
import { AppSettings, loadSettings, saveSettings } from './settingsStore';
import { POST_FLASH_ACTION_OPTIONS, PostFlashAction, FlashMode } from '../Devices';
import { FLASH_MODE_LABELS } from '../Components/FirmwareDownloader/Types';
import { UsbBackend, EfexContext } from '../Library/libEFEX';
import './Settings.css';

const USB_BACKEND_LABELS: Record<UsbBackend, string> = {
  libusb: 'Libusb (Community)',
  winusb: 'WinUSB (Vendor)',
};

const isWindows = navigator.platform.toLowerCase().startsWith('win');

interface SettingsProps {
  visible: boolean;
  onClose: () => void;
  onSettingsChange: (settings: AppSettings) => void;
}

export const Settings: React.FC<SettingsProps> = ({
  visible,
  onClose,
  onSettingsChange,
}) => {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      loadSettings().then(setSettings);
    }
  }, [visible]);

  const handleChange = <K extends keyof AppSettings>(
    key: K,
    value: AppSettings[K]
  ) => {
    if (settings) {
      setSettings({ ...settings, [key]: value });
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await EfexContext.setUsbBackend(settings.usbBackend);
      await saveSettings(settings);
      onSettingsChange(settings);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  if (!visible || !settings) return null;

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2>设置</h2>
          <button className="settings-close" onClick={onClose}>✕</button>
        </div>

        <div className="settings-content">
          <div className="settings-section">
            <h3>界面设置</h3>
            <label className="settings-item">
              <span className="settings-label">侧边栏默认折叠</span>
              <input
                type="checkbox"
                checked={settings.sidebarCollapsed}
                onChange={(e) => handleChange('sidebarCollapsed', e.target.checked)}
              />
            </label>
          </div>

          <div className="settings-section">
            <h3>烧录设置</h3>
            <label className="settings-item">
              <span className="settings-label">默认烧录模式</span>
              <select
                value={settings.defaultFlashMode}
                onChange={(e) => handleChange('defaultFlashMode', e.target.value as FlashMode)}
              >
                {(Object.keys(FLASH_MODE_LABELS) as FlashMode[]).map((mode) => (
                  <option key={mode} value={mode}>
                    {FLASH_MODE_LABELS[mode]}
                  </option>
                ))}
              </select>
            </label>
            <label className="settings-item">
              <span className="settings-label">烧录完成后</span>
              <select
                value={settings.postFlashAction}
                onChange={(e) => handleChange('postFlashAction', e.target.value as PostFlashAction)}
              >
                {POST_FLASH_ACTION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="settings-item">
              <span className="settings-label">验证下载镜像</span>
              <input
                type="checkbox"
                checked={settings.verifyDownload}
                onChange={(e) => handleChange('verifyDownload', e.target.checked)}
              />
            </label>
            <label className="settings-item">
              <span className="settings-label">记住上次打开的固件</span>
              <input
                type="checkbox"
                checked={settings.rememberLastImage}
                onChange={(e) => handleChange('rememberLastImage', e.target.checked)}
              />
            </label>
          </div>

          <div className="settings-section">
            <h3>设备设置</h3>
            <label className="settings-item">
              <span className="settings-label">自动扫描设备(热插拔)</span>
              <input
                type="checkbox"
                checked={settings.autoScanDevices}
                onChange={(e) => handleChange('autoScanDevices', e.target.checked)}
              />
            </label>
            <label className="settings-item">
              <span className="settings-label">USB驱动</span>
              <select
                value={settings.usbBackend}
                onChange={(e) => handleChange('usbBackend', e.target.value as UsbBackend)}
              >
                {isWindows && (
                  <option value="winusb">{USB_BACKEND_LABELS.winusb}</option>
                )}
                <option value="libusb">{USB_BACKEND_LABELS.libusb}</option>
              </select>
            </label>
          </div>
        </div>

        <div className="settings-footer">
          <button className="settings-btn settings-btn-secondary" onClick={onClose}>
            取消
          </button>
          <button
            className="settings-btn settings-btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
