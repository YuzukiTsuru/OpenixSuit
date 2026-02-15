use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EfexDevice {
    pub chip_version: u32,
    pub mode: String,
    pub mode_str: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum DeviceMode {
    Null,
    Fel,
    Srv,
    UpdateCool,
    UpdateHot,
    Unknown,
}

impl DeviceMode {
    pub fn as_str(&self) -> &'static str {
        match self {
            DeviceMode::Null => "null",
            DeviceMode::Fel => "fel",
            DeviceMode::Srv => "srv",
            DeviceMode::UpdateCool => "update_cool",
            DeviceMode::UpdateHot => "update_hot",
            DeviceMode::Unknown => "unknown",
        }
    }
}

impl From<libefex::DeviceMode> for DeviceMode {
    fn from(mode: libefex::DeviceMode) -> Self {
        match mode {
            libefex::DeviceMode::Null => DeviceMode::Null,
            libefex::DeviceMode::Fel => DeviceMode::Fel,
            libefex::DeviceMode::Srv => DeviceMode::Srv,
            libefex::DeviceMode::UpdateCool => DeviceMode::UpdateCool,
            libefex::DeviceMode::UpdateHot => DeviceMode::UpdateHot,
            libefex::DeviceMode::Unknown(_) => DeviceMode::Unknown,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum UsbBackend {
    Auto,
    Libusb,
    Winusb,
}

impl From<libefex::UsbBackend> for UsbBackend {
    fn from(backend: libefex::UsbBackend) -> Self {
        match backend {
            libefex::UsbBackend::Auto => UsbBackend::Auto,
            libefex::UsbBackend::Libusb => UsbBackend::Libusb,
            libefex::UsbBackend::Winusb => UsbBackend::Winusb,
        }
    }
}

impl From<UsbBackend> for libefex::UsbBackend {
    fn from(backend: UsbBackend) -> Self {
        match backend {
            UsbBackend::Auto => libefex::UsbBackend::Auto,
            UsbBackend::Libusb => libefex::UsbBackend::Libusb,
            UsbBackend::Winusb => libefex::UsbBackend::Winusb,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum FesDataType {
    None,
    Dram,
    Mbr,
    Boot1,
    Boot0,
    Erase,
    FullImgSize,
    Ext4Ubifs,
    Flash,
}

impl From<FesDataType> for libefex::FesDataType {
    fn from(data_type: FesDataType) -> Self {
        match data_type {
            FesDataType::None => libefex::FesDataType::None,
            FesDataType::Dram => libefex::FesDataType::Dram,
            FesDataType::Mbr => libefex::FesDataType::Mbr,
            FesDataType::Boot1 => libefex::FesDataType::Boot1,
            FesDataType::Boot0 => libefex::FesDataType::Boot0,
            FesDataType::Erase => libefex::FesDataType::Erase,
            FesDataType::FullImgSize => libefex::FesDataType::FullImgSize,
            FesDataType::Ext4Ubifs => libefex::FesDataType::Ext4Ubifs,
            FesDataType::Flash => libefex::FesDataType::Flash,
        }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum FesToolMode {
    Normal,
    Reboot,
    Poweroff,
    Reupdate,
    Boot,
}

impl From<FesToolMode> for libefex::FesToolMode {
    fn from(mode: FesToolMode) -> Self {
        match mode {
            FesToolMode::Normal => libefex::FesToolMode::Normal,
            FesToolMode::Reboot => libefex::FesToolMode::Reboot,
            FesToolMode::Poweroff => libefex::FesToolMode::PowerOff,
            FesToolMode::Reupdate => libefex::FesToolMode::Reupdate,
            FesToolMode::Boot => libefex::FesToolMode::Boot,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FesVerifyResp {
    pub flag: u32,
    pub fes_crc: i32,
    pub media_crc: i32,
}

impl From<libefex::FesVerifyResp> for FesVerifyResp {
    fn from(resp: libefex::FesVerifyResp) -> Self {
        FesVerifyResp {
            flag: resp.flag,
            fes_crc: resp.fes_crc,
            media_crc: resp.media_crc,
        }
    }
}
