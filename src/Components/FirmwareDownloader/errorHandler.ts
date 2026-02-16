import { EFEX_ERROR_CODES, isEfexError, EfexError } from '../../Library/libEFEX';

export interface ErrorSolution {
  title: string;
  message: string;
  type: 'error' | 'warning' | 'info';
}

export function getErrorSolution(error: unknown): ErrorSolution | null {
  if (!isEfexError(error)) {
    return null;
  }

  const efexError = error as EfexError;

  switch (efexError.code) {
    case EFEX_ERROR_CODES.USB_INIT:
      return {
        type: 'error',
        title: 'USB初始化失败',
        message: '无法初始化USB驱动。可能由于驱动不匹配或未安装驱动\n\n可能的解决方案: \n1. 检查USB驱动是否正确安装\n2. 尝试更换USB驱动类型(设置 → 设备设置 → USB驱动)\n3. 重新插拔USB设备\n4. 重启应用程序',
      };

    case EFEX_ERROR_CODES.USB_DEVICE_NOT_FOUND:
      return {
        type: 'warning',
        title: '未找到设备',
        message: '未检测到全志设备。\n\n请确认: \n1. 设备已通过USB连接到电脑\n2. 设备已进入FEL模式(通常需要按住特定按键上电)\n3. USB线缆连接正常',
      };

    case EFEX_ERROR_CODES.USB_OPEN:
      return {
        type: 'error',
        title: '无法打开设备',
        message: '无法打开USB设备。\n\n可能的解决方案: \n1. 设备可能被其他程序占用,请关闭其他烧录工具\n2. 尝试更换USB驱动类型(设置 → 设备设置 → USB驱动)\n3. Windows用户: 如果使用libusb,请使用Zadig安装libusb驱动\n4. Windows用户: 如果使用WinUSB,请确保设备使用厂商驱动',
      };

    case EFEX_ERROR_CODES.USB_TRANSFER:
      return {
        type: 'error',
        title: 'USB传输失败',
        message: 'USB数据传输失败。\n\n可能的解决方案: \n1. 更换USB端口(建议使用主板直连的USB口)\n2. 更换USB线缆\n3. 避免使用USB集线器\n4. 检查设备供电是否充足',
      };

    case EFEX_ERROR_CODES.USB_TIMEOUT:
      return {
        type: 'warning',
        title: 'USB通信超时',
        message: 'USB通信超时。\n\n可能的解决方案: \n1. 设备可能未正确响应,请重置设备\n2. 检查USB连接是否稳定\n3. 尝试重新进入FEL模式',
      };

    case EFEX_ERROR_CODES.DEVICE_BUSY:
      return {
        type: 'warning',
        title: '设备忙',
        message: '设备正在被其他操作占用。\n\n请等待当前操作完成后再试。',
      };

    case EFEX_ERROR_CODES.DEVICE_NOT_READY:
      return {
        type: 'warning',
        title: '设备未就绪',
        message: '设备尚未准备好。\n\n请等待设备初始化完成后再试。',
      };

    case EFEX_ERROR_CODES.INVALID_DEVICE_MODE:
      return {
        type: 'warning',
        title: '设备模式错误',
        message: '设备当前模式不支持此操作。\n\n请确保设备处于正确的模式(FEL或FES模式)。',
      };

    default:
      if (efexError.isUsbError()) {
        return {
          type: 'error',
          title: 'USB错误',
          message: `USB通信错误: ${efexError.message}\n\n可能的解决方案: \n1. 检查USB连接\n2. 更换USB驱动类型\n3. 重新插拔设备`,
        };
      }

      return null;
  }
}

export function formatErrorForLog(error: unknown): string {
  if (isEfexError(error)) {
    const efexError = error as EfexError;
    return `${efexError.name}: ${efexError.message}`;
  }
  
  if (error instanceof Error) {
    return error.message;
  }
  
  return String(error);
}
