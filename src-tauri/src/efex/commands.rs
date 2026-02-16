use std::sync::atomic::{AtomicU32, AtomicU64, Ordering};
use std::sync::Mutex;
use std::time::Duration;

use super::error::EfexError;
use super::types::{DeviceMode, EfexDevice, FesDataType, FesToolMode, FesVerifyResp, UsbBackend};

static DEVICE_COUNTER: AtomicU32 = AtomicU32::new(0);
static FEL_WRITE_TIMEOUT_SECS: AtomicU64 = AtomicU64::new(1);
static FES_TIMEOUT_SECS: AtomicU64 = AtomicU64::new(1);

lazy_static::lazy_static! {
    static ref DEVICE_HANDLES: Mutex<Vec<u32>> = Mutex::new(Vec::new());
}

const TIMEOUT_DURATION: Duration = Duration::from_secs(1);

fn get_fel_write_timeout() -> Duration {
    Duration::from_secs(FEL_WRITE_TIMEOUT_SECS.load(Ordering::SeqCst))
}

fn get_fes_timeout() -> Duration {
    Duration::from_secs(FES_TIMEOUT_SECS.load(Ordering::SeqCst))
}

#[tauri::command]
pub fn efex_set_fel_write_timeout(timeout_secs: u64) {
    FEL_WRITE_TIMEOUT_SECS.store(timeout_secs, Ordering::SeqCst);
}

#[tauri::command]
pub fn efex_set_fes_timeout(timeout_secs: u64) {
    FES_TIMEOUT_SECS.store(timeout_secs, Ordering::SeqCst);
}

#[tauri::command]
pub fn efex_set_usb_backend(backend: UsbBackend) -> Result<(), EfexError> {
    libefex::Context::set_usb_backend_static(backend.into()).map_err(EfexError::from)?;
    Ok(())
}

#[tauri::command]
pub fn efex_get_usb_backend() -> UsbBackend {
    let backend = libefex::Context::get_usb_backend_static();
    backend.into()
}

#[tauri::command]
pub async fn efex_scan_devices() -> Result<Vec<EfexDevice>, EfexError> {
    tokio::time::timeout(
        TIMEOUT_DURATION,
        tokio::task::spawn_blocking(|| {
            let mut ctx = libefex::Context::new();

            ctx.scan_usb_device().map_err(EfexError::from)?;

            ctx.usb_init().map_err(EfexError::from)?;

            ctx.efex_init().map_err(EfexError::from)?;

            let mode: DeviceMode = ctx.get_device_mode().into();
            let mode_str = ctx.get_device_mode_str().to_string();
            let chip_version = unsafe { (*ctx.as_ptr()).resp.id };

            let device = EfexDevice {
                chip_version,
                mode: mode.as_str().to_string(),
                mode_str,
            };

            Ok(vec![device])
        }),
    )
    .await
    .map_err(|_| EfexError::timeout("扫描设备超时"))?
    .map_err(|e| EfexError {
        code: -1,
        name: "TaskError".to_string(),
        message: e.to_string(),
    })?
}

#[tauri::command]
pub fn efex_open_device() -> Result<u32, EfexError> {
    let handle = DEVICE_COUNTER.fetch_add(1, Ordering::SeqCst);

    let mut handles = DEVICE_HANDLES.lock().unwrap();
    handles.push(handle);

    Ok(handle)
}

#[tauri::command]
pub fn efex_close_device(handle: u32) -> Result<(), EfexError> {
    let mut handles = DEVICE_HANDLES.lock().unwrap();
    handles.retain(|&h| h != handle);
    Ok(())
}

#[tauri::command]
pub async fn efex_get_device_mode() -> Result<String, EfexError> {
    tokio::time::timeout(
        TIMEOUT_DURATION,
        tokio::task::spawn_blocking(|| {
            let mut ctx = libefex::Context::new();

            ctx.scan_usb_device().map_err(EfexError::from)?;

            ctx.usb_init().map_err(EfexError::from)?;

            ctx.efex_init().map_err(EfexError::from)?;

            let mode: DeviceMode = ctx.get_device_mode().into();
            Ok(mode.as_str().to_string())
        }),
    )
    .await
    .map_err(|_| EfexError::timeout("获取设备模式超时"))?
    .map_err(|e| EfexError {
        code: -1,
        name: "TaskError".to_string(),
        message: e.to_string(),
    })?
}

