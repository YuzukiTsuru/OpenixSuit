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
