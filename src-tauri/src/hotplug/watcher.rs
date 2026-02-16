use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;
use std::thread;
use std::time::Duration;

use rusb::{Context, Device, Hotplug, HotplugBuilder, Registration, UsbContext};
use tauri::{AppHandle, Emitter, Runtime};

use super::types::{UsbHotPlugCallback, UsbHotPlugEvent, SUNXI_USB_PRODUCT, SUNXI_USB_VENDOR};

static HOTPLUG_REGISTERED: AtomicBool = AtomicBool::new(false);

lazy_static::lazy_static! {
    static ref KNOWN_DEVICES: Mutex<Vec<(u8, u8)>> = Mutex::new(Vec::new());
}

fn should_emit_arrived(bus: u8, addr: u8) -> bool {
    let mut known = KNOWN_DEVICES.lock().unwrap();
    
    if known.contains(&(bus, addr)) {
        return false;
    }

    known.push((bus, addr));
    true
}

fn should_emit_left(bus: u8, addr: u8) -> bool {
    let mut known = KNOWN_DEVICES.lock().unwrap();
    
    let idx = known.iter().position(|(b, a)| *b == bus && *a == addr);
    if idx.is_none() {
        return false;
    }
    
    known.remove(idx.unwrap());
    true
}

struct HotplugHandler<R: Runtime> {
    app_handle: AppHandle<R>,
}

impl<R: Runtime, C: UsbContext> Hotplug<C> for HotplugHandler<R> {
    fn device_arrived(&mut self, device: Device<C>) {
        let desc = match device.device_descriptor() {
            Ok(d) => d,
            Err(_) => return,
        };

        if desc.vendor_id() != SUNXI_USB_VENDOR || desc.product_id() != SUNXI_USB_PRODUCT {
            return;
        }

        let bus = device.bus_number();
        let addr = device.address();

        if !should_emit_arrived(bus, addr) {
            return;
        }

        let callback = UsbHotPlugCallback {
            event: UsbHotPlugEvent::Arrived,
            vendor_id: desc.vendor_id(),
            product_id: desc.product_id(),
        };

        let _ = self.app_handle.emit("usb-hotplug", callback);
    }

    fn device_left(&mut self, device: Device<C>) {
        let bus = device.bus_number();
        let addr = device.address();

        if !should_emit_left(bus, addr) {
            return;
        }

        let callback = UsbHotPlugCallback {
            event: UsbHotPlugEvent::Left,
            vendor_id: SUNXI_USB_VENDOR,
            product_id: SUNXI_USB_PRODUCT,
        };

        let _ = self.app_handle.emit("usb-hotplug", callback);
    }
}

pub fn start_hotplug_watcher<R: Runtime>(app_handle: AppHandle<R>) -> Result<(), String> {
    if HOTPLUG_REGISTERED.load(Ordering::SeqCst) {
        return Ok(());
    }

    let ctx = Context::new().map_err(|e| e.to_string())?;

    let has_hotplug = rusb::has_hotplug();

    if !has_hotplug {
        return start_polling_watcher(app_handle);
    }

    let handler = HotplugHandler { app_handle };

    let _handle: Registration<Context> = HotplugBuilder::new()
        .enumerate(true)
        .register(&ctx, Box::new(handler))
        .map_err(|e| e.to_string())?;

    HOTPLUG_REGISTERED.store(true, Ordering::SeqCst);

    let ctx_clone = ctx.clone();
    thread::spawn(move || {
        loop {
            if let Err(e) = ctx_clone.handle_events(None) {
                eprintln!("USB hotplug event handling error: {}", e);
                break;
            }
        }
    });

    Ok(())
}

fn start_polling_watcher<R: Runtime>(app_handle: AppHandle<R>) -> Result<(), String> {
    static POLLING_STARTED: AtomicBool = AtomicBool::new(false);

    if POLLING_STARTED.load(Ordering::SeqCst) {
        return Ok(());
    }

    POLLING_STARTED.store(true, Ordering::SeqCst);
    HOTPLUG_REGISTERED.store(true, Ordering::SeqCst);

    thread::spawn(move || {
        let mut known_devices: Vec<(u8, u8)> = Vec::new();

        loop {
            if let Ok(ctx) = Context::new() {
                let mut current_devices: Vec<(u8, u8)> = Vec::new();

                if let Ok(devices) = ctx.devices() {
                    for device in devices.iter() {
                        if let Ok(desc) = device.device_descriptor() {
                            let vid = desc.vendor_id();
                            let pid = desc.product_id();

                            if vid == SUNXI_USB_VENDOR && pid == SUNXI_USB_PRODUCT {
                                let bus = device.bus_number();
                                let addr = device.address();
                                current_devices.push((bus, addr));

                                if !known_devices.contains(&(bus, addr)) {
                                    if should_emit_arrived(bus, addr) {
                                        let callback = UsbHotPlugCallback {
                                            event: UsbHotPlugEvent::Arrived,
                                            vendor_id: vid,
                                            product_id: pid,
                                        };
                                        let _ = app_handle.emit("usb-hotplug", callback);
                                    }
                                }
                            }
                        }
                    }
                }

                for (bus, addr) in &known_devices {
                    if !current_devices.contains(&(*bus, *addr)) {
                        if should_emit_left(*bus, *addr) {
                            let callback = UsbHotPlugCallback {
                                event: UsbHotPlugEvent::Left,
                                vendor_id: SUNXI_USB_VENDOR,
                                product_id: SUNXI_USB_PRODUCT,
                            };
                            let _ = app_handle.emit("usb-hotplug", callback);
                        }
                    }
                }

                known_devices = current_devices;
            }

            thread::sleep(Duration::from_millis(200));
        }
    });

    Ok(())
}
