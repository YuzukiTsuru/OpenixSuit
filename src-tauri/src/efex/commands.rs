use std::sync::atomic::{AtomicU32, Ordering};
use std::sync::Mutex;
use std::time::Duration;

use super::error::EfexError;
use super::types::{DeviceMode, EfexDevice};

static DEVICE_COUNTER: AtomicU32 = AtomicU32::new(0);

lazy_static::lazy_static! {
    static ref DEVICE_HANDLES: Mutex<Vec<u32>> = Mutex::new(Vec::new());
}

const TIMEOUT_DURATION: Duration = Duration::from_secs(1);

#[tauri::command]
pub async fn efex_scan_devices() -> Result<Vec<EfexDevice>, EfexError> {
    tokio::time::timeout(TIMEOUT_DURATION, tokio::task::spawn_blocking(|| {
        let mut ctx = libefex::Context::new();
        
        ctx.scan_usb_device()
            .map_err(EfexError::from)?;
        
        ctx.usb_init()
            .map_err(EfexError::from)?;
        
        ctx.efex_init()
            .map_err(EfexError::from)?;
        
        let mode: DeviceMode = ctx.get_device_mode().into();
        let mode_str = ctx.get_device_mode_str().to_string();
        let chip_version = unsafe { (*ctx.as_ptr()).resp.id };
        
        let device = EfexDevice {
            chip_version,
            mode: mode.as_str().to_string(),
            mode_str,
        };
        
        Ok(vec![device])
    }))
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
    tokio::time::timeout(TIMEOUT_DURATION, tokio::task::spawn_blocking(|| {
        let mut ctx = libefex::Context::new();
        
        ctx.scan_usb_device()
            .map_err(EfexError::from)?;
        
        ctx.usb_init()
            .map_err(EfexError::from)?;
        
        ctx.efex_init()
            .map_err(EfexError::from)?;
        
        let mode: DeviceMode = ctx.get_device_mode().into();
        Ok(mode.as_str().to_string())
    }))
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
    tokio::time::timeout(TIMEOUT_DURATION, tokio::task::spawn_blocking(|| {
        let mut ctx = libefex::Context::new();
        
        ctx.scan_usb_device()
            .map_err(EfexError::from)?;
        
        ctx.usb_init()
            .map_err(EfexError::from)?;
        
        ctx.efex_init()
            .map_err(EfexError::from)?;
        
        Ok(ctx.get_device_mode_str().to_string())
    }))
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
    tokio::time::timeout(TIMEOUT_DURATION, tokio::task::spawn_blocking(move || {
        let mut ctx = libefex::Context::new();
        
        ctx.scan_usb_device()
            .map_err(EfexError::from)?;
        
        ctx.usb_init()
            .map_err(EfexError::from)?;
        
        ctx.efex_init()
            .map_err(EfexError::from)?;
        
        let mut buf = vec![0u8; len];
        ctx.fel_read(addr, &mut buf)
            .map_err(EfexError::from)?;
        
        Ok(buf)
    }))
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
    tokio::time::timeout(TIMEOUT_DURATION, tokio::task::spawn_blocking(move || {
        let mut ctx = libefex::Context::new();
        
        ctx.scan_usb_device()
            .map_err(EfexError::from)?;
        
        ctx.usb_init()
            .map_err(EfexError::from)?;
        
        ctx.efex_init()
            .map_err(EfexError::from)?;
        
        ctx.fel_write(addr, &data)
            .map_err(EfexError::from)?;
        
        Ok(())
    }))
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
    tokio::time::timeout(TIMEOUT_DURATION, tokio::task::spawn_blocking(move || {
        let mut ctx = libefex::Context::new();
        
        ctx.scan_usb_device()
            .map_err(EfexError::from)?;
        
        ctx.usb_init()
            .map_err(EfexError::from)?;
        
        ctx.efex_init()
            .map_err(EfexError::from)?;
        
        ctx.fel_exec(addr)
            .map_err(EfexError::from)?;
        
        Ok(())
    }))
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
    tokio::time::timeout(TIMEOUT_DURATION, tokio::task::spawn_blocking(|| {
        let mut ctx = libefex::Context::new();
        
        ctx.scan_usb_device()
            .map_err(EfexError::from)?;
        
        ctx.usb_init()
            .map_err(EfexError::from)?;
        
        ctx.efex_init()
            .map_err(EfexError::from)?;
        
        let storage_type = ctx.fes_query_storage()
            .map_err(EfexError::from)?;
        
        Ok(storage_type)
    }))
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
    tokio::time::timeout(TIMEOUT_DURATION, tokio::task::spawn_blocking(|| {
        let mut ctx = libefex::Context::new();
        
        ctx.scan_usb_device()
            .map_err(EfexError::from)?;
        
        ctx.usb_init()
            .map_err(EfexError::from)?;
        
        ctx.efex_init()
            .map_err(EfexError::from)?;
        
        let secure_type = ctx.fes_query_secure()
            .map_err(EfexError::from)?;
        
        Ok(secure_type)
    }))
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
    tokio::time::timeout(TIMEOUT_DURATION, tokio::task::spawn_blocking(|| {
        let mut ctx = libefex::Context::new();
        
        ctx.scan_usb_device()
            .map_err(EfexError::from)?;
        
        ctx.usb_init()
            .map_err(EfexError::from)?;
        
        ctx.efex_init()
            .map_err(EfexError::from)?;
        
        let flash_size = ctx.fes_probe_flash_size()
            .map_err(EfexError::from)?;
        
        Ok(flash_size)
    }))
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
    tokio::time::timeout(TIMEOUT_DURATION, tokio::task::spawn_blocking(move || {
        let mut ctx = libefex::Context::new();
        
        ctx.scan_usb_device()
            .map_err(EfexError::from)?;
        
        ctx.usb_init()
            .map_err(EfexError::from)?;
        
        ctx.efex_init()
            .map_err(EfexError::from)?;
        
        ctx.fes_flash_set_onoff(storage_type, on_off)
            .map_err(EfexError::from)?;
        
        Ok(())
    }))
    .await
    .map_err(|_| EfexError::timeout("设置Flash开关超时"))?
    .map_err(|e| EfexError {
        code: -1,
        name: "TaskError".to_string(),
        message: e.to_string(),
    })?
}

