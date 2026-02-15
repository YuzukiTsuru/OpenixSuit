mod disasm;
mod efex;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            efex::commands::efex_scan_devices,
            efex::commands::efex_open_device,
            efex::commands::efex_close_device,
            efex::commands::efex_get_device_mode,
            efex::commands::efex_get_device_mode_str,
            efex::commands::efex_set_usb_backend,
            efex::commands::efex_get_usb_backend,
            efex::commands::efex_fel_read,
            efex::commands::efex_fel_write,
            efex::commands::efex_fel_exec,
            efex::commands::efex_fes_query_storage,
            efex::commands::efex_fes_query_secure,
            efex::commands::efex_fes_probe_flash_size,
            efex::commands::efex_fes_flash_set_onoff,
            efex::commands::efex_fes_get_chipid,
            efex::commands::efex_fes_down,
            efex::commands::efex_fes_up,
            efex::commands::efex_fes_verify_value,
            efex::commands::efex_fes_verify_status,
            efex::commands::efex_fes_verify_uboot_blk,
            efex::commands::efex_fes_tool_mode,
            efex::commands::efex_payloads_init,
            efex::commands::efex_payloads_readl,
            efex::commands::efex_payloads_writel,
            efex::commands::efex_set_fel_write_timeout,
            efex::commands::efex_set_fes_timeout,
            disasm::commands::disassemble,
            disasm::commands::get_supported_archs,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
