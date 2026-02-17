use std::fs::File;
use std::io::{Read, Seek, SeekFrom, Write};
use std::path::PathBuf;
use tauri::command;

const CHUNK_SIZE: usize = 256 * 1024 * 1024;

#[derive(Debug, serde::Serialize, serde::Deserialize)]
pub struct ExtractResult {
    pub success: bool,
    pub message: String,
    pub bytes_written: u64,
}

#[command]
pub fn extract_file_chunked(
    source_path: String,
    dest_path: String,
    offset: u64,
    length: u64,
) -> Result<ExtractResult, String> {
    let source = PathBuf::from(&source_path);
    let dest = PathBuf::from(&dest_path);

    if !source.exists() {
        return Err(format!("Source file does not exist: {}", source_path));
    }

    let mut source_file =
        File::open(&source).map_err(|e| format!("Failed to open source file: {}", e))?;

    let mut dest_file =
        File::create(&dest).map_err(|e| format!("Failed to create destination file: {}", e))?;

    source_file
        .seek(SeekFrom::Start(offset))
        .map_err(|e| format!("Failed to seek to offset {}: {}", offset, e))?;

    let mut buffer = vec![0u8; CHUNK_SIZE];
    let mut remaining = length as usize;
    let mut total_written: u64 = 0;

    while remaining > 0 {
        let read_size = std::cmp::min(remaining, CHUNK_SIZE);
        let read_buffer = &mut buffer[..read_size];

        let bytes_read = source_file
            .read(read_buffer)
            .map_err(|e| format!("Failed to read from source: {}", e))?;

        if bytes_read == 0 {
            break;
        }

        dest_file
            .write_all(&read_buffer[..bytes_read])
            .map_err(|e| format!("Failed to write to destination: {}", e))?;

        remaining -= bytes_read;
        total_written += bytes_read as u64;
    }

    dest_file
        .flush()
        .map_err(|e| format!("Failed to flush destination file: {}", e))?;

    Ok(ExtractResult {
        success: true,
        message: format!("Successfully extracted {} bytes", total_written),
        bytes_written: total_written,
    })
}

#[derive(Debug, serde::Serialize, serde::Deserialize, Clone)]
pub struct FileExtractOptions {
    pub source_path: String,
    pub dest_path: String,
    pub offset: u64,
    pub length: u64,
}

#[command]
pub fn extract_files_batch(files: Vec<FileExtractOptions>) -> Result<Vec<ExtractResult>, String> {
    let mut results = Vec::with_capacity(files.len());

    for file_opt in files {
        let result = extract_file_chunked(
            file_opt.source_path,
            file_opt.dest_path,
            file_opt.offset,
            file_opt.length,
        )?;
        results.push(result);
    }

    Ok(results)
}

#[command]
pub fn get_file_size(path: String) -> Result<u64, String> {
    let path = PathBuf::from(&path);

    if !path.exists() {
        return Err(format!("File does not exist: {}", path.display()));
    }

    let metadata =
        std::fs::metadata(&path).map_err(|e| format!("Failed to get file metadata: {}", e))?;

    Ok(metadata.len())
}
