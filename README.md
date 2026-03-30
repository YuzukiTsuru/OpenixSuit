<div align="center"><img width="80" src="https://github.com/user-attachments/assets/7ef2e56f-8d86-4c86-b9e0-776838259b1b" alt="OpenixSuit logo"></div>
<h1 align="center"><b>OpenixSuit</b></h1>
<p align="center">
  Tool to Flash Firmware to Devices like PhoenixSuit. Support Windows, Linux, macOS.
</p>

<img width="1282" height="912" alt="image" src="https://github.com/user-attachments/assets/e193f6a5-51a8-474d-97a9-bf7173966edd" />

> Note: This repo is for releases only — it hosts downloadable builds and the i18n profile. The source code is not publicly available (yet). For bug reports and feature requests, please use the [Issues](https://github.com/YuzukiTsuru/OpenixSuit/issues) tab.

## Downloads

Downloads OpenixSuit from [Release](https://github.com/YuzukiTsuru/OpenixSuit/releases) Pages

## Features

- **Firmware Flashing**: Flash Sunxi format firmware images to development boards
- **Hot-plug Support**: Automatic device detection when USB devices are connected/disconnected
- **Multiple Flash Modes**: 
  - Partition flashing (select specific partitions)
  - Keep data upgrade (preserve existing data)
  - Partition erase upgrade
  - Full erase upgrade
- **Device Management**: Scan, detect, and manage connected Sunxi devices
- **Firmware Analysis**: Parse and view firmware image contents
- **EFEL Debug Tools**: Low-level FEL mode debugging utilities
- **Firmware Format Convert**: Firmware packing and conversion tool.
- Powered by [OpenixWidgets](https://github.com/YuzukiTsuru/OpenixWidgets)

## Components Overview

### Allwinner IMG Flash

Firmware download tool for flashing images to devices.

<img width="1282" height="912" alt="image" src="https://github.com/user-attachments/assets/c6cfe2dd-9ca4-4a93-b537-28bebe5ea5cd" />

**Features:**
- Device detection and selection
- Image loading and validation
- Flash configuration
- Progress tracking
- Log output

### Sector IMG Flash

Sector-based flash tool with partition editing capabilities.

<img width="1282" height="912" alt="image" src="https://github.com/user-attachments/assets/d9d293a3-9bf9-43bb-b056-fc0b1a8e2976" />

**Features:**
- Boot image selection
- MBR partition editor
- Partition add/edit/delete/reorder
- MBR export options
- Flash progress tracking

### Generic IMG Flash

Generic flash tool to flash RAW image to device

<img width="1282" height="912" alt="image" src="https://github.com/user-attachments/assets/64c0e472-2621-468c-baf5-b1e1bf27fcf7" />

**Features:**
- Boot image selection
- Generic image selection
- Logic offset auto-detection
- Multiple storage type support (SDMMC/NOR/UFS)
- Flash mode selection

### Firmware Converter

Firmware packing and conversion tool.

<img width="1282" height="912" alt="image" src="https://github.com/user-attachments/assets/b833bb5c-df18-47a9-8334-e85436111327" />

**Features:**
- SPI NOR converter
- Block device converter (SD/eMMC/SDNand/UFS)
- Firmware format conversion
- Progress tracking

### EFEL Toolbox

FEL mode debugging interface for Allwinner devices.

<img width="1282" height="912" alt="image" src="https://github.com/user-attachments/assets/9f1526a6-aefb-4df6-8e13-1bc511bfb7cd" />

**Features:**
- Device scanning and selection
- Memory read/write operations
- Hex view with disassembly support
- Execute code at address
- DRAM initialization

### Firmware Parser

Firmware image parser and viewer component.

<img width="1282" height="912" alt="image" src="https://github.com/user-attachments/assets/62c37728-b51f-4286-bcf9-893d592f7230" />

**Features:**
- Parse IMG firmware images
- View image header information
- Display partition table
- Extract partitions
- View Boot0/U-Boot headers
- View SysConfig
- DTB viewer

### ADB File Explorer

ADB file explorer for browsing and managing files on Android devices connected via ADB.

<img width="1282" height="912" alt="image" src="https://github.com/user-attachments/assets/8dcd02eb-c2b5-4ba1-af8a-440d10c288c6" />

**Features:**
- Browse device filesystem
- File/folder operations (copy, move, delete, rename)
- Upload/download files
- Text file editing
- Properties viewer
- Clipboard support

### GPIO Viewer

View and modify your chip GPIO real config by reading info from reg.

<img width="1282" height="912" alt="image" src="https://github.com/user-attachments/assets/209e4fab-ee6f-49cc-8227-bcc373e45d6d" />

**Features:**
- View GPIO Status
- Configure GPIO
- Support MUX, PULL, DRV, and so on.

## Supported Devices

OpenixSuit supports Sunxi SoCs in FEL/FES mode, including:
- Sunxi series etc.
- Newer chips with FEL boot ROM support

## Source Code

```bash
claude \                                                                                                                                  
  --dangerously-skip-permissions \                                                                                                                                       --output-format=stream-json \
  --verbose \
  -p "请实现一个跨平台固件刷写桌面应用（Tauri 2.x，React 19，Rust），具体要求：
1. 应用为全志（Allwinner/Sunxi）芯片设备的固件刷写工具，支持 Windows、Linux、macOS 三平台。前端使用 React 19 + TypeScript 5.7 + Vite 7 构建，后端使用 Rust (Edition 2021) + Tokio 异步运行时。通过 Tauri IPC 实现前后端通信，共注册 60+ 个命令（EFEX 27 个、ADB 15 个、分区/DTB/反汇编等）。
2. 左侧为可折叠侧边栏（展开 240px，折叠 64px），包含 8 个工具按钮：Firmware Flash（主刷写）、Sector Flash（分区刷写）、Raw Flash（原始刷写）、Firmware Packer（固件打包）、EFEL GUI（FEL 调试）、Firmware Loader（固件分析）、ADB Explorer（文件管理）、GPIO Viewer（引脚查看）。右侧为主内容区，使用 framer-motion 实现页面切换动画（opacity transition，duration 0.15s），当前激活页面 pointerEvents: auto，其他为 none。
3. 使用 CSS Variables 实现动态主题系统，基础变量包括：--color-base（背景）、--color-accent（强调色）、--color-success/warning/error（状态色）等。提供 8 个预置主题配置 JSON 文件（Catppuccin Mocha/Macchiato/Frappe/Latte、Dracula、GitHub、Atom One、Arduino、Yuzuki、Openix），存储在 src/Themes/configs/。支持亮/暗模式切换，ThemeProvider 通过 document.documentElement.style.setProperty() 动态应用主题。设置持久化至 ~/.openixsuit/settings.json，使用 Tauri fs API 写入，带 1 秒 debounce。
4. 国际化使用 i18next + react-i18next，支持 5 种语言（zh-CN、zh-TW、en-US、ja-JP、ko-KR），语言文件位于 src/i18n/locales/。设置面板提供语言选择下拉框，切换后调用 i18n.changeLanguage() 并持久化到 settings。
5. 后端 Rust 模块划分：adb/（ADB 协议）、efex/（FEL/FES USB）、disasm/（Capstone 反汇编）、diskpart/（GPT/MBR 解析）、dtb/（Device Tree）、hotplug/（USB 热插拔）、packer/（固件打包）、workers/（异步下载）。每个模块包含 commands.rs（Tauri 命令）、types.rs（类型定义）和实现文件。入口 lib.rs 使用 tauri::generate_handler! 注册所有命令，使用 #[tauri::command] 宏定义 IPC 接口。
6. USB 通信使用自定义 C 库 libefex（位于 src-tauri/libs/libefex/），通过 FFI 绑定调用。支持 3 种 USB 后端：libusb、winusb、auto（Windows 默认 winusb，Linux/macOS 默认 libusb）。FEL 模式提供 fel_read（读内存）、fel_write（写内存）、fel_exec（执行代码）命令；FES 模式提供 fes_query_storage（查询存储类型：SPI NOR/eMMC/UFS）、fes_down（下载数据，64KB 分块传输）、fes_verify_value（CRC32 校验）。使用 sunxi_scan_usb_devices() 扫描设备，过滤全志 VID:0x1f3a PID:0xefe8。
7. USB 热插拔检测在 src-tauri/src/hotplug/watcher.rs 实现：优先使用 rusb 原生 hotplug callback（Linux 支持），不支持平台使用 200ms 轮询 fallback。检测到设备变化后通过 app_handle.emit('usb-hotplug', payload) 发送事件到前端，payload 包含 {action: 'arrive'/'depart', device: {bus, port, vid, pid}}。
8. 固件刷写流程：用户选择 IMAGEWTY 格式固件 → OpenixPacker 解析分区结构 → USB 检测到设备 → FEL 模式加载 Boot0 初始化 DRAM → 加载 U-Boot 切换到 FES → 查询存储类型 → 逐分区下载（64KB 分块，实时进度事件）→ CRC32 校验 → 设置 tool_mode 重启设备。前端 FlashManager 单例管理刷写状态，提供 onProgress/onLog/onComplete 回调，刷写时锁定侧边栏防止切换。
9. ADB Explorer 使用自定义 adb_client Rust 库（位于 src-tauri/libs/adb_client/），实现完整 ADB 协议。提供命令：adb_list_devices（列出设备）、adb_select_device（选择设备）、adb_shell_command（Shell 命令）、adb_list_directory（列出目录）、adb_push_file/pull_file（文件传输）、adb_delete_file/make_directory/rename（文件操作）、adb_reboot（重启）、adb_root（获取 root）。支持 TCP 和 USB 传输，AdbState 使用 Mutex 包装 AdbManager 管理设备连接。
10. 分区解析使用 gptman（GPT）和 mbrman（MBR）库，提供命令：parse_gpt_from_file/from_data、parse_mbr_from_file/from_data，返回分区表 JSON（包含分区名、起始扇区、大小、类型 GUID）。DTB 解析使用 fdt 库，提供命令：fdt_parse_from_file/from_data、fdt_get_node、fdt_get_property、fdt_list_node_children、fdt_find_compatible、fdt_generate_dts（生成可读 DTS 源码）。
11. 反汇编功能使用 Capstone 0.13 引擎，支持架构：ARM32、AArch64、RISC-V、MIPS、PowerPC、x86/x86-64。命令 disassemble(data, arch, mode) 返回汇编指令列表 JSON，get_supported_archs() 返回可用架构列表。EFEL GUI 使用 Monaco Editor 显示十六进制数据和反汇编结果。
12. 异步下载任务在 src-tauri/src/workers/download.rs 实现：download_partition 命令使用 tokio::task::spawn_blocking 在后台执行，通过 Tauri emit 发送进度事件（{partition, progress, total, status}）。支持取消操作：download_partitions_cancel 命令设置 atomic bool 标志 DOWNLOAD_CANCELLED，传输循环检测标志提前终止。
13. 固件打包使用 packer 模块：spinor_merge_firmware（SPI NOR 合并）、emmc_ufs_merge_firmware（eMMC/UFS 合并）。接收分区数据列表，按存储类型重新组织，生成最终固件镜像。支持不同存储介质的分区布局差异处理。
14. Tauri 配置（tauri.conf.json）：productName 为 'OpenixSuit'，identifier 为 'com.yuzukitsuru.openixsuit'。窗口初始 1280×880，最小 1090×880，居中显示，可缩放。启动时 visible: false，前端加载完成后调用 window.show()。bundle targets 为 'all'，createUpdaterArtifacts: true 支持自动更新。
15. 自动更新使用 tauri-plugin-updater：从 GitHub Releases latest.json 获取更新信息，pubkey 使用 minisign 签名验证。设置面板显示当前版本和更新状态，提供'检查更新'按钮。
16. 构建脚本（package.json scripts）：dev（开发模式，先运行 init 脚本再启动 Vite）、build（同步版本号后 Vite 构建）、tauri（Tauri CLI）、typecheck（TypeScript 类型检查）、lint/format（ESLint + Prettier）、i18n:*（国际化管理命令）。Makefile 提供 build/run/install/clean 命令，构建产物为签名的 .app/.exe/.deb/.rpm 包。
17. 应用图标提供多尺寸 PNG 和平台特定格式（.icns macOS、.ico Windows），位于 src-tauri/icons/。安全策略 CSP 设置为 null 允许本地资源加载。"
```

## Prerequisites

- **Platform-specific requirements**:
  - **Windows**: Microsoft Visual Studio C++ Support
  - **Linux**: `libusb-1.0-0`
  - **macOS**: `libusb`

### Linux udev config
Copy this file to `/etc/udev/rules.d/` or `/usr/lib/udev/rules.d/`, If rules fail to reload automatically, you can refresh udev rules with the command `sudo udevadm control --reload`
```
ACTION=="add", SUBSYSTEM=="usb", ATTRS{idVendor}=="1f3a", ATTRS{idProduct}=="efe8", MODE="666", GROUP="users" TEST=="power/autosuspend", ATTR{power/autosuspend}="-1"
```

