import { EFEX_ERROR_CODES, EfexErrorData } from './types';

const ERROR_NAMES: Record<number, string> = {
  [EFEX_ERROR_CODES.INVALID_PARAM]: 'InvalidParam',
  [EFEX_ERROR_CODES.NULL_PTR]: 'NullPtr',
  [EFEX_ERROR_CODES.MEMORY]: 'Memory',
  [EFEX_ERROR_CODES.NOT_SUPPORT]: 'NotSupported',
  [EFEX_ERROR_CODES.USB_INIT]: 'UsbInit',
  [EFEX_ERROR_CODES.USB_DEVICE_NOT_FOUND]: 'UsbDeviceNotFound',
  [EFEX_ERROR_CODES.USB_OPEN]: 'UsbOpen',
  [EFEX_ERROR_CODES.USB_TRANSFER]: 'UsbTransfer',
  [EFEX_ERROR_CODES.USB_TIMEOUT]: 'UsbTimeout',
  [EFEX_ERROR_CODES.PROTOCOL]: 'Protocol',
  [EFEX_ERROR_CODES.INVALID_RESPONSE]: 'InvalidResponse',
  [EFEX_ERROR_CODES.UNEXPECTED_STATUS]: 'UnexpectedStatus',
  [EFEX_ERROR_CODES.INVALID_STATE]: 'InvalidState',
  [EFEX_ERROR_CODES.INVALID_DEVICE_MODE]: 'InvalidDeviceMode',
  [EFEX_ERROR_CODES.OPERATION_FAILED]: 'OperationFailed',
  [EFEX_ERROR_CODES.DEVICE_BUSY]: 'DeviceBusy',
  [EFEX_ERROR_CODES.DEVICE_NOT_READY]: 'DeviceNotReady',
  [EFEX_ERROR_CODES.FLASH_ACCESS]: 'FlashAccess',
  [EFEX_ERROR_CODES.FLASH_SIZE_PROBE]: 'FlashSizeProbe',
  [EFEX_ERROR_CODES.FLASH_SET_ONOFF]: 'FlashSetOnOff',
  [EFEX_ERROR_CODES.VERIFICATION]: 'Verification',
  [EFEX_ERROR_CODES.CRC_MISMATCH]: 'CrcMismatch',
  [EFEX_ERROR_CODES.FILE_OPEN]: 'FileOpen',
  [EFEX_ERROR_CODES.FILE_READ]: 'FileRead',
  [EFEX_ERROR_CODES.FILE_WRITE]: 'FileWrite',
  [EFEX_ERROR_CODES.FILE_SIZE]: 'FileSize',
  [EFEX_ERROR_CODES.NO_FREE_SLOT]: 'NoFreeSlot',
  [EFEX_ERROR_CODES.INVALID_HANDLE]: 'InvalidHandle',
  [EFEX_ERROR_CODES.DEVICE_NOT_OPEN]: 'DeviceNotOpen',
};

