# OpenixSuit Project Architecture

## Architecture Diagram

```
╔════════════════════════════════════════════════════════════════════════════╗
║                      OpenixSuit Project Architecture                       ║
╚════════════════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────────────────┐
│                    Frontend Layer - React 19 + TypeScript 5.7               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌──────────────────────────────────────────────────────────────────────┐  │
│   │                    Main Application Entry (main.tsx)                 │  │
│   │              ┌─────────────────────────────────────┐                 │  │
│   │              │  Layout (CoreUI)                    │                 │  │
│   │              │  ├─ Sidebar (Tool Menu)             │                 │  │
│   │              │  ├─ PageContainer (Content Area)    │                 │  │
│   │              │  └─ Popup (Dialogs)                 │                 │  │
│   │              └─────────────────────────────────────┘                 │  │
│   │                                ▲                                     │  │
│   │        ┌───────────┬───────────┼───────────┬──────────┐              │  │
│   │        │           │           │           │          │              │  │
│   │       ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐             │  │
│   │       │Firmware │ │Firmware  │ │EFEL Gui  │ │Settings  │             │  │
│   │       │Download │ │Loader    │ │          │ │          │             │  │
│   │       └─────────┘ └──────────┘ └──────────┘ └──────────┘             │  │
│   └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│              Business Logic Layer - TypeScript Modules (src/)               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────┐   │
│  │  FlashManager        │  │  EfexContext         │  │  OpenixPacker    │   │
│  │  (FlashManager/)     │  │  (libEFEX/Context)   │  │  (OpenixIMG/)    │   │
│  ├──────────────────────┤  ├──────────────────────┤  ├──────────────────┤   │
│  │ • scan()             │  │ • Device state       │  │ • loadImage()    │   │
│  │ • start()            │  │ • Handle mgmt        │  │ • getFileData()  │   │
│  │ • cancel()           │  │ • Mode detection     │  │ • parseHeader()  │   │
│  │ • onProgress()       │  │ • FEL/FES ops        │  │ • getImageInfo() │   │
│  │ • onLog()            │  │ • Payloads ops       │  │ • freeImage()    │   │
│  │ • onComplete()       │  │                      │  │                  │   │
│  └──────────────────────┘  └──────────────────────┘  └──────────────────┘   │
│                                       │                        │            │
│  ┌──────────────────────┐             │                        │            │
│  │ Flash Handlers       │◄────────────┴────────────────────────┘            │
│  ├──────────────────────┤                                                   │
│  │ • FELHandler         │  (FEL Mode: Initial Boot Mode)                    │
│  │ • FESHandler         │  (FES Mode: Flash Programming Mode)               │
│  └──────────────────────┘                                                   │
│           │                                                                 │
│           ▼                                                                 │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────┐   │
│  │ Config Parsers       │  │ Device Operations    │  │ Utils            │   │
│  │ (FlashConfig/)       │  │ (Devices/)           │  │ (Utils/)         │   │
│  ├──────────────────────┤  ├──────────────────────┤  ├──────────────────┤   │
│  │ • SysConfigParser    │  │ • InitDRAM           │  │ • Binary         │   │
│  │ • Boot0Header        │  │ • FEL2FES            │  │ • Checksum       │   │
│  │ • UBootHeader        │  │ • DownloadBoot       │  │ • Chips          │   │
│  │ • MBRParser          │  │ • DownloadPartition  │  │ • Format         │   │
│  │ • Constants          │  │ • DownloadMBR        │  │ • Parse          │   │
│  └──────────────────────┘  │ • SetDeviceNextMode  │  └──────────────────┘   │
│                            │ • HotPlug            │                         │
│                            └──────────────────────┘                         │
│                                                                             │
│  ┌──────────────────────┐  ┌──────────────────────┐                         │
│  │ React Hooks          │  │ i18n                 │                         │
│  │ (Hooks/)             │  │ (i18n/)              │                         │
│  ├──────────────────────┤  ├──────────────────────┤                         │
│  │ • useDeviceScanner   │  │ • en-US.json         │                         │
│  │ • useFlashState      │  │ • zh-CN.json         │                         │
│  │ • useHotPlug         │  │ • react-i18next      │                         │
│  │ • useImageLoader     │  └──────────────────────┘                         │
│  │ • usePopup           │                                                   │
│  └──────────────────────┘                                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ invoke()
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Tauri IPC - RPC Communication Layer                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────────────────────────────────────────────────────┐   │
│  │              Tauri Command Handlers (@tauri/command)                 │   │
│  ├──────────────────────────────────────────────────────────────────────┤   │
│  │  EFEX Commands:                                                      │   │
│  │  • efex_scan_devices()        - Scan devices                         │   │
│  │  • efex_open_device()         - Open device                          │   │
│  │  • efex_close_device()        - Close device                         │   │
│  │  • efex_get_device_mode()     - Get device mode                      │   │
│  │  • efex_set_usb_backend()     - Set USB backend                      │   │
│  │  • efex_fel_read/write/exec() - FEL operations                       │   │
│  │  • efex_fes_*()               - FES operations                       │   │
│  │  • efex_payloads_*()          - Payload operations                   │   │
│  │  • efex_set_fel/fes_timeout() - Set operation timeout                │   │
│  │                                                                      │   │
│  │  HotPlug Commands:                                                   │   │
│  │  • hotplug_start()            - Start USB hot-plug watcher           │   │
│  │                                                                      │   │
│  │  Disasm Commands:                                                    │   │
│  │  • disassemble()              - Disassemble binary                   │   │
│  │  • get_supported_archs()      - Get supported architectures          │   │
│  │                                                                      │   │
│  │  Worker Commands:                                                    │   │
│  │  • download_partitions()      - Download partitions async            │   │
│  │  • download_partitions_cancel()- Cancel download                     │   │
│  │                                                                      │   │
│  │  File Commands:                                                      │   │
│  │  • extract_file_chunked()     - Extract file in chunks               │   │
│  │  • extract_files_batch()      - Extract multiple files               │   │
│  │  • get_file_size()            - Get file size                        │   │
│  │                                                                      │   │
│  │  Proxy Commands:                                                     │   │
│  │  • get_system_proxy()         - Get system proxy                     │   │
│  │  • get_proxy_config()         - Get proxy config                     │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│               Backend Layer - Rust + Tokio (src-tauri/src/)                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────┐   │
│  │  lib.rs              │  │  efex/               │  │  hotplug/        │   │
│  ├──────────────────────┤  ├──────────────────────┤  ├──────────────────┤   │
│  │ • Tauri Builder()    │  │ • commands.rs        │  │ • commands.rs    │   │
│  │ • Plugin loading     │  │ • error.rs           │  │ • types.rs       │   │
│  │   - opener           │  │ • function.rs        │  │ • watcher.rs     │   │
│  │   - fs               │  │ • types.rs           │  │ • mod.rs         │   │
│  │   - dialog           │  │ • mod.rs             │  │                  │   │
│  │   - updater          │  └──────────────────────┘  └──────────────────┘   │
│  │   - process          │                                                   │
│  │   - log              │  ┌──────────────────────┐  ┌──────────────────┐   │
│  │ • Handler register   │  │  disasm/             │  │  workers/        │   │
│  └──────────────────────┘  ├──────────────────────┤  ├──────────────────┤   │
│                            │ • commands.rs        │  │ • commands.rs    │   │
│  ┌──────────────────────┐  │ • types.rs           │  │ • types.rs       │   │
│  │  file.rs             │  │ • mod.rs             │  │ • mod.rs         │   │
│  │  proxy.rs            │  └──────────────────────┘  └──────────────────┘   │
│  └──────────────────────┘                                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│              Native Library & FFI (src-tauri/libs/libefex/)                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  libefex (C Library + Rust Bindings)                                   │ │
│  ├────────────────────────────────────────────────────────────────────────┤ │
│  │                                                                        │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │ │
│  │  │  Context        │  │  USB Layer      │  │  FEL Protocol   │         │ │
│  │  ├─────────────────┤  ├─────────────────┤  ├─────────────────┤         │ │
│  │  │ • scan_usb()    │  │ • usb_init()    │  │ • fel_read()    │         │ │
│  │  │ • efex_init()   │  │ • usb_send()    │  │ • fel_write()   │         │ │
│  │  │ • get_mode()    │  │ • usb_recv()    │  │ • fel_exec()    │         │ │
│  │  │ • as_ptr()      │  │ • usb_close()   │  │ • fel_verify()  │         │ │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘         │ │
│  │                                                                        │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │ │
│  │  │  FES Protocol   │  │  Payloads       │  │  Architecture   │         │ │
│  │  ├─────────────────┤  ├─────────────────┤  ├─────────────────┤         │ │
│  │  │ • fes_down()    │  │ • payloads_init │  │ • arm32         │         │ │
│  │  │ • fes_up()      │  │ • readl()       │  │ • aarch64       │         │ │
│  │  │ • fes_verify()  │  │ • writel()      │  │ • riscv         │         │ │
│  │  │ • fes_query()   │  │                 │  │                 │         │ │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘         │ │
│  │                                                                        │ │
│  │  USB Backends: libusb (cross-platform) / WinUSB (Windows native)       │ │
│  └────────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      System Layer - USB and LibUSB                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                  libusb (USB Device Communication)                    │  │
│  │  ├─ USB Device Enumeration                                            │  │
│  │  ├─ Control Transfer                                                  │  │
│  │  ├─ Bulk Transfer                                                     │  │
│  │  └─ Interrupt Transfer                                                │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
│                                       │                                     │
│                                       ▼                                     │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │             Sunxi Development Board (Physical Device)                 │  │
│  │    ┌──────────────────────────────────────────────────────────┐       │  │
│  │    │  FEL/FES BootROM (Device Side)(Sunxi ARM/AARCH64/RV)     │       │  │
│  │    │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │       │  │
│  │    │  │   DRAM       │  │  Flash       │  │  Other       │    │       │  │
│  │    │  │  (Init)      │  │  (Write)     │  │  Components  │    │       │  │
│  │    │  └──────────────┘  └──────────────┘  └──────────────┘    │       │  │
│  │    └──────────────────────────────────────────────────────────┘       │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘


╔════════════════════════════════════════════════════════════════════════════╗
║                          Core Data Flow & Interaction                      ║
╚════════════════════════════════════════════════════════════════════════════╝

【Flashing Process】
  User clicks Flash
       │
       ▼
  FlashManager.start()
       │
       ├──► Read firmware file
       │    └──► OpenixPacker.loadImageFromPath()
       │         └──► Parse IMAGEWTY header
       │         └──► Parse file headers
       │
       ├──► Open device
       │    └──► EfexContext.open()
       │         └──► efex_open_device()
       │         └──► refreshMode()
       │
       ├──► Handle device mode
       │    ├──► FEL Mode: handleFelMode()
       │    │    └──► Init DRAM
       │    │    └──► Load UBoot
       │    │    └──► Switch to FES mode
       │    │
       │    └──► FES Mode: handleFesMode()
       │         └──► Download partitions
       │         └──► Write flash
       │         └──► Verify data
       │
       ├──► libefex handles USB communication
       │    └──► libusb sends data to device
       │
       └──► emit Progress/Log callbacks
            └──► UI updates progress bar in real-time


【Device Discovery Process】
  Frontend: EfexContext.scanDevices()
       │
       ▼
  Backend: efex_scan_devices()
       │
       ▼
  tokio::spawn_blocking() {
    Context::new()
    ├── scan_usb_device()
    ├── usb_init()
    ├── efex_init()
    └── get_device_mode()
  }
       │
       ▼
  libefex: USB Scan → Return device info
       │
       ▼
  Frontend: Display available device list
       │
       ▼
  Map chip_version to chip name via getChipName()


【USB Hot-plug Process】
  Rust Backend: rusb hot-plug callback
       │
       ├──► Device arrived/removed
       │
       ▼
  HotplugHandler.device_arrived/left()
       │
       ▼
  Emit "usb-hotplug" event via Tauri
       │
       ▼
  Frontend: useHotPlug hook receives event
       │
       ├──► Debounce check
       │
       ▼
  Callback triggered
       │
       ├──► Arrived: scan devices
       └──► Removed: clear device list


【Image Parsing Process】
  User selects firmware file
       │
       ▼
  OpenixPacker.loadImageFromPath()
       │
       ├──► Read magic bytes (check encryption)
       │
       ├──► Parse ImageHeader
       │    └──► header_version, image_size, num_files
       │
       ├──► Parse FileHeaders[]
       │    └──► filename, maintype, subtype, offset, length
       │
       └──► Ready for extraction
            │
            ├──► getFileDataByFilename()
            └──► getFileDataByMaintypeSubtype()


╔════════════════════════════════════════════════════════════════════════════╗
║                          Build & Deployment System                         ║
╚════════════════════════════════════════════════════════════════════════════╝

【Development Mode】
  npm run tauri dev
      │
      ├──► Vite 7 (Hot Reload) ─► Frontend Dev Server (localhost:1420)
      │
      └──► Cargo watch ─► Rust Incremental Compilation

【Production Build】
  npm run tauri build
      │
      ├──► Vite build ─► Bundle Frontend (React 19 + TypeScript 5.7)
      │
      ├──► Cargo build --release ─► Compile Backend
      │     └──► CMake build libefex
      │
      └──► Tauri CLI ─► Generate Executable (.exe + Installer)

【Scripts】
  npm run build        - Build frontend only
  npm run preview      - Preview build result
  npm run typecheck    - TypeScript type checking
  npm run i18n:extract - Extract i18n keys
  npm run i18n:status  - Check i18n status

```

