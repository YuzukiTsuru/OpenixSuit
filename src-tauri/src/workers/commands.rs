use std::fs::File;
use std::io::{Read, Seek, SeekFrom};
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::Duration;

use tauri::{AppHandle, Emitter, Runtime};

use super::types::{
    DownloadLogEvent, DownloadPartitionResult, DownloadPartitionsRequest, DownloadPartitionsResult,
    DownloadProgressEvent, PartitionDownloadInfo,
};
use crate::efex::error::EfexError;
use crate::efex::function::EfexFunction;

static DOWNLOAD_CANCELLED: AtomicBool = AtomicBool::new(false);
const CHUNK_SIZE: u64 = 256 * 1024 * 1024;

#[tauri::command]
pub fn download_partitions_cancel() {
    DOWNLOAD_CANCELLED.store(true, Ordering::SeqCst);
}

fn check_cancelled() -> Result<(), EfexError> {
    if DOWNLOAD_CANCELLED.load(Ordering::SeqCst) {
        DOWNLOAD_CANCELLED.store(false, Ordering::SeqCst);
        return Err(EfexError {
            code: -1000,
            name: "Cancelled".to_string(),
            message: "Download operation cancelled by user".to_string(),
        });
    }
    Ok(())
}

fn emit_progress<R: Runtime>(
    app_handle: &AppHandle<R>,
    stage: &str,
    progress: u32,
    partition_name: &str,
    bytes_written: u64,
    total_bytes: u64,
) {
    let event = DownloadProgressEvent {
        stage: stage.to_string(),
        progress,
        partition_name: partition_name.to_string(),
        bytes_written,
        total_bytes,
    };
    let _ = app_handle.emit("download-progress", event);
}

fn emit_log<R: Runtime>(app_handle: &AppHandle<R>, level: &str, message: &str) {
    let event = DownloadLogEvent {
        level: level.to_string(),
        message: message.to_string(),
    };
    let _ = app_handle.emit("download-log", event);
}

struct IncrementalChecksum {
    sum: u32,
    pending_bytes: Vec<u8>,
}

impl IncrementalChecksum {
    fn new() -> Self {
        IncrementalChecksum {
            sum: 0,
            pending_bytes: Vec::new(),
        }
    }

    fn update(&mut self, data: &[u8]) {
        let buffer = if !self.pending_bytes.is_empty() {
            let mut combined = self.pending_bytes.clone();
            combined.extend_from_slice(data);
            self.pending_bytes.clear();
            combined
        } else {
            data.to_vec()
        };

        let aligned_length = buffer.len() & !0x03;
        let remaining = buffer.len() & 0x03;

        for i in (0..aligned_length).step_by(4) {
            let value =
                u32::from_le_bytes([buffer[i], buffer[i + 1], buffer[i + 2], buffer[i + 3]]);
            self.sum = self.sum.wrapping_add(value);
        }

        if remaining > 0 {
            self.pending_bytes = buffer[aligned_length..].to_vec();
        }
    }

    fn finalize(&mut self) -> u32 {
        if !self.pending_bytes.is_empty() {
            let last_value: u32 = match self.pending_bytes.len() {
                1 => self.pending_bytes[0] as u32 & 0x000000ff,
                2 => {
                    (self.pending_bytes[0] as u32 | (self.pending_bytes[1] as u32) << 8)
                        & 0x0000ffff
                }
                3 => {
                    (self.pending_bytes[0] as u32
                        | (self.pending_bytes[1] as u32) << 8
                        | (self.pending_bytes[2] as u32) << 16)
                        & 0x00ffffff
                }
                _ => 0,
            };
            self.sum = self.sum.wrapping_add(last_value);
            self.pending_bytes.clear();
        }
        self.sum
    }
}

