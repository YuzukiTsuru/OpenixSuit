import { BaseDirectory, mkdir, readTextFile, writeTextFile } from '@tauri-apps/plugin-fs';
import { PostFlashAction } from '../Devices';
import { UsbBackend } from '../Library/libEFEX';
import { SupportedLanguage } from '../i18n';

export interface AppSettings {
  sidebarCollapsed: boolean;
  defaultFlashMode: 'partition' | 'keep_data' | 'partition_erase' | 'full_erase';
  autoScanDevices: boolean;
  verifyDownload: boolean;
  postFlashAction: PostFlashAction;
  rememberLastImage: boolean;
  lastImagePath: string | null;
  usbBackend: UsbBackend;
  language: SupportedLanguage;
}

const isWindows = navigator.userAgent?.toLowerCase().includes('windows')

const DEFAULT_USB_BACKEND: UsbBackend = isWindows ? 'winusb' : 'libusb';

const DEFAULT_SETTINGS: AppSettings = {
  sidebarCollapsed: false,
  defaultFlashMode: 'keep_data',
  autoScanDevices: true,
  verifyDownload: true,
  postFlashAction: 'reboot',
  rememberLastImage: false,
  lastImagePath: null,
  usbBackend: DEFAULT_USB_BACKEND,
  language: 'zh-CN',
};

const SETTINGS_DIR = '.openixsuit';
const SETTINGS_FILE = 'settings.json';

export async function loadSettings(): Promise<AppSettings> {
  try {
    const content = await readTextFile(`${SETTINGS_DIR}/${SETTINGS_FILE}`, {
      baseDir: BaseDirectory.Home,
    });
    const parsed = JSON.parse(content);
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch (error) {
    console.error('Failed to load settings, using default settings:', error);
    return { ...DEFAULT_SETTINGS };
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  try {
    await mkdir(SETTINGS_DIR, {
      baseDir: BaseDirectory.Home,
      recursive: true,
    });
  } catch (error) {
    console.error('Failed to create settings directory:', error);
    return;
  }

  await writeTextFile(
    `${SETTINGS_DIR}/${SETTINGS_FILE}`,
    JSON.stringify(settings, null, 2),
    { baseDir: BaseDirectory.Home }
  );
}
