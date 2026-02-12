use std::sync::Mutex;
use tauri::State;
use libefex::Context;

use super::error::EfexError;
use super::types::{DeviceMode, EfexDevice};

pub struct EfexState {
    contexts: Vec<Mutex<Option<Context>>>,
}

impl EfexState {
    pub fn new() -> Self {
        EfexState {
            contexts: vec![Mutex::new(None); 16],
        }
    }
    
    fn find_free_slot(&self) -> Option<u32> {
        for (i, ctx) in self.contexts.iter().enumerate() {
            if ctx.lock().unwrap().is_none() {
                return Some(i as u32);
            }
        }
        None
    }
}

#[tauri::command]
pub fn efex_scan_devices() -> Result<Vec<EfexDevice>, EfexError> {
    let mut ctx = Context::new();
    
    ctx.scan_usb_device()
        .map_err(EfexError::from)?;
    
    ctx.usb_init()
        .map_err(EfexError::from)?;
    
    ctx.efex_init()
        .map_err(EfexError::from)?;
    
    let mode: DeviceMode = ctx.get_device_mode().into();
    let mode_str = ctx.get_device_mode_str().to_string();
    
    let device = EfexDevice {
        index: 0,
        mode: mode.as_str().to_string(),
        mode_str,
    };
    
    Ok(vec![device])
}

#[tauri::command]
pub fn efex_open_device(state: State<EfexState>, index: usize) -> Result<u32, EfexError> {
    let slot = state.find_free_slot()
        .ok_or_else(|| EfexError {
            code: -100,
            name: "NoFreeSlot".to_string(),
            message: "No free device slot available".to_string(),
        })?;
    
    let mut ctx = Context::new();
    
    ctx.scan_usb_device()
        .map_err(EfexError::from)?;
    
    ctx.usb_init()
        .map_err(EfexError::from)?;
    
    ctx.efex_init()
        .map_err(EfexError::from)?;
    
    *state.contexts[slot as usize].lock().unwrap() = Some(ctx);
    
    Ok(slot)
}

#[tauri::command]
pub fn efex_close_device(state: State<EfexState>, handle: u32) -> Result<(), EfexError> {
    let slot = handle as usize;
    
    if slot >= state.contexts.len() {
        return Err(EfexError {
            code: -101,
            name: "InvalidHandle".to_string(),
            message: "Invalid device handle".to_string(),
        });
    }
    
    *state.contexts[slot].lock().unwrap() = None;
    
    Ok(())
}

#[tauri::command]
pub fn efex_get_device_mode(state: State<EfexState>, handle: u32) -> Result<String, EfexError> {
    let slot = handle as usize;
    
    if slot >= state.contexts.len() {
        return Err(EfexError {
            code: -101,
            name: "InvalidHandle".to_string(),
            message: "Invalid device handle".to_string(),
        });
    }
    
    let ctx_guard = state.contexts[slot].lock().unwrap();
    let ctx = ctx_guard.as_ref()
        .ok_or_else(|| EfexError {
            code: -102,
            name: "DeviceNotOpen".to_string(),
            message: "Device not opened".to_string(),
        })?;
    
    let mode: DeviceMode = ctx.get_device_mode().into();
    Ok(mode.as_str().to_string())
}

#[tauri::command]
pub fn efex_get_device_mode_str(state: State<EfexState>, handle: u32) -> Result<String, EfexError> {
    let slot = handle as usize;
    
    if slot >= state.contexts.len() {
        return Err(EfexError {
            code: -101,
            name: "InvalidHandle".to_string(),
            message: "Invalid device handle".to_string(),
        });
    }
    
    let ctx_guard = state.contexts[slot].lock().unwrap();
    let ctx = ctx_guard.as_ref()
        .ok_or_else(|| EfexError {
            code: -102,
            name: "DeviceNotOpen".to_string(),
            message: "Device not opened".to_string(),
        })?;
    
    Ok(ctx.get_device_mode_str().to_string())
}

#[tauri::command]
pub fn efex_fel_read(
    state: State<EfexState>,
    handle: u32,
    addr: u32,
    len: usize,
) -> Result<Vec<u8>, EfexError> {
    let slot = handle as usize;
    
    if slot >= state.contexts.len() {
        return Err(EfexError {
            code: -101,
            name: "InvalidHandle".to_string(),
            message: "Invalid device handle".to_string(),
        });
    }
    
    let ctx_guard = state.contexts[slot].lock().unwrap();
    let ctx = ctx_guard.as_ref()
        .ok_or_else(|| EfexError {
            code: -102,
            name: "DeviceNotOpen".to_string(),
            message: "Device not opened".to_string(),
        })?;
    
    let mut buf = vec![0u8; len];
    ctx.fel_read(addr, &mut buf)
        .map_err(EfexError::from)?;
    
    Ok(buf)
}

#[tauri::command]
pub fn efex_fel_write(
    state: State<EfexState>,
    handle: u32,
    addr: u32,
    data: Vec<u8>,
) -> Result<(), EfexError> {
    let slot = handle as usize;
    
    if slot >= state.contexts.len() {
        return Err(EfexError {
            code: -101,
            name: "InvalidHandle".to_string(),
            message: "Invalid device handle".to_string(),
        });
    }
    
    let ctx_guard = state.contexts[slot].lock().unwrap();
    let ctx = ctx_guard.as_ref()
        .ok_or_else(|| EfexError {
            code: -102,
            name: "DeviceNotOpen".to_string(),
            message: "Device not opened".to_string(),
        })?;
    
    ctx.fel_write(addr, &data)
        .map_err(EfexError::from)?;
    
    Ok(())
}

