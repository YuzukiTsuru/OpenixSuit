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
