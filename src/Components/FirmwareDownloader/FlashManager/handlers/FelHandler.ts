import { EfexContext } from '../../../../Library/libEFEX';
import { OpenixPacker } from '../../../../Library/OpenixIMG';
import { fel2fes } from '../../../../Devices';
import { FlashOptions } from '../../Types';
import { FlashCallbacks } from '../callbacks';

export interface FelHandlerResult {
  success: boolean;
  newContext?: EfexContext;
  message?: string;
}

export async function handleFelMode(
  context: EfexContext,
  packer: OpenixPacker,
  _options: FlashOptions,
  callbacks: FlashCallbacks
): Promise<FelHandlerResult> {
  const result = await fel2fes(context, packer, {
    onProgress: (stage: string, progress: number | undefined) => {
      if (progress !== undefined) {
        callbacks.onProgress({ percent: progress, stage });
      }
    },
    onLog: (level: string, message: string) => {
      callbacks.onLog({
        timestamp: new Date(),
        level: level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'info',
        message,
      });
    },
  });

  if (!result.success) {
    return {
      success: false,
      message: result.message,
    };
  }

  return {
    success: true,
    newContext: result.newContext,
  };
}
