<div align="center"><img width="80" src="https://github.com/user-attachments/assets/7ef2e56f-8d86-4c86-b9e0-776838259b1b" alt="OpenixSuit logo"></div>
<h1 align="center"><b>OpenixSuit</b></h1>
<p align="center">
  Tool to Flash Firmware to Devices like PhoenixSuit. Support Windows, Linux, macOS.
</p>

<img width="1282" height="912" alt="image" src="https://github.com/user-attachments/assets/e193f6a5-51a8-474d-97a9-bf7173966edd" />

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

## Prerequisites

- **Platform-specific requirements**:
  - **Windows**: Microsoft Visual Studio C++ Support
  - **Linux**: `libusb-1.0-0`
  - **macOS**: `libusb`
