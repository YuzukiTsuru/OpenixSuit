use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EfexError {
    pub code: i32,
    pub name: String,
    pub message: String,
}

impl EfexError {
    pub fn from_libefex(error: &libefex::EfexError) -> Self {
        let (name, message) = match error {
            libefex::EfexError::InvalidParam => ("InvalidParam", "Invalid parameter"),
            libefex::EfexError::NullPtr => ("NullPtr", "Null pointer error"),
            libefex::EfexError::Memory => ("Memory", "Memory allocation error"),
            libefex::EfexError::NotSupported => ("NotSupported", "Operation not supported"),
            libefex::EfexError::UsbInit => ("UsbInit", "USB initialization failed"),
            libefex::EfexError::UsbDeviceNotFound => ("UsbDeviceNotFound", "Device not found"),
            libefex::EfexError::UsbOpen => ("UsbOpen", "Failed to open device"),
            libefex::EfexError::UsbTransfer => ("UsbTransfer", "USB transfer failed"),
            libefex::EfexError::UsbTimeout => ("UsbTimeout", "USB transfer timeout"),
            libefex::EfexError::Protocol => ("Protocol", "Protocol error"),
            libefex::EfexError::InvalidResponse => ("InvalidResponse", "Invalid response from device"),
            libefex::EfexError::UnexpectedStatus => ("UnexpectedStatus", "Unexpected status code"),
            libefex::EfexError::InvalidState => ("InvalidState", "Invalid device state"),
            libefex::EfexError::InvalidDeviceMode => ("InvalidDeviceMode", "Invalid device mode"),
            libefex::EfexError::OperationFailed => ("OperationFailed", "Operation failed"),
            libefex::EfexError::DeviceBusy => ("DeviceBusy", "Device is busy"),
            libefex::EfexError::DeviceNotReady => ("DeviceNotReady", "Device not ready"),
            libefex::EfexError::FlashAccess => ("FlashAccess", "Flash access error"),
            libefex::EfexError::FlashSizeProbe => ("FlashSizeProbe", "Flash size probing failed"),
            libefex::EfexError::FlashSetOnOff => ("FlashSetOnOff", "Failed to set flash on/off"),
            libefex::EfexError::Verification => ("Verification", "Verification failed"),
            libefex::EfexError::CrcMismatch => ("CrcMismatch", "CRC mismatch error"),
            libefex::EfexError::FileOpen => ("FileOpen", "Failed to open file"),
            libefex::EfexError::FileRead => ("FileRead", "Failed to read file"),
            libefex::EfexError::FileWrite => ("FileWrite", "Failed to write file"),
            libefex::EfexError::FileSize => ("FileSize", "File size error"),
            libefex::EfexError::Unknown(code) => ("Unknown", &format!("Unknown error: {}", code)),
        };
        
        let code = match error {
            libefex::EfexError::InvalidParam => -1,
            libefex::EfexError::NullPtr => -2,
            libefex::EfexError::Memory => -3,
            libefex::EfexError::NotSupported => -4,
            libefex::EfexError::UsbInit => -10,
            libefex::EfexError::UsbDeviceNotFound => -11,
            libefex::EfexError::UsbOpen => -12,
            libefex::EfexError::UsbTransfer => -13,
            libefex::EfexError::UsbTimeout => -14,
            libefex::EfexError::Protocol => -20,
            libefex::EfexError::InvalidResponse => -21,
            libefex::EfexError::UnexpectedStatus => -22,
            libefex::EfexError::InvalidState => -30,
            libefex::EfexError::InvalidDeviceMode => -31,
            libefex::EfexError::OperationFailed => -32,
            libefex::EfexError::DeviceBusy => -33,
            libefex::EfexError::DeviceNotReady => -34,
            libefex::EfexError::FlashAccess => -40,
            libefex::EfexError::FlashSizeProbe => -41,
            libefex::EfexError::FlashSetOnOff => -42,
            libefex::EfexError::Verification => -50,
            libefex::EfexError::CrcMismatch => -51,
            libefex::EfexError::FileOpen => -60,
            libefex::EfexError::FileRead => -61,
            libefex::EfexError::FileWrite => -62,
            libefex::EfexError::FileSize => -63,
            libefex::EfexError::Unknown(c) => *c,
        };
        
        EfexError {
            code,
            name: name.to_string(),
            message: message.to_string(),
        }
    }
}

impl From<libefex::EfexError> for EfexError {
    fn from(error: libefex::EfexError) -> Self {
        EfexError::from_libefex(&error)
    }
}
