import { invoke } from '@tauri-apps/api/core';
import { listen, UnlistenFn } from '@tauri-apps/api/event';
import { PartitionInfo } from '../FlashConfig/Types';
import { DeviceOpsOptions } from './Interface';
import i18n from '../i18n';

export interface PartitionDownloadInfo {
  partition: PartitionInfo;
  downloadFilename: string;
  downloadSubtype: string;
  needVerify: boolean;
  dataOffset: number;
  dataLength: number;
}

export interface DownloadPartitionResult {
  success: boolean;
  bytesWritten: bigint;
  partitionName: string;
}

export interface PartitionDataInfo {
  offset: number;
  length: number;
}

export interface PartitionDataProvider {
  getFileInfoByFilename?(filename: string): PartitionDataInfo | null;
  getFileInfoByMaintypeSubtype?(maintype: string, subtype: string): PartitionDataInfo | null;
  getFileDataByFilename?(filename: string): Promise<Uint8Array | null>;
  getFileDataByMaintypeSubtype?(maintype: string, subtype: string): Promise<Uint8Array | null>;
}

export interface ProgressCalculator {
  getTotalBytes(): bigint;
  getWrittenBytes(): bigint;
  addWrittenBytes(bytes: bigint): void;
  getProgress(): number;
  getStageMessage(partitionName: string): string;
}

export function createProgressCalculator(totalBytes: bigint): ProgressCalculator {
  let writtenBytes = BigInt(0);

  return {
    getTotalBytes() {
      return totalBytes;
    },
    getWrittenBytes() {
      return writtenBytes;
    },
    addWrittenBytes(bytes: bigint) {
      writtenBytes += bytes;
    },
    getProgress() {
      if (totalBytes === BigInt(0)) return 100;
      return Number((writtenBytes * 100n) / totalBytes);
    },
    getStageMessage(partitionName: string) {
      const writtenMB = Number(writtenBytes) / (1024 * 1024);
      const totalMB = Number(totalBytes) / (1024 * 1024);
      return i18n.t('device.downloadPartition.downloadingPartition', { name: partitionName, written: writtenMB.toFixed(1), total: totalMB.toFixed(1) });
    },
  };
}

interface RustPartitionInfo {
  name: string;
  classname: string;
  address: number;
  length: number;
  user_type: number;
  keydata: number;
  readonly: boolean;
}

interface RustPartitionDownloadInfo {
  partition: RustPartitionInfo;
  data_offset: number;
  data_length: number;
  need_verify: boolean;
}

interface RustDownloadPartitionResult {
  success: boolean;
  bytes_written: number;
  partition_name: string;
}

interface RustDownloadPartitionsRequest {
  partitions: RustPartitionDownloadInfo[];
  firmware_path: string;
}

interface RustDownloadPartitionsResult {
  success: boolean;
  results: RustDownloadPartitionResult[];
}

interface DownloadProgressEvent {
  stage: string;
  progress: number;
  partition_name: string;
  bytes_written: number;
  total_bytes: number;
}

interface DownloadLogEvent {
  level: string;
  message: string;
}

function toRustPartitionInfo(partition: PartitionInfo): RustPartitionInfo {
  return {
    name: partition.name,
    classname: partition.classname,
    address: Number(partition.address),
    length: Number(partition.length),
    user_type: partition.user_type,
    keydata: partition.keydata,
    readonly: partition.readonly,
  };
}

function toRustPartitionDownloadInfo(info: PartitionDownloadInfo): RustPartitionDownloadInfo {
  return {
    partition: toRustPartitionInfo(info.partition),
    data_offset: info.dataOffset,
    data_length: info.dataLength,
    need_verify: info.needVerify,
  };
}

function fromRustDownloadResult(result: RustDownloadPartitionResult): DownloadPartitionResult {
  return {
    success: result.success,
    bytesWritten: BigInt(result.bytes_written),
    partitionName: result.partition_name,
  };
}

let progressUnlisten: UnlistenFn | null = null;
let logUnlisten: UnlistenFn | null = null;

async function setupDownloadListeners(
  onProgress?: (event: DownloadProgressEvent) => void,
  onLog?: (event: DownloadLogEvent) => void
): Promise<() => void> {
  if (progressUnlisten) {
    progressUnlisten();
    progressUnlisten = null;
  }
  if (logUnlisten) {
    logUnlisten();
    logUnlisten = null;
  }

  if (onProgress) {
    progressUnlisten = await listen<DownloadProgressEvent>('download-progress', (event) => {
      onProgress(event.payload);
    });
  }

  if (onLog) {
    logUnlisten = await listen<DownloadLogEvent>('download-log', (event) => {
      onLog(event.payload);
    });
  }

  return () => {
    if (progressUnlisten) {
      progressUnlisten();
      progressUnlisten = null;
    }
    if (logUnlisten) {
      logUnlisten();
      logUnlisten = null;
    }
  };
}

export async function cancelDownload(): Promise<void> {
  await invoke('download_partitions_cancel');
}

export async function downloadPartitions(
  firmwarePath: string,
  partitions: PartitionDownloadInfo[],
  options?: DeviceOpsOptions
): Promise<{ success: boolean; results: DownloadPartitionResult[] }> {
  const { onProgress, onLog } = options || {};

  const cleanup = await setupDownloadListeners(
    onProgress
      ? (event) => {
          onProgress(event.stage, event.progress);
        }
      : undefined,
    onLog
      ? (event) => {
          onLog(event.level as 'info' | 'error' | 'warn', event.message);
        }
      : undefined
  );

  try {
    const request: RustDownloadPartitionsRequest = {
      partitions: partitions.map(toRustPartitionDownloadInfo),
      firmware_path: firmwarePath,
    };

    const result = await invoke<RustDownloadPartitionsResult>('download_partitions', { request });

    return {
      success: result.success,
      results: result.results.map(fromRustDownloadResult),
    };
  } finally {
    cleanup();
  }
}

export { IncrementalChecksum } from '../Utils';
