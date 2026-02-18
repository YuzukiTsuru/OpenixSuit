<div align="center"><img width="80" src="src-tauri/icons/128x128%402x.png" alt="OpenixSuit logo"></div>
<h1 align="center"><b>OpenixSuit</b></h1>
<p align="center">
  Open Source Tool to Flash Firmware to Devices. Support Windows, Linux, macOS.
</p>

<img width="1280" height="880" alt="image" src="https://github.com/user-attachments/assets/94a26273-b67a-4a4f-ab4f-1d6898508d3b" />

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

## Supported Devices

OpenixSuit supports Sunxi SoCs in FEL/FES mode, including:
- Sunxi series etc.
- Newer chips with FEL boot ROM support

## Prerequisites

- **Node.js** >= 18
- **Rust** >= 1.70
- **Platform-specific requirements**:
  - **Windows**: Microsoft Visual Studio C++ Build Tools
  - **Linux**: `libusb-1.0-0-dev`, `libgtk-3-dev`
  - **macOS**: Xcode Command Line Tools, libusb

## Installation

### From Release

Download the latest release from the [Releases](https://github.com/YuzukiTsuru/OpenixSuit/releases) page.

### Build from Source

Before building, ensure you have the required dependencies installed.
- **Windows**: 
  - Microsoft Visual Studio C++ Build Tools
  - Windows SDK
  - Rust (via `rustup`)
  - Node.js >= 20 (via `nvm` or `n`)

- **Linux**:
  - Rust (via `rustup`)
  - `libusb-1.0-0-dev`
  - `libgtk-3-dev`
  - `pkg-config`
  - `libwebkit2gtk-4.1-dev`
  - `libappindicator3-dev`
  - `librsvg2-dev`
  - `patchelf`

- **macOS**:
  - Xcode Command Line Tools
  - Rust (via `rustup`)
  - `libusb`
  - `pkg-config`

#### Windows
```bash
# Clone the repository
git clone --recursive https://github.com/YuzukiTsuru/OpenixSuit.git
cd OpenixSuit

# Install dependencies
npm install

# Development mode with hot reload
npm run tauri dev

# Production build
npm run tauri build
```

#### macOS
```bash
# Clone the repository
git clone --recursive https://github.com/YuzukiTsuru/OpenixSuit.git
cd OpenixSuit

# Install dependencies for macOS
brew install pkg-config
brew install libusb

# Install dependencies
npm install

# Development mode with hot reload
npm run tauri dev

# Production build
npm run tauri build
```

#### Linux

```bash
# Clone the repository
git clone --recursive https://github.com/YuzukiTsuru/OpenixSuit.git
cd OpenixSuit

# Install dependencies for Linux (Ubuntu 22.04)
sudo apt-get install -y libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev patchelf libusb-1.0-0-dev pkg-config

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