async fn download_single_partition<R: Runtime>(
    app_handle: &AppHandle<R>,
    partition_info: &PartitionDownloadInfo,
    file: &mut File,
    total_bytes: u64,
    written_bytes: &mut u64,
) -> Result<DownloadPartitionResult, EfexError> {
    let partition = &partition_info.partition;
    let partition_name = partition.name.clone();
    let data_offset = partition_info.data_offset;
    let data_length = partition_info.data_length;

    emit_log(
        app_handle,
        "info",
        &format!("Starting partition download: {}", partition_name),
    );
    emit_log(
        app_handle,
        "info",
        &format!("Partition address: 0x{:x}", partition.address),
    );
    emit_log(
        app_handle,
        "info",
        &format!("Partition size: {} sectors", partition.length),
    );
    emit_log(
        app_handle,
        "info",
        &format!(
            "Data offset: {}, Data length: {} bytes",
            data_offset, data_length
        ),
    );

    let part_size = partition.length * 512;

    if data_length > part_size {
        emit_log(
            app_handle,
            "error",
            &format!(
                "Data size {} exceeds partition size {}",
                data_length, part_size
            ),
        );
        return Ok(DownloadPartitionResult {
            success: false,
            bytes_written: 0,
            partition_name,
        });
    }

    file.seek(SeekFrom::Start(data_offset))
        .map_err(|e| EfexError {
            code: -1,
            name: "FileSeek".to_string(),
            message: format!("Failed to seek file offset: {}", e),
        })?;

    let start_sector = partition.address as u32;
    let mut checksum = if partition_info.need_verify {
        Some(IncrementalChecksum::new())
    } else {
        None
    };

    let total_chunks = data_length.div_ceil(CHUNK_SIZE);

    let written_bytes_value = *written_bytes;
    let download_timeout_secs = (data_length as f64 / (100.0 * 1024.0)).max(60.0) as u64;
    let mut total_written: u64 = 0;

    for chunk_index in 0..total_chunks {
        check_cancelled()?;

        let chunk_offset = (chunk_index * CHUNK_SIZE) as usize;
        let chunk_size = std::cmp::min(
            CHUNK_SIZE as usize,
            (data_length as usize).saturating_sub(chunk_offset),
        );

        file.seek(SeekFrom::Start(data_offset + chunk_offset as u64))
            .map_err(|e| EfexError {
                code: -1,
                name: "FileSeek".to_string(),
                message: format!("Failed to seek file offset: {}", e),
            })?;

        let mut chunk_data = vec![0u8; chunk_size];
        file.read_exact(&mut chunk_data).map_err(|e| EfexError {
            code: -1,
            name: "FileRead".to_string(),
            message: format!("Failed to read file data: {}", e),
        })?;

        if let Some(ref mut cs) = checksum {
            cs.update(&chunk_data);
        }

        let partition_name_clone = partition_name.clone();
        let app_handle_clone = app_handle.clone();

        let chunk_start_sector = start_sector + (chunk_offset / 512) as u32;
        let download_result = tokio::time::timeout(
            Duration::from_secs(download_timeout_secs / total_chunks.max(1) + 30),
            tokio::task::spawn_blocking(move || {
                let func = EfexFunction::new();

                let result = func.fes_down_with_progress(
                    &chunk_data,
                    chunk_start_sector,
                    |written, _total| {
                        let chunk_written = written_bytes_value + total_written + written;
                        let progress = if total_bytes > 0 {
                            ((chunk_written * 100) / total_bytes) as u32
                        } else {
                            0
                        };

                        let written_mb = chunk_written as f64 / (1024.0 * 1024.0);
                        let total_mb = total_bytes as f64 / (1024.0 * 1024.0);
                        let stage = format!(
                            "Downloading {} ({:.1}MB / {:.1}MB)",
                            partition_name_clone, written_mb, total_mb
                        );

                        emit_progress(
                            &app_handle_clone,
                            &stage,
                            progress,
                            &partition_name_clone,
                            chunk_written,
                            total_bytes,
                        );
                    },
                );

                result
            }),
        )
        .await;

        match download_result {
            Ok(Ok(Ok(written))) => {
                total_written += written;
            }
            Ok(Ok(Err(e))) => {
                emit_log(
                    app_handle,
                    "error",
                    &format!(
                        "Partition {} download failed: {}",
                        partition_name, e.message
                    ),
                );
                return Ok(DownloadPartitionResult {
                    success: false,
                    bytes_written: *written_bytes + total_written,
                    partition_name,
                });
            }
            Ok(Err(e)) => {
                emit_log(app_handle, "error", &format!("Download task error: {}", e));
                return Ok(DownloadPartitionResult {
                    success: false,
                    bytes_written: *written_bytes + total_written,
                    partition_name,
                });
            }
            Err(_) => {
                emit_log(app_handle, "error", "Download timeout");
                return Ok(DownloadPartitionResult {
                    success: false,
                    bytes_written: *written_bytes + total_written,
                    partition_name,
                });
            }
        }
    }

    if partition_info.need_verify {
        check_cancelled()?;
        emit_log(app_handle, "info", &format!("Verifying {}", partition_name));
        let cumulative_written = *written_bytes + total_written;
        emit_progress(
            app_handle,
            &format!("Verifying {}", partition_name),
            ((cumulative_written * 100) / total_bytes) as u32,
            &partition_name,
            cumulative_written,
            total_bytes,
        );

        let local_checksum = checksum.as_mut().map(|cs| cs.finalize()).unwrap_or(0);

        let size_mb = data_length as f64 / (1024.0 * 1024.0);
        let verify_timeout = Duration::from_secs((size_mb * 4.0).clamp(10.0, 120.0) as u64);

        let addr = partition.address as u32;
        let size = data_length;

        let verify_result = tokio::time::timeout(
            verify_timeout,
            tokio::task::spawn_blocking(move || {
                let func = EfexFunction::new();
                func.fes_verify_value(addr, size)
            }),
        )
        .await;

        if let Ok(Ok(Ok(verify_resp))) = verify_result {
            let media_crc = verify_resp.media_crc as u32;
            if local_checksum != media_crc {
                emit_log(
                    app_handle,
                    "warn",
                    &format!(
                        "Partition {} checksum mismatch: local=0x{:x}, device=0x{:x}",
                        partition_name, local_checksum, media_crc
                    ),
                );
            } else {
                emit_log(
                    app_handle,
                    "info",
                    &format!("Partition {} verification successful", partition_name),
                );
            }
        } else {
            let msg = if verify_result.is_err() {
                "timeout"
            } else {
                "failed"
            };
            emit_log(
                app_handle,
                "warn",
                &format!("分区 {} 验证{}", partition_name, msg),
            );
        }
    }

    emit_log(
        app_handle,
        "info",
        &format!(
            "Partition {} download completed, {} bytes written",
            partition_name, total_written
        ),
    );

    Ok(DownloadPartitionResult {
        success: true,
        bytes_written: total_written,
        partition_name,
    })
}

