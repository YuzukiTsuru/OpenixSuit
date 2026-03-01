<div align="center"><img width="80" src="https://github.com/user-attachments/assets/7ef2e56f-8d86-4c86-b9e0-776838259b1b" alt="OpenixSuit logo"></div>
<h1 align="center"><b>OpenixSuit</b></h1>
<p align="center">
  Open Source Tool to Flash Firmware to Devices. Support Windows, Linux, macOS.
</p>

<img width="1282" height="912" alt="image" src="https://github.com/user-attachments/assets/f8a74cb5-9d0c-46db-8fd4-cd1a7fa2e1dc" />

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

- **Platform-specific requirements**:
  - **Windows**: Microsoft Visual Studio C++ Support
  - **Linux**: `libusb-1.0-0`
  - **macOS**: `libusb`
