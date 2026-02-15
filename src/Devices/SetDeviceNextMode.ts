import { EfexContext } from '../Library/libEFEX';
import { ToolMode } from '../FlashConfig/Constants';
import { DeviceOpsOptions } from './Interface';

export type PostFlashAction = 'reboot' | 'poweroff' | 'none';

export interface SetDeviceNextModeResult {
  success: boolean;
  message?: string;
}

export const POST_FLASH_ACTION_OPTIONS: { value: PostFlashAction; label: string }[] = [
  { value: 'reboot', label: '自动重启' },
  { value: 'poweroff', label: '自动关机' },
  { value: 'none', label: '无操作' },
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

  onLog?.('info', `设置设备后续模式: ${action} (${ToolMode[toolMode]})`);

  try {
    if (toolMode === ToolMode.NORMAL) {
      onLog?.('info', '设备将在烧录完成后保持当前状态');
      return { success: true };
    }

    await ctx.fes.toolMode('normal', action === 'none' ? 'normal' : action);

    switch (action) {
      case 'reboot':
        onLog?.('info', '设备将在烧录完成后自动重启');
        break;
      case 'poweroff':
        onLog?.('info', '设备将在烧录完成后自动关机');
        break;
    }

    return { success: true };
  } catch (error) {
    onLog?.('error', `设置设备模式失败: ${error}`);
    return { success: false, message: `设置设备模式失败: ${error}` };
  }
}