#[tauri::command]
pub fn efex_fel_exec(
    state: State<EfexState>,
    handle: u32,
    addr: u32,
) -> Result<(), EfexError> {
    let slot = handle as usize;
    
    if slot >= state.contexts.len() {
        return Err(EfexError {
            code: -101,
            name: "InvalidHandle".to_string(),
            message: "Invalid device handle".to_string(),
        });
    }
    
    let ctx_guard = state.contexts[slot].lock().unwrap();
    let ctx = ctx_guard.as_ref()
        .ok_or_else(|| EfexError {
            code: -102,
            name: "DeviceNotOpen".to_string(),
            message: "Device not opened".to_string(),
        })?;
    
    ctx.fel_exec(addr)
        .map_err(EfexError::from)?;
    
    Ok(())
}

#[tauri::command]
pub fn efex_fes_query_storage(
    state: State<EfexState>,
    handle: u32,
) -> Result<u32, EfexError> {
    let slot = handle as usize;
    
    if slot >= state.contexts.len() {
        return Err(EfexError {
            code: -101,
            name: "InvalidHandle".to_string(),
            message: "Invalid device handle".to_string(),
        });
    }
    
    let ctx_guard = state.contexts[slot].lock().unwrap();
    let ctx = ctx_guard.as_ref()
        .ok_or_else(|| EfexError {
            code: -102,
            name: "DeviceNotOpen".to_string(),
            message: "Device not opened".to_string(),
        })?;
    
    let storage_type = ctx.fes_query_storage()
        .map_err(EfexError::from)?;
    
    Ok(storage_type)
}

#[tauri::command]
pub fn efex_fes_query_secure(
    state: State<EfexState>,
    handle: u32,
) -> Result<u32, EfexError> {
    let slot = handle as usize;
    
    if slot >= state.contexts.len() {
        return Err(EfexError {
            code: -101,
            name: "InvalidHandle".to_string(),
            message: "Invalid device handle".to_string(),
        });
    }
    
    let ctx_guard = state.contexts[slot].lock().unwrap();
    let ctx = ctx_guard.as_ref()
        .ok_or_else(|| EfexError {
            code: -102,
            name: "DeviceNotOpen".to_string(),
            message: "Device not opened".to_string(),
        })?;
    
    let secure_type = ctx.fes_query_secure()
        .map_err(EfexError::from)?;
    
    Ok(secure_type)
}

#[tauri::command]
pub fn efex_fes_probe_flash_size(
    state: State<EfexState>,
    handle: u32,
) -> Result<u32, EfexError> {
    let slot = handle as usize;
    
    if slot >= state.contexts.len() {
        return Err(EfexError {
            code: -101,
            name: "InvalidHandle".to_string(),
            message: "Invalid device handle".to_string(),
        });
    }
    
    let ctx_guard = state.contexts[slot].lock().unwrap();
    let ctx = ctx_guard.as_ref()
        .ok_or_else(|| EfexError {
            code: -102,
            name: "DeviceNotOpen".to_string(),
            message: "Device not opened".to_string(),
        })?;
    
    let flash_size = ctx.fes_probe_flash_size()
        .map_err(EfexError::from)?;
    
    Ok(flash_size)
}

#[tauri::command]
pub fn efex_fes_flash_set_onoff(
    state: State<EfexState>,
    handle: u32,
    storage_type: u32,
    on_off: bool,
) -> Result<(), EfexError> {
    let slot = handle as usize;
    
    if slot >= state.contexts.len() {
        return Err(EfexError {
            code: -101,
            name: "InvalidHandle".to_string(),
            message: "Invalid device handle".to_string(),
        });
    }
    
    let ctx_guard = state.contexts[slot].lock().unwrap();
    let ctx = ctx_guard.as_ref()
        .ok_or_else(|| EfexError {
            code: -102,
            name: "DeviceNotOpen".to_string(),
            message: "Device not opened".to_string(),
        })?;
    
    ctx.fes_flash_set_onoff(storage_type, on_off)
        .map_err(EfexError::from)?;
    
    Ok(())
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
pub fn efex_payloads_readl(
    state: State<EfexState>,
    handle: u32,
    addr: u32,
) -> Result<u32, EfexError> {
    let slot = handle as usize;
    
    if slot >= state.contexts.len() {
        return Err(EfexError {
            code: -101,
            name: "InvalidHandle".to_string(),
            message: "Invalid device handle".to_string(),
        });
    }
    
    let ctx_guard = state.contexts[slot].lock().unwrap();
    let ctx = ctx_guard.as_ref()
        .ok_or_else(|| EfexError {
            code: -102,
            name: "DeviceNotOpen".to_string(),
            message: "Device not opened".to_string(),
        })?;
    
    let value = libefex::payloads::readl(ctx, addr)
        .map_err(EfexError::from)?;
    
    Ok(value)
}

#[tauri::command]
pub fn efex_payloads_writel(
    state: State<EfexState>,
    handle: u32,
    value: u32,
    addr: u32,
) -> Result<(), EfexError> {
    let slot = handle as usize;
    
    if slot >= state.contexts.len() {
        return Err(EfexError {
            code: -101,
            name: "InvalidHandle".to_string(),
            message: "Invalid device handle".to_string(),
        });
    }
    
    let ctx_guard = state.contexts[slot].lock().unwrap();
    let ctx = ctx_guard.as_ref()
        .ok_or_else(|| EfexError {
            code: -102,
            name: "DeviceNotOpen".to_string(),
            message: "Device not opened".to_string(),
        })?;
    
    libefex::payloads::writel(ctx, value, addr)
        .map_err(EfexError::from)?;
    
    Ok(())
}