#[tauri::command]
pub async fn download_partitions<R: Runtime>(
    app_handle: AppHandle<R>,
    request: DownloadPartitionsRequest,
) -> Result<DownloadPartitionsResult, EfexError> {
    DOWNLOAD_CANCELLED.store(false, Ordering::SeqCst);

    let partitions = request.partitions;
    let firmware_path = request.firmware_path;

    emit_log(
        &app_handle,
        "info",
        &format!("Opening firmware file: {}", firmware_path),
    );

    let mut file = File::open(&firmware_path).map_err(|e| EfexError {
        code: -1,
        name: "FileOpen".to_string(),
        message: format!("Failed to open firmware file: {}", e),
    })?;

    emit_log(&app_handle, "info", "Firmware file opened successfully");

    let total_bytes: u64 = partitions.iter().map(|p| p.data_length).sum();

    emit_log(
        &app_handle,
        "info",
        &format!("Total bytes to download: {}", total_bytes),
    );

    emit_progress(&app_handle, "Preparing download...", 0, "", 0, total_bytes);

    let mut results: Vec<DownloadPartitionResult> = Vec::new();
    let mut all_success = true;
    let mut written_bytes: u64 = 0;

    for partition_info in partitions.iter() {
        check_cancelled()?;

        if partition_info.data_length == 0 {
            emit_log(
                &app_handle,
                "error",
                &format!(
                    "Partition {} data length is 0",
                    partition_info.partition.name
                ),
            );
            results.push(DownloadPartitionResult {
                success: false,
                bytes_written: 0,
                partition_name: partition_info.partition.name.clone(),
            });
            all_success = false;
            break;
        }

        let result = download_single_partition(
            &app_handle,
            partition_info,
            &mut file,
            total_bytes,
            &mut written_bytes,
        )
        .await?;

        let success = result.success;
        written_bytes += result.bytes_written;
        results.push(result);

        if !success {
            all_success = false;
            emit_log(
                &app_handle,
                "error",
                &format!(
                    "Partition {} download failed",
                    partition_info.partition.name
                ),
            );
            break;
        }
    }

    emit_progress(
        &app_handle,
        if all_success {
            "Download completed"
        } else {
            "Download failed"
        },
        if all_success { 100 } else { 0 },
        "",
        written_bytes,
        total_bytes,
    );

    Ok(DownloadPartitionsResult {
        success: all_success,
        results,
    })
}
