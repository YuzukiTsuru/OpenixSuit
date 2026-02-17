use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PartitionInfo {
    pub name: String,
    pub classname: String,
    pub address: u64,
    pub length: u64,
    pub user_type: u32,
    pub keydata: u32,
    pub readonly: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PartitionDownloadInfo {
    pub partition: PartitionInfo,
    pub data_offset: u64,
    pub data_length: u64,
    pub need_verify: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadPartitionResult {
    pub success: bool,
    pub bytes_written: u64,
    pub partition_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadProgressEvent {
    pub stage: String,
    pub progress: u32,
    pub partition_name: String,
    pub bytes_written: u64,
    pub total_bytes: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadLogEvent {
    pub level: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadPartitionsRequest {
    pub partitions: Vec<PartitionDownloadInfo>,
    pub firmware_path: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DownloadPartitionsResult {
    pub success: bool,
    pub results: Vec<DownloadPartitionResult>,
}