#[tauri::command]
pub async fn efex_get_device_mode_str() -> Result<String, EfexError> {
    tokio::time::timeout(
        TIMEOUT_DURATION,
        tokio::task::spawn_blocking(|| {
            let mut ctx = libefex::Context::new();

            ctx.scan_usb_device().map_err(EfexError::from)?;

            ctx.usb_init().map_err(EfexError::from)?;

            ctx.efex_init().map_err(EfexError::from)?;

            Ok(ctx.get_device_mode_str().to_string())
        }),
    )
    .await
    .map_err(|_| EfexError::timeout("获取设备模式字符串超时"))?
    .map_err(|e| EfexError {
        code: -1,
        name: "TaskError".to_string(),
        message: e.to_string(),
    })?
}

#[tauri::command]
pub async fn efex_fel_read(addr: u32, len: usize) -> Result<Vec<u8>, EfexError> {
    tokio::time::timeout(
        TIMEOUT_DURATION,
        tokio::task::spawn_blocking(move || {
            let mut ctx = libefex::Context::new();

            ctx.scan_usb_device().map_err(EfexError::from)?;

            ctx.usb_init().map_err(EfexError::from)?;

            ctx.efex_init().map_err(EfexError::from)?;

            let mut buf = vec![0u8; len];
            ctx.fel_read(addr, &mut buf).map_err(EfexError::from)?;

            Ok(buf)
        }),
    )
    .await
    .map_err(|_| EfexError::timeout("读取内存超时"))?
    .map_err(|e| EfexError {
        code: -1,
        name: "TaskError".to_string(),
        message: e.to_string(),
    })?
}

#[tauri::command]
pub async fn efex_fel_write(addr: u32, data: Vec<u8>) -> Result<(), EfexError> {
    let timeout = get_fel_write_timeout();
    tokio::time::timeout(
        timeout,
        tokio::task::spawn_blocking(move || {
            let mut ctx = libefex::Context::new();

            ctx.scan_usb_device().map_err(EfexError::from)?;

            ctx.usb_init().map_err(EfexError::from)?;

            ctx.efex_init().map_err(EfexError::from)?;

            ctx.fel_write(addr, &data).map_err(EfexError::from)?;

            Ok(())
        }),
    )
    .await
    .map_err(|_| EfexError::timeout("写入内存超时"))?
    .map_err(|e| EfexError {
        code: -1,
        name: "TaskError".to_string(),
        message: e.to_string(),
    })?
}

#[tauri::command]
pub async fn efex_fel_exec(addr: u32) -> Result<(), EfexError> {
    tokio::time::timeout(
        TIMEOUT_DURATION,
        tokio::task::spawn_blocking(move || {
            let mut ctx = libefex::Context::new();

            ctx.scan_usb_device().map_err(EfexError::from)?;

            ctx.usb_init().map_err(EfexError::from)?;

            ctx.efex_init().map_err(EfexError::from)?;

            ctx.fel_exec(addr).map_err(EfexError::from)?;

            Ok(())
        }),
    )
    .await
    .map_err(|_| EfexError::timeout("跳转执行超时"))?
    .map_err(|e| EfexError {
        code: -1,
        name: "TaskError".to_string(),
        message: e.to_string(),
    })?
}

#[tauri::command]
pub async fn efex_fes_query_storage() -> Result<u32, EfexError> {
    let timeout = get_fes_timeout();
    tokio::time::timeout(
        timeout,
        tokio::task::spawn_blocking(|| {
            let mut ctx = libefex::Context::new();

            ctx.scan_usb_device().map_err(EfexError::from)?;

            ctx.usb_init().map_err(EfexError::from)?;

            ctx.efex_init().map_err(EfexError::from)?;

            let storage_type = ctx.fes_query_storage().map_err(EfexError::from)?;

            Ok(storage_type)
        }),
    )
    .await
    .map_err(|_| EfexError::timeout("查询存储器超时"))?
    .map_err(|e| EfexError {
        code: -1,
        name: "TaskError".to_string(),
        message: e.to_string(),
    })?
}

