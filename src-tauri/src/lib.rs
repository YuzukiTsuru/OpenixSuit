mod efex;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            efex::commands::efex_scan_devices,
            efex::commands::efex_open_device,
            efex::commands::efex_close_device,
            efex::commands::efex_get_device_mode,
            efex::commands::efex_get_device_mode_str,
            efex::commands::efex_fel_read,
            efex::commands::efex_fel_write,
            efex::commands::efex_fel_exec,
            efex::commands::efex_fes_query_storage,
            efex::commands::efex_fes_query_secure,
            efex::commands::efex_fes_probe_flash_size,
            efex::commands::efex_fes_flash_set_onoff,
            efex::commands::efex_payloads_init,
            efex::commands::efex_payloads_readl,
            efex::commands::efex_payloads_writel,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