#[tauri::command]
pub fn efex_payloads_init(arch: String) -> Result<(), EfexError> {
    let payload_arch = match arch.as_str() {
        "arm32" => libefex::PayloadArch::Arm32,
        "aarch64" => libefex::PayloadArch::Aarch64,
        "riscv" => libefex::PayloadArch::Riscv,
        _ => return Err(EfexError {
            code: -1,
            name: "InvalidParam".to_string(),
            message: format!("Unknown architecture: {}", arch),
        }),
    };
    
    libefex::payloads::init(payload_arch)
        .map_err(EfexError::from)?;
    
    Ok(())
}

#[tauri::command]
pub async fn efex_payloads_readl(addr: u32) -> Result<u32, EfexError> {
    tokio::time::timeout(TIMEOUT_DURATION, tokio::task::spawn_blocking(move || {
        let mut ctx = libefex::Context::new();
        
        ctx.scan_usb_device()
            .map_err(EfexError::from)?;
        
        ctx.usb_init()
            .map_err(EfexError::from)?;
        
        ctx.efex_init()
            .map_err(EfexError::from)?;
        
        let value = libefex::payloads::readl(&ctx, addr)
            .map_err(EfexError::from)?;
        
        Ok(value)
    }))
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
    tokio::time::timeout(TIMEOUT_DURATION, tokio::task::spawn_blocking(move || {
        let mut ctx = libefex::Context::new();
        
        ctx.scan_usb_device()
            .map_err(EfexError::from)?;
        
        ctx.usb_init()
            .map_err(EfexError::from)?;
        
        ctx.efex_init()
            .map_err(EfexError::from)?;
        
        libefex::payloads::writel(&ctx, value, addr)
            .map_err(EfexError::from)?;
        
        Ok(())
    }))
    .await
    .map_err(|_| EfexError::timeout("写入寄存器超时"))?
    .map_err(|e| EfexError {
        code: -1,
        name: "TaskError".to_string(),
        message: e.to_string(),
    })?
}
