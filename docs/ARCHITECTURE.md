# OpenixSuit Project Architecture

## Architecture Diagram

```
╔════════════════════════════════════════════════════════════════════════════╗
║                      OpenixSuit Project Architecture                       ║
╚════════════════════════════════════════════════════════════════════════════╝

┌─────────────────────────────────────────────────────────────────────────────┐
│                    Frontend Layer - React + TypeScript                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌──────────────────────────────────────────────────────────────────────┐  │
│   │                    Main Application Entry (main.tsx)                 │  │
│   │              ┌─────────────────────────────────────┐                 │  │
│   │              │  Layout (CoreUI)                    │                 │  │
│   │              │  ├─ Sidebar (Tool Menu)             │                 │  │
│   │              │  └─ PageContainer (Content Area)    │                 │  │
│   │              └─────────────────────────────────────┘                 │  │
│   │                                ▲                                     │  │
│   │        ┌───────────┬───────────┼───────────┬──────────┐              │  │
│   │        │           │           │           │          │              │  │
│   │       ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐             │  │
│   │       │Firmware │ │Firmware  │ │EFEL Gui  │ │Other     │             │  │
│   │       │Download │ │Loader    │ │          │ │Tools     │             │  │
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
│  │  (flash.ts)          │  │  (Device Connection) │  │  (Firmware Parse)│   │
│  ├──────────────────────┤  ├──────────────────────┤  ├──────────────────┤   │
│  │ • scan()             │  │ • Device state       │  │ • loadImage()    │   │
│  │ • start()            │  │ • Handle mgmt        │  │ • getFiles()     │   │
│  │ • onProgress()       │  │ • Mode detection     │  │ • extractFile()  │   │
│  │ • onLog()            │  │ • Timeout handling   │  │ • parseHeader()  │   │
│  └──────────────────────┘  └──────────────────────┘  └──────────────────┘   │
│                                       │                        │            │
│  ┌──────────────────────┐             │                        │            │
│  │ Config Parsers       │◄────────────┴────────────────────────┘            │
│  ├──────────────────────┤                                                   │
│  │ • SysConfigParser    │  (SysConfig: Device Configuration)                │
│  │ • Boot0Header        │  (Boot0: Primary Bootloader)                      │
│  │ • UBootHeader        │  (UBoot: Secondary Bootloader)                    │
│  │ • MBRParser          │  (MBR: Partition Table)                           │
│  └──────────────────────┘                                                   │
│           │                                                                 │
│           ▼                                                                 │
│  ┌──────────────────────┐                                                   │
│  │    Assets            │                                                   │
│  │ chipIdToChipName.ts  │  (Chip ID ↔ Name Mapping)                         │
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
│  │  • efex_scan_devices()        - Scan devices                         │   │
│  │  • efex_open_device()         - Open device                          │   │
│  │  • efex_close_device()        - Close device                         │   │
│  │  • efex_get_device_mode()     - Get device mode                      │   │
│  │  • efex_fel_read/write()      - FEL read/write                       │   │
│  │  • efex_fel_exec()            - FEL execute                          │   │
│  │  • efex_fes_*()               - FES operations                       │   │
│  │  • efex_payloads_*()          - Payload operations                   │   │
│  │  • hotplug_start()            - Start USB hot-plug watcher           │   │
│  └──────────────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│               Backend Layer - Rust + Tokio (src-tauri/src/)                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────┐   │
│  │  lib.rs              │  │  efex/commands.rs    │  │  efex/error.rs   │   │
│  ├──────────────────────┤  ├──────────────────────┤  ├──────────────────┤   │
│  │ • Tauri Builder()    │  │ • Command impl       │  │ • EfexError      │   │
│  │ • Handler register   │  │ • tokio::spawn_block │  │ • Error convert  │   │
│  │ • Plugin loading     │  │ • Timeout handling   │  │ • Error mapping  │   │
│  │  - opener            │  │ • Thread safety      │  │                  │   │
│  │  - fs                │  │                      │  │  efex/types.rs   │   │
│  │  - dialog            │  └──────────────────────┘  ├──────────────────┤   │
│  └──────────────────────┘                            │ • DeviceMode     │   │
│                                                      │ • EfexDevice     │   │
│                                                      │ • Type defs      │   │
│  ┌──────────────────────┐                            └──────────────────┘   │
│  │  hotplug/watcher.rs  │                                                   │
│  ├──────────────────────┤                                                   │
│  │ • USB hot-plug       │                                                   │
│  │ • Device tracking    │                                                   │
│  │ • Event debounce     │                                                   │
│  └──────────────────────┘                                                   │
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│              Native Library & FFI (src-tauri/libs/libefex/)                 │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌────────────────────────────────────────────────────────────────────────┐ │
│  │  libefex (Rust Bindings)                                               │ │
│  ├────────────────────────────────────────────────────────────────────────┤ │
│  │                                                                        │ │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐         │ │
│  │  │  Context        │  │  USB Init       │  │  FEL Protocol   │         │ │
│  │  ├─────────────────┤  ├─────────────────┤  ├─────────────────┤         │ │
│  │  │ • scan_usb()    │  │ • usb_init()    │  │ • Read/Write    │         │ │
│  │  │ • efex_init()   │  │ • usb_send()    │  │   Memory        │         │ │
│  │  │ • get_mode()    │  │ • usb_recv()    │  │ • Execute Code  │         │ │
│  │  │ • device_ptr    │  │ • Connection    │  │ • Verify CRC    │         │ │
│  │  └─────────────────┘  │   Management    │  │ • Timeout       │         │ │
│  │                       └─────────────────┘  └─────────────────┘         │ │
│  │                                                                        │ │
│  │  ┌─────────────────┐  ┌─────────────────┐                              │ │
│  │  │  FES Protocol   │  │  Payload Mgmt   │                              │ │
│  │  ├─────────────────┤  ├─────────────────┤                              │ │
│  │  │ • Storage Query │  │ • readl/writel  │                              │ │
│  │  │ • Flash Ops     │  │ • Runtime Load  │                              │ │
│  │  │ • Secure Verify │  │ • Memory Mgmt   │                              │ │
│  │  └─────────────────┘  └─────────────────┘                              │ │
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
       │    └──► OpenixPacker.loadImage()
       │         └──► SysConfigParser.parse()
       │         └──► Boot0Header.parse()
       │         └──► UBootHeader.parse()
       │
       ├──► Call Tauri Commands
       │    ├──► efex_scan_devices()
       │    ├──► efex_open_device()
       │    ├──► efex_fel_write() / efex_fes_*()
       │    └──► efex_close_device()
       │
       ├──► libefex handles USB communication
       │    └──► libusb sends data to device
       │
       ├──► Device flashes firmware
       │
       └──► emit Progress/Log callbacks
            └──► UI updates progress bar in real-time


【Device Discovery Process】
  Frontend: efex_scan_devices()
       │
       ▼
  Backend: spawn_blocking() {
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


【USB Hot-plug Process】
  Rust Backend: rusb hot-plug callback
       │
       ├──► Device arrived/removed
       │
       ▼
  Emit "usb-hotplug" event via Tauri
       │
       ▼
  Frontend: HotPlugManager receives event
       │
       ├──► Debounce check (500ms)
       │
       ▼
  Callback triggered
       │
       ├──► Arrived: scan devices
       └──► Removed: clear device list


╔════════════════════════════════════════════════════════════════════════════╗
║                          🔧 Build & Deployment System                        ║
╚════════════════════════════════════════════════════════════════════════════╝

【Development Mode】
  npm run tauri dev
      │
      ├──► Vite (Hot Reload) ─► Frontend Dev Server (localhost:1420)
      │
      └──► Cargo watch ─► Rust Incremental Compilation

【Production Build】
  npm run tauri build
      │
      ├──► Vite build ─► Bundle Frontend (Compile React + TypeScript)
      │
      ├──► Cargo build --release ─► Compile Backend
      │     └──► CMake build libefex
      │
      └──► Tauri CLI ─► Generate Executable (.exe + Installer)

```

