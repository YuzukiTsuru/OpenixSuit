import { EfexContext } from '../Library/libEFEX';
import { PartitionInfo } from '../FlashConfig/Types';
import { StorageType } from '../FlashConfig/Constants';
import { DeviceOpsOptions } from './Interface';
import i18n from '../i18n';

const UBIFS_NODE_MAGIC = 0x06101831;
const ITEM_ROOTFSFAT16 = 'RFSFAT16';
const UBIFS_CHECK_BUFFER_SIZE = 4096;

const SKIP_PARTITIONS = ['UDISK', 'sysrecovery', 'private'];

export interface SetUbifsInterfaceResult {
  success: boolean;
  found: boolean;
  partitionName?: string;
}

export interface UbifsPartitionInfo {
  partition: PartitionInfo;
  downloadFilename: string;
  downloadSubtype: string;
}

export interface UbifsDataProvider {
  getFileInfoByFilename?(filename: string): { offset: number; length: number } | null;
  getFileInfoByMaintypeSubtype?(maintype: string, subtype: string): { offset: number; length: number } | null;
  readFileDataByFilenameStream?(filename: string, chunkSize?: number): AsyncIterable<Uint8Array>;
  readFileDataByMaintypeSubtypeStream?(maintype: string, subtype: string, chunkSize?: number): AsyncIterable<Uint8Array>;
}

function readUint32LE(buffer: Uint8Array, offset: number): number {
  return (
    buffer[offset] |
    (buffer[offset + 1] << 8) |
    (buffer[offset + 2] << 16) |
    (buffer[offset + 3] << 24)
  ) >>> 0;
}

function shouldSkipPartition(partitionName: string): boolean {
  const upperName = partitionName.toUpperCase();
  return SKIP_PARTITIONS.some(skip => upperName.startsWith(skip.toUpperCase()));
}

async function checkUbifsMagic(
  dataProvider: UbifsDataProvider,
  downloadFilename: string,
  downloadSubtype: string
): Promise<boolean> {
  let dataStream: AsyncIterable<Uint8Array> | null = null;

  if (dataProvider.readFileDataByMaintypeSubtypeStream) {
    try {
      dataStream = dataProvider.readFileDataByMaintypeSubtypeStream(
        ITEM_ROOTFSFAT16,
        downloadSubtype,
        UBIFS_CHECK_BUFFER_SIZE
      );
    } catch {
      dataStream = null;
    }
  }

  if (!dataStream && dataProvider.readFileDataByFilenameStream) {
    try {
      dataStream = dataProvider.readFileDataByFilenameStream(
        downloadFilename,
        UBIFS_CHECK_BUFFER_SIZE
      );
    } catch {
      dataStream = null;
    }
  }

  if (!dataStream) {
    return false;
  }

  try {
    for await (const chunk of dataStream) {
      if (chunk.length >= 4) {
        const magic = readUint32LE(chunk, 0);
        return magic === UBIFS_NODE_MAGIC;
      }
      return false;
    }
  } catch {
    return false;
  }

  return false;
}

export async function setUbifsInterface(
  ctx: EfexContext,
  partitions: UbifsPartitionInfo[],
  dataProvider: UbifsDataProvider,
  storageType: StorageType,
  options?: DeviceOpsOptions
): Promise<SetUbifsInterfaceResult> {
  const { onLog } = options || {};

  if (storageType === StorageType.SDCARD || storageType === StorageType.SD1) {
    onLog?.('info', i18n.t('device.setUbifsInterface.sdcardSkip'));
    return { success: true, found: false };
  }

  if (partitions.length === 0) {
    onLog?.('info', i18n.t('device.setUbifsInterface.noPartitions'));
    return { success: true, found: false };
  }

  for (const partitionInfo of partitions) {
    const partitionName = partitionInfo.partition.name;

    if (shouldSkipPartition(partitionName)) {
      continue;
    }

    onLog?.('info', i18n.t('device.setUbifsInterface.checking', { name: partitionName }));

    const isUbifs = await checkUbifsMagic(
      dataProvider,
      partitionInfo.downloadFilename,
      partitionInfo.downloadSubtype
    );

    if (isUbifs) {
      onLog?.('info', i18n.t('device.setUbifsInterface.found', { name: partitionName }));

      const buffer = new Uint8Array(UBIFS_CHECK_BUFFER_SIZE);

      try {
        await ctx.fes.down(buffer, 0, 'ext4_ubifs');
      } catch (error) {
        onLog?.('error', i18n.t('device.setUbifsInterface.failed', { name: partitionName, error }));
        return { success: false, found: true, partitionName };
      }

      onLog?.('info', i18n.t('device.setUbifsInterface.success', { name: partitionName }));
      return { success: true, found: true, partitionName };
    }
  }

  onLog?.('info', i18n.t('device.setUbifsInterface.notFound'));
  return { success: true, found: false };
}
