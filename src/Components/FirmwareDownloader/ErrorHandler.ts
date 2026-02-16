import { EFEX_ERROR_CODES, isEfexError, EfexError } from '../../Library/libEFEX';
import i18n from '../../i18n';

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
        title: i18n.t('errorHandler.usbInit.title'),
        message: i18n.t('errorHandler.usbInit.message'),
      };

    case EFEX_ERROR_CODES.USB_DEVICE_NOT_FOUND:
      return {
        type: 'warning',
        title: i18n.t('errorHandler.deviceNotFound.title'),
        message: i18n.t('errorHandler.deviceNotFound.message'),
      };

    case EFEX_ERROR_CODES.USB_OPEN:
      return {
        type: 'error',
        title: i18n.t('errorHandler.usbOpen.title'),
        message: i18n.t('errorHandler.usbOpen.message'),
      };

    case EFEX_ERROR_CODES.USB_TRANSFER:
      return {
        type: 'error',
        title: i18n.t('errorHandler.usbTransfer.title'),
        message: i18n.t('errorHandler.usbTransfer.message'),
      };

    case EFEX_ERROR_CODES.USB_TIMEOUT:
      return {
        type: 'warning',
        title: i18n.t('errorHandler.usbTimeout.title'),
        message: i18n.t('errorHandler.usbTimeout.message'),
      };

    case EFEX_ERROR_CODES.DEVICE_BUSY:
      return {
        type: 'warning',
        title: i18n.t('errorHandler.deviceBusy.title'),
        message: i18n.t('errorHandler.deviceBusy.message'),
      };

    case EFEX_ERROR_CODES.DEVICE_NOT_READY:
      return {
        type: 'warning',
        title: i18n.t('errorHandler.deviceNotReady.title'),
        message: i18n.t('errorHandler.deviceNotReady.message'),
      };

    case EFEX_ERROR_CODES.INVALID_DEVICE_MODE:
      return {
        type: 'warning',
        title: i18n.t('errorHandler.invalidDeviceMode.title'),
        message: i18n.t('errorHandler.invalidDeviceMode.message'),
      };

    default:
      if (efexError.isUsbError()) {
        return {
          type: 'error',
          title: i18n.t('errorHandler.usbError.title'),
          message: i18n.t('errorHandler.usbError.message', { error: efexError.message }),
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