## Architecture Layer Description

### 📱 Frontend Layer (React 19 + TypeScript 5.7)
Responsible for user interface and interaction logic:
- **Layout Component System**: Reusable UI framework (Sidebar, PageContainer, Popup)
- **Tool Pages**: 
  - FirmwareDownloader - Firmware flashing with device management
  - FirmwareLoader - Firmware image analysis and extraction
  - EFELGui - Low-level FEL debugging interface
  - Settings - Application configuration
- **Style Management**: CSS modular approach
- **Internationalization**: i18next with en-US/zh-CN support

### 🧠 Business Logic Layer (TypeScript)
Core business processing and data management:
- **FlashManager**: Unified flash operation management with callback system
- **EfexContext**: Device connection and state management
- **OpenixPacker**: Firmware image parsing and extraction (IMAGEWTY format)
- **Flash Handlers**: FEL/FES mode specific operations
- **Config Parsers**: SysConfig, Boot0, UBoot, MBR header parsing
- **Device Operations**: DRAM init, partition download, mode switching
- **React Hooks**: Custom hooks for device scanning, hot-plug, flash state

### 🌉 IPC Communication Layer (Tauri)
RPC communication hub between frontend and backend:
- Define unified command interface
- Support async calls with tokio::spawn_blocking
- Configurable timeout control (FEL/FES separate)
- Handle cross-process communication overhead