## Architecture Layer Description

### 📱 Frontend Layer (React + TypeScript)
Responsible for user interface and interaction logic:
- **Layout Component System**: Reusable UI framework (Sidebar, PageContainer)
- **Tool Pages**: Firmware flashing, firmware analysis, EFEL debugging modules
- **Style Management**: CSS modular approach

### 🧠 Business Logic Layer (TypeScript)
Core business processing and data management:
- **FlashManager**: Unified flash operation management
- **EfexContext**: Device connection and state management
- **OpenixPacker**: Firmware image parsing and extraction
- **Parser Collection**: Multiple configuration file format support
- **Asset Management**: Chip ID mapping table

### 🌉 IPC Communication Layer (Tauri)
RPC communication hub between frontend and backend:
- Define unified command interface
- Support async calls and timeout control
- Handle cross-process communication overhead

### 🦀 Backend Layer (Rust + Tokio)
Native implementation of business logic:
- **Command Handler**: Implement all Tauri commands
- **Async Processing**: Use tokio for concurrent operations
- **Error Management**: Unified error types and conversion
- **Hot-plug Watcher**: USB device hot-plug monitoring

### 🔌 Native Library Layer (libefex)
Direct communication with hardware devices:
- **FEL Protocol**: Low-level boot mode operations
- **FES Protocol**: Flash programming mode operations
- **USB Management**: USB device enumeration and communication

### 💾 System Layer
OS-level USB drivers and device communication.

## Main Data Flows

### Complete Firmware Flashing Process
1. User selects firmware file in UI and clicks flash
2. FlashManager reads file and parses using OpenixPacker
3. Calls multiple Tauri commands to communicate with device
4. Backend initializes DRAM, downloads UBoot, writes partitions via libefex
5. Emits progress and log callbacks in real-time, UI updates display

### Device Discovery Process
1. Frontend calls `efex_scan_devices()`
2. Backend uses `tokio::spawn_blocking()` for synchronous operations
3. libefex Context scans USB devices and initializes
4. Returns device info (mode, chip version, etc.)
5. Frontend displays available device list

### USB Hot-plug Process
1. Rust backend registers rusb hot-plug callback
2. When device arrives/removes, callback is triggered
3. Emit "usb-hotplug" event via Tauri event system
4. Frontend HotPlugManager receives and debounces event
5. Trigger appropriate action (scan devices / clear list)

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
```

## Core Dependencies

- **React 19.1** - UI Framework
- **TypeScript 5.7** - Type Support
- **Tauri 2.x** - Desktop Application Framework
- **Vite 7** - Frontend Build Tool
- **libefex** - Device Communication Library
- **rusb** - Rust USB Library (for hot-plug)
- **tokio** - Rust Async Runtime
