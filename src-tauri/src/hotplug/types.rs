use serde::{Deserialize, Serialize};

pub const SUNXI_USB_VENDOR: u16 = 0x1f3a;
pub const SUNXI_USB_PRODUCT: u16 = 0xefe8;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum UsbHotPlugEvent {
    Arrived,
    Left,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UsbHotPlugCallback {
    pub event: UsbHotPlugEvent,
    pub vendor_id: u16,
    pub product_id: u16,
}
