import { EfexContext } from '../Library/libEFEX';
import { ToolMode } from '../FlashConfig/Constants';
import { DeviceOpsOptions } from './Interface';
import i18n from '../i18n';

export type PostFlashAction = 'reboot' | 'poweroff' | 'none';

export interface SetDeviceNextModeResult {
  success: boolean;
  message?: string;
}

export const POST_FLASH_ACTION_OPTIONS: { value: PostFlashAction; label: string }[] = [
  { value: 'reboot', label: 'postFlashAction.reboot' },
  { value: 'poweroff', label: 'postFlashAction.shutdown' },
  { value: 'none', label: 'postFlashAction.none' },
];

function postFlashActionToToolMode(action: PostFlashAction): ToolMode {
  switch (action) {
    case 'reboot':
      return ToolMode.REBOOT;
    case 'poweroff':
      return ToolMode.POWEROFF;
    case 'none':
    default:
      return ToolMode.NORMAL;
  }
}

export async function setDeviceNextMode(
  ctx: EfexContext,
  action: PostFlashAction,
  options?: DeviceOpsOptions
): Promise<SetDeviceNextModeResult> {
  const { onLog } = options || {};

  const toolMode = postFlashActionToToolMode(action);

  onLog?.('info', i18n.t('device.setDeviceNextMode.settingMode', { action, mode: ToolMode[toolMode] }));

  try {
    if (toolMode === ToolMode.NORMAL) {
      onLog?.('info', i18n.t('device.setDeviceNextMode.keepCurrentState'));
      return { success: true };
    }

    await ctx.fes.toolMode('normal', action === 'none' ? 'normal' : action);

    switch (action) {
      case 'reboot':
        onLog?.('info', i18n.t('device.setDeviceNextMode.willReboot'));
        break;
      case 'poweroff':
        onLog?.('info', i18n.t('device.setDeviceNextMode.willPoweroff'));
        break;
    }

    return { success: true };
  } catch (error) {
    onLog?.('error', i18n.t('device.setDeviceNextMode.failed', { error }));
    return { success: false, message: i18n.t('device.setDeviceNextMode.failed', { error }) };
  }
}