#[tauri::command]
pub async fn efex_fes_query_secure() -> Result<u32, EfexError> {
    let timeout = get_fes_timeout();
    tokio::time::timeout(
        timeout,
        tokio::task::spawn_blocking(|| {
            let mut ctx = libefex::Context::new();

            ctx.scan_usb_device().map_err(EfexError::from)?;

            ctx.usb_init().map_err(EfexError::from)?;

            ctx.efex_init().map_err(EfexError::from)?;

            let secure_type = ctx.fes_query_secure().map_err(EfexError::from)?;

            Ok(secure_type)
        }),
    )
    .await
    .map_err(|_| EfexError::timeout("查询安全状态超时"))?
    .map_err(|e| EfexError {
        code: -1,
        name: "TaskError".to_string(),
        message: e.to_string(),
    })?
}

#[tauri::command]
pub async fn efex_fes_probe_flash_size() -> Result<u32, EfexError> {
    let timeout = get_fes_timeout();
    tokio::time::timeout(
        timeout,
        tokio::task::spawn_blocking(|| {
            let mut ctx = libefex::Context::new();

            ctx.scan_usb_device().map_err(EfexError::from)?;

            ctx.usb_init().map_err(EfexError::from)?;

            ctx.efex_init().map_err(EfexError::from)?;

            let flash_size = ctx.fes_probe_flash_size().map_err(EfexError::from)?;

            Ok(flash_size)
        }),
    )
    .await
    .map_err(|_| EfexError::timeout("探测Flash大小超时"))?
    .map_err(|e| EfexError {
        code: -1,
        name: "TaskError".to_string(),
        message: e.to_string(),
    })?
}

#[tauri::command]
pub async fn efex_fes_flash_set_onoff(storage_type: u32, on_off: bool) -> Result<(), EfexError> {
    let timeout = get_fes_timeout();
    tokio::time::timeout(
        timeout,
        tokio::task::spawn_blocking(move || {
            let mut ctx = libefex::Context::new();

            ctx.scan_usb_device().map_err(EfexError::from)?;

            ctx.usb_init().map_err(EfexError::from)?;

            ctx.efex_init().map_err(EfexError::from)?;

            ctx.fes_flash_set_onoff(storage_type, on_off)
                .map_err(EfexError::from)?;

            Ok(())
        }),
    )
    .await
    .map_err(|_| EfexError::timeout("设置Flash开关超时"))?
    .map_err(|e| EfexError {
        code: -1,
        name: "TaskError".to_string(),
        message: e.to_string(),
    })?
}

#[tauri::command]
pub async fn efex_fes_get_chipid() -> Result<String, EfexError> {
    let timeout = get_fes_timeout();
    tokio::time::timeout(
        timeout,
        tokio::task::spawn_blocking(|| {
            let mut ctx = libefex::Context::new();

            ctx.scan_usb_device().map_err(EfexError::from)?;

            ctx.usb_init().map_err(EfexError::from)?;

            ctx.efex_init().map_err(EfexError::from)?;

            let chip_id = ctx.fes_get_chipid().map_err(EfexError::from)?;

            Ok(chip_id)
        }),
    )
    .await
    .map_err(|_| EfexError::timeout("获取Chip ID超时"))?
    .map_err(|e| EfexError {
        code: -1,
        name: "TaskError".to_string(),
        message: e.to_string(),
    })?
}

#[tauri::command]
pub async fn efex_fes_down(buf: Vec<u8>, addr: u32, data_type: u32) -> Result<(), EfexError> {
    let fes_data_type = FesDataType::from(data_type);
    let timeout = get_fes_timeout();
    tokio::time::timeout(
        timeout,
        tokio::task::spawn_blocking(move || {
            let mut ctx = libefex::Context::new();

            ctx.scan_usb_device().map_err(EfexError::from)?;

            ctx.usb_init().map_err(EfexError::from)?;

            ctx.efex_init().map_err(EfexError::from)?;

            ctx.fes_down(&buf, addr, fes_data_type.into())
                .map_err(EfexError::from)?;

            Ok(())
        }),
    )
    .await
    .map_err(|_| EfexError::timeout("下载数据超时"))?
    .map_err(|e| EfexError {
        code: -1,
        name: "TaskError".to_string(),
        message: e.to_string(),
    })?
}

