use log::info;
use serde::{Deserialize, Serialize};
use std::env;
use tauri::command;

#[cfg(windows)]
use log::warn;

#[derive(Debug, Serialize, Deserialize)]
pub struct ProxyConfig {
    pub http_proxy: Option<String>,
    pub https_proxy: Option<String>,
    pub all_proxy: Option<String>,
}

#[cfg(windows)]
fn get_windows_proxy() -> Option<String> {
    use winreg::enums::*;
    use winreg::RegKey;

    let hklm = RegKey::predef(HKEY_CURRENT_USER);

    info!("Attempting to read Windows proxy settings from registry");

    if let Ok(settings) =
        hklm.open_subkey("Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings")
    {
        if let Ok(proxy_enable) = settings.get_value::<u32, _>("ProxyEnable") {
            info!("ProxyEnable value: {}", proxy_enable);
            if proxy_enable == 1 {
                if let Ok(proxy_server) = settings.get_value::<String, _>("ProxyServer") {
                    info!("Raw ProxyServer value: {}", proxy_server);
                    let proxy = parse_windows_proxy(&proxy_server);
                    if let Some(ref p) = proxy {
                        info!("Parsed proxy: {}", p);
                    } else {
                        warn!("Failed to parse proxy server string");
                    }
                    return proxy;
                } else {
                    warn!("Failed to read ProxyServer value");
                }
            } else {
                info!("Proxy is disabled in Windows settings");
            }
        } else {
            warn!("Failed to read ProxyEnable value");
        }
    } else {
        warn!("Failed to open registry key for proxy settings");
    }

    None
}

#[cfg(windows)]
fn parse_windows_proxy(proxy_server: &str) -> Option<String> {
    let proxy = proxy_server.trim();

    if proxy.contains('=') {
        for part in proxy.split(';') {
            let part = part.trim();
            if part.starts_with("https=") || part.starts_with("HTTPS=") {
                let addr = part.split('=').nth(1)?.trim();
                if !addr.is_empty() {
                    let proxy_url = if addr.starts_with("http://") || addr.starts_with("https://") {
                        addr.to_string()
                    } else {
                        format!("http://{}", addr)
                    };
                    return Some(proxy_url);
                }
            }
        }
        for part in proxy.split(';') {
            let part = part.trim();
            if part.starts_with("http=") || part.starts_with("HTTP=") {
                let addr = part.split('=').nth(1)?.trim();
                if !addr.is_empty() {
                    let proxy_url = if addr.starts_with("http://") || addr.starts_with("https://") {
                        addr.to_string()
                    } else {
                        format!("http://{}", addr)
                    };
                    return Some(proxy_url);
                }
            }
        }
    }

    if !proxy.is_empty() {
        let proxy_url = if proxy.starts_with("http://") || proxy.starts_with("https://") {
            proxy.to_string()
        } else {
            format!("http://{}", proxy)
        };
        return Some(proxy_url);
    }

    None
}

#[command]
pub fn get_system_proxy() -> Option<String> {
    info!("get_system_proxy called");

    #[cfg(windows)]
    {
        if let Some(windows_proxy) = get_windows_proxy() {
            info!("Using Windows proxy: {}", windows_proxy);
            return Some(windows_proxy);
        }
    }

    let https_proxy = env::var("HTTPS_PROXY")
        .ok()
        .or_else(|| env::var("https_proxy").ok());

    let http_proxy = env::var("HTTP_PROXY")
        .ok()
        .or_else(|| env::var("http_proxy").ok());

    let all_proxy = env::var("ALL_PROXY")
        .ok()
        .or_else(|| env::var("all_proxy").ok());

    let proxy = https_proxy.or(http_proxy).or(all_proxy);

    if let Some(ref p) = proxy {
        info!("Using environment variable proxy: {}", p);
    } else {
        info!("No proxy found");
    }

    proxy
}

#[command]
pub fn get_proxy_config() -> ProxyConfig {
    #[cfg(windows)]
    {
        if let Some(windows_proxy) = get_windows_proxy() {
            return ProxyConfig {
                http_proxy: Some(windows_proxy.clone()),
                https_proxy: Some(windows_proxy.clone()),
                all_proxy: Some(windows_proxy),
            };
        }
    }

    ProxyConfig {
        http_proxy: env::var("HTTP_PROXY")
            .ok()
            .or_else(|| env::var("http_proxy").ok()),
        https_proxy: env::var("HTTPS_PROXY")
            .ok()
            .or_else(|| env::var("https_proxy").ok()),
        all_proxy: env::var("ALL_PROXY")
            .ok()
            .or_else(|| env::var("all_proxy").ok()),
    }
}
