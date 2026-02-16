# OpenixSuit

Open Source Version of Allwinner PhoenixSuit to Dump, Unpack, Flash Allwinner IMG to Devices.

## Features

- **Firmware Flashing**: Flash Allwinner format firmware images to development boards
- **Hot-plug Support**: Automatic device detection when USB devices are connected/disconnected
- **Multiple Flash Modes**: 
  - Partition flashing (select specific partitions)
  - Keep data upgrade (preserve existing data)
  - Partition erase upgrade
  - Full erase upgrade
- **Device Management**: Scan, detect, and manage connected Allwinner devices
- **Firmware Analysis**: Parse and view firmware image contents
- **EFEL Debug Tools**: Low-level FEL mode debugging utilities

## Supported Devices

OpenixSuit supports Allwinner SoCs in FEL/FES mode, including:
- Sunxi series etc.
- Newer chips with FEL boot ROM support

## Prerequisites

- **Node.js** >= 18
- **Rust** >= 1.70
- **Platform-specific requirements**:
  - **Windows**: Microsoft Visual Studio C++ Build Tools
  - **Linux**: `libusb-1.0-0-dev`, `libgtk-3-dev`
  - **macOS**: Xcode Command Line Tools

## Installation

### From Release

Download the latest release from the [Releases](https://github.com/YuzukiTsuru/OpenixSuit/releases) page.

### Build from Source

```bash
# Clone the repository
git clone https://github.com/YuzukiTsuru/OpenixSuit.git
cd OpenixSuit/OpenixSuit

# Install dependencies
npm install

# Development mode with hot reload
npm run tauri dev

# Production build
npm run tauri build
```

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              Frontend (React + TypeScript)                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │ Firmware    │  │ Device      │  │ Flash Control       │  │
│  │ Downloader  │  │ Scanner     │  │ & Progress          │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           │ Tauri IPC
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Rust + Tokio)                   │
│  ┌──────────────┐  ┌─────────────┐  ┌────────────────────┐  │
│  │ USB Hot-plug │  │ FEL/FES     │  │ Device Commands    │  │
│  │ Watcher      │  │ Protocol    │  │ Handler            │  │
│  └──────────────┘  └─────────────┘  └────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                           │ libefex
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Hardware Layer                           │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ libusb → USB Device → BootROM (FEL/FES)                 ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

## Project Structure

```
OpenixSuit/
├── src/                    # Frontend source
│   ├── Components/         # React components
│   │   ├── FirmwareDownloader/  # Main flashing UI
│   │   ├── FirmwareLoader/      # Firmware analysis
│   │   └── EFELGui/             # FEL debug tools
│   ├── Devices/            # Device operation modules
│   │   ├── HotPlug.ts      # USB hot-plug manager
│   │   ├── FEL2FES.ts      # FEL to FES transition
│   │   └── ...
│   ├── Library/            # Core libraries
│   │   ├── libEFEX/        # Device communication wrapper
│   │   └── OpenixIMG/      # Firmware image parser
│   └── Settings/           # Application settings
├── src-tauri/              # Rust backend
│   ├── src/
│   │   ├── efex/           # FEL/FES commands
│   │   ├── hotplug/        # USB hot-plug watcher
│   │   └── disasm/         # Disassembly utilities
│   └── libs/libefex/       # Native USB communication library
└── docs/                   # Documentation
```

## Development

```bash
# Start development server
npm run tauri dev

# Build for production
npm run tauri build

# Type check
npx tsc --noEmit

# Check Rust code
cd src-tauri && cargo check
```

## License

This project is licensed under the Apache License 2.0 - see the [LICENSE](LICENSE) file for details.