impl From<u32> for FesDataType {
    fn from(value: u32) -> Self {
        match value {
            0x0 => FesDataType::None,
            0x7f00 => FesDataType::Dram,
            0x7f01 => FesDataType::Mbr,
            0x7f02 => FesDataType::Boot1,
            0x7f03 => FesDataType::Boot0,
            0x7f04 => FesDataType::Erase,
            0x7f10 => FesDataType::FullImgSize,
            0x7ff0 => FesDataType::Ext4Ubifs,
            0x8000 => FesDataType::Flash,
            _ => FesDataType::None,
        }
    }
}

#[tauri::command]
pub async fn efex_fes_up(len: usize, addr: u32, data_type: u32) -> Result<Vec<u8>, EfexError> {
    let fes_data_type = FesDataType::from(data_type);
    let timeout = get_fes_timeout();
    tokio::time::timeout(
        timeout,
        tokio::task::spawn_blocking(move || {
            let mut ctx = libefex::Context::new();

            ctx.scan_usb_device().map_err(EfexError::from)?;

            ctx.usb_init().map_err(EfexError::from)?;

            ctx.efex_init().map_err(EfexError::from)?;

            let mut buf = vec![0u8; len];
            ctx.fes_up(&mut buf, addr, fes_data_type.into())
                .map_err(EfexError::from)?;

            Ok(buf)
        }),
    )
    .await
    .map_err(|_| EfexError::timeout("上传数据超时"))?
    .map_err(|e| EfexError {
        code: -1,
        name: "TaskError".to_string(),
        message: e.to_string(),
    })?
}

#[tauri::command]
pub async fn efex_fes_verify_value(addr: u32, size: u64) -> Result<FesVerifyResp, EfexError> {
    let timeout = get_fes_timeout();
    tokio::time::timeout(
        timeout,
        tokio::task::spawn_blocking(move || {
            let mut ctx = libefex::Context::new();

            ctx.scan_usb_device().map_err(EfexError::from)?;

            ctx.usb_init().map_err(EfexError::from)?;

            ctx.efex_init().map_err(EfexError::from)?;

            let resp = ctx.fes_verify_value(addr, size).map_err(EfexError::from)?;

            Ok(resp.into())
        }),
    )
    .await
    .map_err(|_| EfexError::timeout("验证数据超时"))?
    .map_err(|e| EfexError {
        code: -1,
        name: "TaskError".to_string(),
        message: e.to_string(),
    })?
}

#[tauri::command]
pub async fn efex_fes_verify_status(tag: u32) -> Result<FesVerifyResp, EfexError> {
    let timeout = get_fes_timeout();
    tokio::time::timeout(
        timeout,
        tokio::task::spawn_blocking(move || {
            let mut ctx = libefex::Context::new();

            ctx.scan_usb_device().map_err(EfexError::from)?;

            ctx.usb_init().map_err(EfexError::from)?;

            ctx.efex_init().map_err(EfexError::from)?;

            let resp = ctx.fes_verify_status(tag).map_err(EfexError::from)?;

            Ok(resp.into())
        }),
    )
    .await
    .map_err(|_| EfexError::timeout("验证状态超时"))?
    .map_err(|e| EfexError {
        code: -1,
        name: "TaskError".to_string(),
        message: e.to_string(),
    })?
}