const ERROR_MESSAGES: Record<number, string> = {
  [EFEX_ERROR_CODES.INVALID_PARAM]: 'Invalid parameter',
  [EFEX_ERROR_CODES.NULL_PTR]: 'Null pointer error',
  [EFEX_ERROR_CODES.MEMORY]: 'Memory allocation error',
  [EFEX_ERROR_CODES.NOT_SUPPORT]: 'Operation not supported',
  [EFEX_ERROR_CODES.USB_INIT]: 'USB initialization failed',
  [EFEX_ERROR_CODES.USB_DEVICE_NOT_FOUND]: 'Device not found',
  [EFEX_ERROR_CODES.USB_OPEN]: 'Failed to open device',
  [EFEX_ERROR_CODES.USB_TRANSFER]: 'USB transfer failed',
  [EFEX_ERROR_CODES.USB_TIMEOUT]: 'USB transfer timeout',
  [EFEX_ERROR_CODES.PROTOCOL]: 'Protocol error',
  [EFEX_ERROR_CODES.INVALID_RESPONSE]: 'Invalid response from device',
  [EFEX_ERROR_CODES.UNEXPECTED_STATUS]: 'Unexpected status code',
  [EFEX_ERROR_CODES.INVALID_STATE]: 'Invalid device state',
  [EFEX_ERROR_CODES.INVALID_DEVICE_MODE]: 'Invalid device mode',
  [EFEX_ERROR_CODES.OPERATION_FAILED]: 'Operation failed',
  [EFEX_ERROR_CODES.DEVICE_BUSY]: 'Device is busy',
  [EFEX_ERROR_CODES.DEVICE_NOT_READY]: 'Device not ready',
  [EFEX_ERROR_CODES.FLASH_ACCESS]: 'Flash access error',
  [EFEX_ERROR_CODES.FLASH_SIZE_PROBE]: 'Flash size probing failed',
  [EFEX_ERROR_CODES.FLASH_SET_ONOFF]: 'Failed to set flash on/off',
  [EFEX_ERROR_CODES.VERIFICATION]: 'Verification failed',
  [EFEX_ERROR_CODES.CRC_MISMATCH]: 'CRC mismatch error',
  [EFEX_ERROR_CODES.FILE_OPEN]: 'Failed to open file',
  [EFEX_ERROR_CODES.FILE_READ]: 'Failed to read file',
  [EFEX_ERROR_CODES.FILE_WRITE]: 'Failed to write file',
  [EFEX_ERROR_CODES.FILE_SIZE]: 'File size error',
  [EFEX_ERROR_CODES.NO_FREE_SLOT]: 'No free device slot available',
  [EFEX_ERROR_CODES.INVALID_HANDLE]: 'Invalid device handle',
  [EFEX_ERROR_CODES.DEVICE_NOT_OPEN]: 'Device not opened',
};

export class EfexError extends Error {
  public readonly code: number;
  public readonly name: string;

  constructor(code: number, name: string, message: string) {
    super(message);
    this.code = code;
    this.name = `EfexError[${name}]`;
    Object.setPrototypeOf(this, EfexError.prototype);
  }

  static fromData(data: EfexErrorData): EfexError {
    return new EfexError(data.code, data.name, data.message);
  }

  static fromCode(code: number, customMessage?: string): EfexError {
    const name = ERROR_NAMES[code] || 'Unknown';
    const message = customMessage || ERROR_MESSAGES[code] || `Unknown error code: ${code}`;
    return new EfexError(code, name, message);
  }

  isInvalidParam(): boolean {
    return this.code === EFEX_ERROR_CODES.INVALID_PARAM;
  }

  isDeviceNotFound(): boolean {
    return this.code === EFEX_ERROR_CODES.USB_DEVICE_NOT_FOUND;
  }

  isTimeout(): boolean {
    return this.code === EFEX_ERROR_CODES.USB_TIMEOUT;
  }

  isDeviceBusy(): boolean {
    return this.code === EFEX_ERROR_CODES.DEVICE_BUSY;
  }

  isDeviceNotReady(): boolean {
    return this.code === EFEX_ERROR_CODES.DEVICE_NOT_READY;
  }

  isUsbError(): boolean {
    return this.code >= -14 && this.code <= -10;
  }

  isProtocolError(): boolean {
    return this.code >= -22 && this.code <= -20;
  }

  isFlashError(): boolean {
    return this.code >= -42 && this.code <= -40;
  }

  isFileError(): boolean {
    return this.code >= -63 && this.code <= -60;
  }

  isError(): boolean {
    return this.code !== EFEX_ERROR_CODES.SUCCESS;
  }

  toString(): string {
    return `${this.name} (${this.code}): ${this.message}`;
  }

  toJSON(): EfexErrorData {
    return {
      code: this.code,
      name: this.name.replace('EfexError[', '').replace(']', ''),
      message: this.message,
    };
  }
}

export function isEfexError(error: unknown): error is EfexError {
  return error instanceof EfexError;
}

export function throwIfError<T>(result: T | EfexError): T {
  if (result instanceof EfexError) {
    throw result;
  }
  return result;
}
