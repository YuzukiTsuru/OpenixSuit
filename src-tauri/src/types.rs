use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FlashDevice {
    pub id: String,
    pub name: String,
    #[serde(rename = "type")]
    pub device_type: String,
    pub status: String,
    pub info: Option<DeviceInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DeviceInfo {
    pub vendor: Option<String>,
    pub product: Option<String>,
    pub serial: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FlashProgress {
    pub percent: f64,
    pub stage: String,
    pub speed: Option<String>,
    pub current_partition: Option<String>,
    pub total_size: Option<u64>,
    pub written_size: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FlashLog {
    pub level: String,
    pub message: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FlashOptions {
    pub mode: String,
    pub partitions: Vec<String>,
    pub reload_image: bool,
    pub auto_flash: bool,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FlashMode {
    Partition,
    KeepData,
    PartitionErase,
    FullErase,
}

impl FlashMode {
    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "partition" => Some(Self::Partition),
            "keep_data" => Some(Self::KeepData),
            "partition_erase" => Some(Self::PartitionErase),
            "full_erase" => Some(Self::FullErase),
            _ => None,
        }
    }
}
