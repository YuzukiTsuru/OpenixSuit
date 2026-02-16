import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { AppSettings, loadSettings, saveSettings } from './settingsStore';
import { POST_FLASH_ACTION_OPTIONS, PostFlashAction, FlashMode } from '../Devices';
import { FLASH_MODE_LABELS } from '../Components/FirmwareDownloader/Types';
import { UsbBackend, EfexContext } from '../Library/libEFEX';
import { supportedLanguages } from '../i18n';
import './Settings.css';

const isWindows = navigator.userAgent?.toLowerCase().includes('windows')

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
  const { t, i18n } = useTranslation();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [saving, setSaving] = useState(false);

  const getFlashModeLabel = (mode: FlashMode): string => {
    return t(FLASH_MODE_LABELS[mode]);
  };

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

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
    handleChange('language', lang as AppSettings['language']);
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
          <h2>{t('settings.title')}</h2>
          <button className="settings-close" onClick={onClose}>{t('settings.close')}</button>
        </div>

        <div className="settings-content">
          <div className="settings-section">
            <h3>{t('settings.uiSettings')}</h3>
            <label className="settings-item">
              <span className="settings-label">{t('settings.language')}</span>
              <select
                value={settings.language}
                onChange={(e) => handleLanguageChange(e.target.value)}
              >
                {supportedLanguages.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.nativeName}
                  </option>
                ))}
              </select>
            </label>
            <label className="settings-item">
              <span className="settings-label">{t('settings.sidebarCollapsed')}</span>
              <input
                type="checkbox"
                checked={settings.sidebarCollapsed}
                onChange={(e) => handleChange('sidebarCollapsed', e.target.checked)}
              />
            </label>
          </div>

          <div className="settings-section">
            <h3>{t('settings.flashSettings')}</h3>
            <label className="settings-item">
              <span className="settings-label">{t('settings.defaultFlashMode')}</span>
              <select
                value={settings.defaultFlashMode}
                onChange={(e) => handleChange('defaultFlashMode', e.target.value as FlashMode)}
              >
                {(Object.keys(FLASH_MODE_LABELS) as FlashMode[]).map((mode) => (
                  <option key={mode} value={mode}>
                    {getFlashModeLabel(mode)}
                  </option>
                ))}
              </select>
            </label>
            <label className="settings-item">
              <span className="settings-label">{t('settings.postFlashAction')}</span>
              <select
                value={settings.postFlashAction}
                onChange={(e) => handleChange('postFlashAction', e.target.value as PostFlashAction)}
              >
                {POST_FLASH_ACTION_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {t(option.label)}
                  </option>
                ))}
              </select>
            </label>
            <label className="settings-item">
              <span className="settings-label">{t('settings.verifyDownload')}</span>
              <input
                type="checkbox"
                checked={settings.verifyDownload}
                onChange={(e) => handleChange('verifyDownload', e.target.checked)}
              />
            </label>
            <label className="settings-item">
              <span className="settings-label">{t('settings.rememberLastImage')}</span>
              <input
                type="checkbox"
                checked={settings.rememberLastImage}
                onChange={(e) => handleChange('rememberLastImage', e.target.checked)}
              />
            </label>
          </div>

          <div className="settings-section">
            <h3>{t('settings.deviceSettings')}</h3>
            <label className="settings-item">
              <span className="settings-label">{t('settings.autoScanDevices')}</span>
              <input
                type="checkbox"
                checked={settings.autoScanDevices}
                onChange={(e) => handleChange('autoScanDevices', e.target.checked)}
              />
            </label>
            <label className="settings-item">
              <span className="settings-label">{t('settings.usbBackend')}</span>
              <select
                value={settings.usbBackend}
                onChange={(e) => handleChange('usbBackend', e.target.value as UsbBackend)}
              >
                {isWindows && (
                  <option value="winusb">{t('usbBackend.winusb')}</option>
                )}
                <option value="libusb">{t('usbBackend.libusb')}</option>
              </select>
            </label>
          </div>
        </div>

        <div className="settings-footer">
          <button className="settings-btn settings-btn-secondary" onClick={onClose}>
            {t('settings.cancel')}
          </button>
          <button
            className="settings-btn settings-btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? t('settings.saving') : t('settings.save')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
