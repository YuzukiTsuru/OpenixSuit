import { StorageType } from './constants';

export interface GpioConfig {
  port: string;
  bank: string;
  pin: number;
  function: number;
  pull: string;
  drive: string;
  level: string;
}

export interface TwiPara {
  twi_port: number;
  twi_scl: GpioConfig | null;
  twi_sda: GpioConfig | null;
}

export interface UartPara {
  uart_debug_port: number;
  uart_debug_tx: GpioConfig | null;
  uart_debug_rx: GpioConfig | null;
}

export interface SysConfig {
  debug_mode: number;
  storage_type: StorageType;
  twi_para: TwiPara;
  uart_para: UartPara;
}

function parseGpioConfig(gpioString: string): GpioConfig | null {
  const match = gpioString.match(/port:P([A-Z])(\d+)<(\d+)><(\w+)><(\w+)><(\w+)>/);
  if (!match) {
    return null;
  }

  const [, bank, pinStr, func, pull, drive, level] = match;
  return {
    port: 'P',
    bank,
    pin: parseInt(pinStr, 10),
    function: parseInt(func, 10),
    pull,
    drive,
    level,
  };
}

export class SunxiSysConfigParser {
  static parse(buffer: Uint8Array): SysConfig {
    const text = new TextDecoder('utf-8').decode(buffer);
    const lines = text.split('\n');

    let currentSection: string | null = null;
    const config: SysConfig = {
      debug_mode: 0,
      storage_type: StorageType.AUTO,
      twi_para: {
        twi_port: 0,
        twi_scl: null,
        twi_sda: null,
      },
      uart_para: {
        uart_debug_port: 0,
        uart_debug_tx: null,
        uart_debug_rx: null,
      },
    };

    for (const line of lines) {
      const trimmedLine = line.trim();

      if (trimmedLine.startsWith(';')) {
        continue;
      }

      if (trimmedLine.startsWith('[') && trimmedLine.endsWith(']')) {
        currentSection = trimmedLine.substring(1, trimmedLine.length - 1);
        continue;
      }

      if (currentSection && trimmedLine.includes('=')) {
        const [key, value] = trimmedLine.split('=').map(item => item.trim());

        switch (currentSection) {
          case 'platform':
            if (key === 'debug_mode') {
              config.debug_mode = parseInt(value, 10);
            }
            break;

          case 'target':
            if (key === 'storage_type') {
              config.storage_type = parseInt(value, 10) as StorageType;
            }
            break;

          case 'twi_para':
            if (key === 'twi_port') {
              config.twi_para.twi_port = parseInt(value, 10);
            } else if (key === 'twi_scl') {
              config.twi_para.twi_scl = parseGpioConfig(value);
            } else if (key === 'twi_sda') {
              config.twi_para.twi_sda = parseGpioConfig(value);
            }
            break;

          case 'uart_para':
            if (key === 'uart_debug_port') {
              config.uart_para.uart_debug_port = parseInt(value, 10);
            } else if (key === 'uart_debug_tx') {
              config.uart_para.uart_debug_tx = parseGpioConfig(value);
            } else if (key === 'uart_debug_rx') {
              config.uart_para.uart_debug_rx = parseGpioConfig(value);
            }
            break;
        }
      }
    }

    return config;
  }

  static getStorageType(config: SysConfig): string {
    switch (config.storage_type) {
      case StorageType.NAND:
        return 'NAND';
      case StorageType.SDCARD:
        return 'SDCard';
      case StorageType.EMMC:
        return 'eMMC';
      case StorageType.SPINOR:
        return 'SPI NOR';
      case StorageType.EMMC3:
        return 'eMMC3';
      case StorageType.SPINAND:
        return 'SPI NAND';
      case StorageType.AUTO:
        return 'Auto';
      default:
        return 'Unknown';
    }
  }

  static getGpioString(gpio: GpioConfig | null): string {
    if (!gpio) return '-';
    return `P${gpio.bank}${gpio.pin}`;
  }

  static toString(config: SysConfig): string {
    return `SysConfig:
  Debug Mode: ${config.debug_mode === 1 ? 'Enabled' : 'Disabled'}
  Storage Type: ${this.getStorageType(config)}
  TWI Port: ${config.twi_para.twi_port}
  TWI SCL: ${this.getGpioString(config.twi_para.twi_scl)}
  TWI SDA: ${this.getGpioString(config.twi_para.twi_sda)}
  UART Port: ${config.uart_para.uart_debug_port}
  UART TX: ${this.getGpioString(config.uart_para.uart_debug_tx)}
  UART RX: ${this.getGpioString(config.uart_para.uart_debug_rx)}`;
  }
}