#[tauri::command]
pub async fn efex_fes_verify_uboot_blk(tag: u32) -> Result<FesVerifyResp, EfexError> {
    let timeout = get_fes_timeout();
    tokio::time::timeout(
        timeout,
        tokio::task::spawn_blocking(move || {
            let mut ctx = libefex::Context::new();

            ctx.scan_usb_device().map_err(EfexError::from)?;

            ctx.usb_init().map_err(EfexError::from)?;

            ctx.efex_init().map_err(EfexError::from)?;

            let resp = ctx.fes_verify_uboot_blk(tag).map_err(EfexError::from)?;

            Ok(resp.into())
        }),
    )
    .await
    .map_err(|_| EfexError::timeout("验证U-Boot块超时"))?
    .map_err(|e| EfexError {
        code: -1,
        name: "TaskError".to_string(),
        message: e.to_string(),
    })?
}

#[tauri::command]
pub async fn efex_fes_tool_mode(tool_mode: u32, next_mode: u32) -> Result<(), EfexError> {
    let tool_mode = FesToolMode::from(tool_mode);
    let next_mode = FesToolMode::from(next_mode);
    let timeout = get_fes_timeout();
    tokio::time::timeout(
        timeout,
        tokio::task::spawn_blocking(move || {
            let mut ctx = libefex::Context::new();

            ctx.scan_usb_device().map_err(EfexError::from)?;

            ctx.usb_init().map_err(EfexError::from)?;

            ctx.efex_init().map_err(EfexError::from)?;

            ctx.fes_tool_mode(tool_mode.into(), next_mode.into())
                .map_err(EfexError::from)?;

            Ok(())
        }),
    )
    .await
    .map_err(|_| EfexError::timeout("设置工具模式超时"))?
    .map_err(|e| EfexError {
        code: -1,
        name: "TaskError".to_string(),
        message: e.to_string(),
    })?
}

impl From<u32> for FesToolMode {
    fn from(value: u32) -> Self {
        match value {
            0x1 => FesToolMode::Normal,
            0x2 => FesToolMode::Reboot,
            0x3 => FesToolMode::Poweroff,
            0x4 => FesToolMode::Reupdate,
            0x5 => FesToolMode::Boot,
            _ => FesToolMode::Normal,
        }
    }
}

#[tauri::command]
pub fn efex_payloads_init(arch: String) -> Result<(), EfexError> {
    let payload_arch = match arch.as_str() {
        "arm32" => libefex::PayloadArch::Arm32,
        "aarch64" => libefex::PayloadArch::Aarch64,
        "riscv" => libefex::PayloadArch::Riscv,
        _ => {
            return Err(EfexError {
                code: -1,
                name: "InvalidParam".to_string(),
                message: format!("Unknown architecture: {}", arch),
            })
        }
    };

    libefex::payloads::init(payload_arch).map_err(EfexError::from)?;

    Ok(())
}

#[tauri::command]
pub async fn efex_payloads_readl(addr: u32) -> Result<u32, EfexError> {
    tokio::time::timeout(
        TIMEOUT_DURATION,
        tokio::task::spawn_blocking(move || {
            let mut ctx = libefex::Context::new();

            ctx.scan_usb_device().map_err(EfexError::from)?;

            ctx.usb_init().map_err(EfexError::from)?;

            ctx.efex_init().map_err(EfexError::from)?;

            let value = libefex::payloads::readl(&ctx, addr).map_err(EfexError::from)?;

            Ok(value)
        }),
    )
    .await
    .map_err(|_| EfexError::timeout("读取寄存器超时"))?
    .map_err(|e| EfexError {
        code: -1,
        name: "TaskError".to_string(),
        message: e.to_string(),
    })?
}

#[tauri::command]
pub async fn efex_payloads_writel(value: u32, addr: u32) -> Result<(), EfexError> {
    tokio::time::timeout(
        TIMEOUT_DURATION,
        tokio::task::spawn_blocking(move || {
            let mut ctx = libefex::Context::new();

            ctx.scan_usb_device().map_err(EfexError::from)?;

            ctx.usb_init().map_err(EfexError::from)?;

            ctx.efex_init().map_err(EfexError::from)?;

            libefex::payloads::writel(&ctx, value, addr).map_err(EfexError::from)?;

            Ok(())
        }),
    )
    .await
    .map_err(|_| EfexError::timeout("写入寄存器超时"))?
    .map_err(|e| EfexError {
        code: -1,
        name: "TaskError".to_string(),
        message: e.to_string(),
    })?
}