### 🦀 Backend Layer (Rust + Tokio)
Native implementation of business logic:
- **efex/**: Device communication commands
- **hotplug/**: USB hot-plug monitoring (rusb)
- **disasm/**: Capstone-based disassembly (arm32/aarch64/riscv)
- **workers/**: Async partition download with cancellation
- **file.rs**: Chunked file extraction
- **proxy.rs**: System proxy detection

### 🔌 Native Library Layer (libefex)
Direct communication with hardware devices:
- **FEL Protocol**: Low-level boot mode operations
- **FES Protocol**: Flash programming mode operations
- **Payloads**: Runtime code execution helpers
- **USB Backends**: libusb (cross-platform) / WinUSB (Windows)
- **Architecture Support**: ARM32, AArch64, RISC-V

### 💾 System Layer
OS-level USB drivers and device communication.

## Main Data Flows

### Complete Firmware Flashing Process
1. User selects firmware file in UI and clicks flash
2. FlashManager reads file and parses using OpenixPacker
3. Opens device via EfexContext
4. Detects device mode (FEL/FES)
5. FEL mode: Initialize DRAM, load UBoot, switch to FES
6. FES mode: Download partitions, write flash, verify
7. Emits progress and log callbacks in real-time, UI updates display

### Device Discovery Process
1. Frontend calls `EfexContext.scanDevices()`
2. Backend uses `tokio::spawn_blocking()` for synchronous operations
3. libefex Context scans USB devices and initializes
4. Returns device info (mode, chip version, etc.)
5. Frontend maps chip version to chip name
6. Displays available device list

### USB Hot-plug Process
1. Rust backend registers rusb hot-plug callback (or polling fallback)
2. When device arrives/removes, callback is triggered
3. Emit "usb-hotplug" event via Tauri event system
4. Frontend useHotPlug hook receives and debounces event
5. Trigger appropriate action (scan devices / clear list)

### Image Parsing Process
1. OpenixPacker loads firmware file
2. Checks magic bytes for encryption
3. Parses image header (version, size, file count)
4. Parses file headers (filename, type, offset, length)
5. Provides extraction by filename or maintype/subtype

## Development Commands

```bash
# Development mode (hot reload)
npm run tauri dev

# Production build
npm run tauri build

# Frontend only build
npm run build

# Preview build result
npm run preview

# Type checking
npm run typecheck

# i18n management
npm run i18n:extract
npm run i18n:status
```

## Core Dependencies

### Frontend
- **React 19.1** - UI Framework
- **TypeScript 5.7** - Type Support
- **Vite 7** - Frontend Build Tool
- **i18next** - Internationalization
- **FontAwesome** - Icons

### Backend (Rust)
- **Tauri 2.x** - Desktop Application Framework
- **tokio** - Async Runtime
- **libefex** - Device Communication Library
- **rusb** - Rust USB Library (for hot-plug)
- **capstone** - Disassembly Engine

### Native (C)
- **libusb** - Cross-platform USB
- **WinUSB** - Windows native USB backend
