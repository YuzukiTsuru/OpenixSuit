## OpenixSuit v0.4.2

### Changes
- chore: update version to 0.4.2 and clean up unused log messages in multiple languages (3c3a5e7)
- refactor: use shared useDeviceScanner in EFELGui to fix device selection race condition (4d1bb59)
- refactor: streamline DRAM initialization process and improve logging (28a2076)
- refactor: improve error handling and logging in efex commands (f7eee7c)
- fix: update debug log for flash size to reflect sector instead of MB (d04debb)

## OpenixSuit v0.4.1

### Changes
- chore: update version to 0.4.1 and enhance timeout error messages in multiple languages (a9ed85b)
- style: update progress text color and blending mode for better visibility (28ad9c5)
- refactor: add USB abstraction layer and improve error logging (4cef277)
- feat: add protocol error handling and localization support (0715360)
- feat: add protocol error handling and localization support in multiple languages (0e12601)

## OpenixSuit v0.4.0

### Changes
- fix: update package dependencies and improve type definitions (6391ba0)
- feat: add CLAUDE.md for project guidance and development commands (fcdc760)
- fix: update error messages for device scanning in multiple languages (e3fb7d9)
- refactor: improve code formatting and readability across multiple components (3e79f37)
- fix: ensure window visibility is set to false in tauri configuration (c751763)
- refactor: remove unused hotplug event handler and simplify device initialization error handling (f2411ae)
- refactor: streamline function signatures and improve code readability across multiple files (ad1ebe7)
- feat(mass-production): increase maximum slots to 48 and enhance device list layout (067016b)
- feat(mass-production): Implement mass production functionality with device management and logging (f9787e7)
- refactor: remove debug logging from fel.rs, service.rs, and utils.rs (1c6eeed)
- refactor: remove debug logging from efex_fel_read, efex_fel_write, and efex_fel_exec functions; simplify timeout setting in service (85beb22)
- feat(hotplug): improve device disconnect tracking (05ec1fa)
- fix: update device list to handle multiple devices and adjust styles accordingly (a7df86f)
- fix: scan adb and efex before showing no devices (27c9131)
- fix: update MBR download label to indicate potential flash erasure (25c3ada)
- fix: ignore expected efex reconnect disconnects (905ef94)
- fix: avoid stale efex state between flashes (a1477b6)
- refactor: make efex multi-device explicit (7bc1141)
- Stream raw partition downloads (62eb861)
- Fix lint and clippy issues (e14e2ae)
- bump to version 0.4.0 (23ffa58)
- Keep flash progress cumulative across downloads (e99dc21)
- Fix sidebar unlock after flash state changes (852b758)
- Reduce noisy efex debug logging (90b01fc)
- Unify flashing pipeline under flash backend (9f3b500)
- Move flash orchestration into Rust backend (44009c6)
- Bind EFEX workers to device handles (79599a4)
- Require explicit EFEX device opens (e506b81)
- Move firmware parsing to Rust (3d2f5ed)
- i18n (28982b8)
- update (6ed5fbf)
- fix css (edea868)
- style(i18n): fix spacing in zh-CN locale strings (135a141)
- Make device slots fill available height with stretched status/progress (ec56af3)
- Refine MassProduction UI: merge info column, firmware display, full-height slots (018d378)
- Integrate MassProduction with global settings (9827ca3)
- Bind slots to USB bus for stable device-slot assignment (8159ab1)
- Fix failed devices not re-detected on replug during mass production (91d6bd8)
- update libefex (7b82b1f)
- Refine MassProduction UI: 16 slots, flash mode, unified styles (120e3ab)
- fix uppercase in win/mac (128c74f)
- Add multi-device handle support and MassProduction feature (8fb7b61)
- Fix typo (1488583)
- Fix download timeout calculation to cap at 60 seconds (a52e84f)
- Rename Platform (248b22e)
- Refactor services and remove legacy frontend compatibility layers (949169e)
- Refactor IPC and flash architecture with modular EFEX commands (8339c6c)
- Refactor IPC and flash architecture with modular EFEX commands (b4d3d62)

## OpenixSuit v0.3.15

### Changes
- feat(i18n): add new translation keys for file manager views (f14cf69)
- docs(download-links): update download links format and add new platforms (8166128)
- feat(ADBExplorer): add list view mode for file browsing (828bf0a)
- chore(android): remove round and foreground launcher icons (bc95526)

## OpenixSuit v0.3.14

### Changes
- chore: bump version to 0.3.14 (1fa1ae5)
- style: fix formatting and add missing newlines in files (78407e9)
- feat(GPIO): add bank offset hook and improve register handling (b519716)
- fix(GPIOViewer): prevent duplicate device selection and scanning (67d3a55)
- feat(ui): add animation effects to UI components (8b76f60)
- fix(chips): update register base values and add T527 chip mark (d3e784a)
- refactor(components): optimize component activation logic (3acbdad)
- fix(ADBHandler): increase timeout for reboot efex to 10s (30d0afb)
- feat(adb): add folder pull functionality (b0d0f69)
- feat(i18n): add new error message for firmware reload failure (21e39b4)
- feat(popup): add confirm dialog type and storage mismatch handling (401aa02)
- feat(FirmwareDownloader): add firmware reload after flashing (3fec3a5)
- fix(adb): correct method name for pulling folder (e091b4d)

## OpenixSuit v0.3.13

### Changes
- ci: add xdg-utils to ubuntu build dependencies (e32353f)
- build(tauri): add linux package dependencies configuration (a9e3dcb)
- chore: update libefex submodule to latest commit (1ae085a)
- chore: update libefex submodule to latest commit (f0a466d)
- chore: update libefex submodule to latest commit (1f9878d)
- ci: add ubuntu-24.04-arm support and update ubuntu dependencies (8262c58)
- chore: update libefex submodule to latest commit (cb66da0)
- refactor(spinor_convert): simplify error handling and formatting (6bd1397)
- ci: update submodules checkout to recursive in workflows (3e2d85c)
- chore: bump version to 0.3.13 and add norSize translation (22ff121)
- style(themes): adjust success color in catppuccin theme (4cb2724)
- style(Themes): update success color in openix theme (4904cd7)
- feat(firmware-packer): add nor size configuration for spinor conversion (e1156c7)
- fix: change default tool mode to 'reboot' for device next mode (45ac759)
- ci: add i18n locales sync step to release workflow (f89da03)
- feat(flash): add timeout handling for reboot efex command (bf085d7)
- build(android): add generated Android project files and resources (a408f32)
- chore: update libefex subproject commit (c4fc518)
- fix(init): generate fake libusb-1.0.dll when missing (5bdf866)

## OpenixSuit v0.3.12

### Changes
- chore: bump version to 0.3.12 (629027f)
- feat(i18n): add zh-TW, ja-JP and ko-KR language support (b625459)

## OpenixSuit v0.3.11

### Changes
- chore: bump version to 0.3.11 (d96d9c0)
- feat: add isActive prop to control component visibility (b24ccdb)

## OpenixSuit v0.3.10

### Changes
- chore: bump version to 0.3.10 (b039797)
- refactor(tools): improve tool panel rendering with css transitions (c926afd)
- refactor(EFELGui): reorganize components and hooks into separate files (b7148c3)

## OpenixSuit v0.3.9

### Changes
- chore: bump version to 0.3.9 (634766a)
- refactor(GPIO): clean up code and fix linting issues (1b08376)
- refactor: improve code formatting and consistency across multiple files (881a8fa)
- refactor(GPIO): simplify register offset handling and improve progress tracking (e6ec621)
- feat(gpio-viewer): implement GPIO viewer component with device management and pin control (a54f51b)
- style(FirmwareDownloader): decrease font size for progress stage text (ec086a4)
- feat(gpio-viewer): add multi-pin editing and chip support improvements (fb04048)
- feat(GPIOViewer): refactor pin configuration with inline editing (6404902)
- feat(GPIOViewer): add GPIO viewer component with pin configuration (9001bcd)
- refactor(fs): simplify file system permissions configuration (177f11d)
- refactor(capabilities): reorganize fs permission identifiers (f8fb597)
- fix(hotplug): improve error handling and fallback mechanism (e38a8da)
- refactor(capabilities): simplify file system access permissions (c643173)
- refactor(proxy): conditionally import warn on windows only (005f5f3)

## OpenixSuit v0.3.8

### Changes
- chore: bump version to 0.3.8 and remove unused README (de412b1)
- feat(capabilities): expand file access permissions for home directory (a7c2d66)
- refactor(hooks): add missing dependencies and eslint-disable comments (86ab66a)
- fix: add eslint-disable comments and improve error handling (99c63f9)
- chore: add eslint and prettier configuration (9ddd60b)
- feat(FirmwarePacker): reorder tools list and add defaultFlashType to sdcard_converter (2221879)
- refactor(diskpart): simplify if conditions and use div_ceil for alignment (7721011)
- refactor: improve code formatting and error handling (af47265)
- refactor(packer): improve logging messages with sector info (8096b5a)
- style(FirmwarePacker): fix indentation in tools list rendering (b4942d7)
- feat(FlashManager): add completion handling for external working state (e003903)
- feat(image): add sparse image support for firmware loading (1e3936d)
- style(FirmwarePacker): improve css selector specificity for form labels (eb2e7dd)
- feat(gpt): add header module with GPT header manipulation (7626da4)
- feat(firmware-packer): add storage size configuration for GPT adjustment (363ed2d)
- feat(i18n): add english translations for firmware packer and generic flash (c2dadba)
- refactor(packer): improve firmware merging with progress tracking and streaming (bcaf788)
- feat(firmware-packer): add block device converter for eMMC/UFS/SD formats (b89fadd)
- feat(firmware-packer): add SPI NOR firmware converter tool (99e7d49)

## OpenixSuit v0.3.7

### Changes
- feat: bump version to 0.3.7 and remove EFES toolbox feature (f1c1a27)
- refactor(EFELGui): improve execution button layout and i18n text (8010f2c)
- refactor(ui): adjust button spacing and reorder components (5464067)
- refactor: remove EFESGui component and related files (7e128fe)
- feat(i18n): improve logic offset detection messages (5385f8b)
- feat(GenericFlash): add remember last image path functionality (fc5272d)
- feat(i18n): add Chinese translations for EFES GUI components (88b7330)
- style(FlashControl): change button color from success to primary for consistency (bb85ebb)
- style(ADBExplorer): remove color from modified file indicator (bacb260)
- refactor(hotplug): simplify hotplug event handling and remove redundant logs (6b1a68e)
- feat(i18n): add default translations for device status messages (3cb621c)
- refactor(device-scanner): remove i18n prefix parameter and centralize translations (3da044d)
- refactor(architecture): consolidate shared hooks and utils into central locations (0a46f70)

## OpenixSuit v0.3.6

### Changes
- chore: update libefex submodule (9e1dbd7)
- fix(hotplug): prevent race conditions in device scanning (c190654)
- feat(EFESGui): implement EFES GUI with device scanning, FES boot configuration, and operation panels (74c834a)
- refactor: remove EFESGui component and related files (df7499c)
- feat(EFESGui): consolidate tools and improve UI layout (6764fa4)
- style(theme): update button class and light theme colors (834ceb6)
- feat(theme): add theme viewer component for previewing styles (2a8cbd6)
- refactor(EFESGui): remove unused firmware info display and state (5372891)
- style(Themes): update yuzuki theme color palette (c9a04b4)
- refactor(settings): improve settings state management and revert logic (a960882)
- feat(theme): update default theme settings and add openix theme (7b78331)
- feat(FlashManager): update progress stage after partition download (b2fd6df)
- feat(flash): increase log container height and improve device list UX (991a21f)
- feat(GenericFlash): refactor flash logic into separate mode handlers (fe13662)
- feat(GenericFlash): add flash mode selection and improve UI (bda8b02)
- feat(generic-flash): add MBR copy count support and fix arithmetic overflow (b69aaa2)
- style(GenericFlash): increase log container height from 140px to 200px (f3cccbd)
- feat(device): add ADB device support to EFEL and EFES GUI (05ee572)
- style(select): improve dropdown styling consistency across components (93e1d9c)
- feat(ADBExplorer): add transfer state overlay for file operations (45e5ecb)
- feat(ADBExplorer): add Ctrl+S shortcut to save edited file (98076f6)
- style(ADBExplorer): remove redundant styling from edit indicator (d365fa0)
- refactor(FlashManager): remove unused cancelled flag in flash operation (08f3bcd)
- refactor(FlashManager): simplify flash operation completion handling (26a03b1)
- feat(i18n): update translation files and component props (6942729)
- feat(EFESGui): add new EFES GUI component with tools and utilities (2cb5656)
- refactor(GenericFlash): simplify storage type mismatch validation (d687d44)
- style(FirmwareDownloader): remove redundant gradient from selected partition item (fe05a1e)
- style(SectorFlash): add accent color to checkbox input (396b3a7)
- feat: add EFES toolbox tool and update translations (ecbcaef)
- feat(diskpart): improve GPT parsing with direct read attempt (e2fbbf5)
- refactor(logging): remove unused log levels from imports (229a161)
- feat: add debug logging across multiple modules (849a4db)
- docs(i18n): update error messages for unsupported image formats (f114285)
- fix(diskpart): improve disk partition parsing reliability (a3ae90b)
- feat(diskpart): add logging and improve GPT/MBR parsing (232aef9)
- feat(storage): add UFS support for logic offset configuration (cebacca)
- fix(Devices): correct erase flag values for flash modes (17f13e2)
- refactor(settingsStore): implement debounced saving with pending settings (3fa8321)
- feat(genericFlash): add MBR download and creation support (eeb1183)
- style(ADBExplorer): add light theme styles for edit indicator (c48abd1)

## OpenixSuit v0.3.5

### Changes
- chore: bump version to 0.3.5 and add developer tools translations (7dccda1)
- feat(developer): add devtools support in settings (95e514d)
- style(FirmwareDownloader): simplify current partition readonly styling (b004987)
- refactor(partitionEditorUtils): remove redundant file filter options (ae5915b)
- refactor(GenericFlash): remove file filters and boot image release (756ab41)
- feat(ADB): add timeout to device listing to prevent hanging (fc5590d)
- style(ADBExplorer): adjust icon brightness for light theme (798f5de)

## OpenixSuit v0.3.4

### Changes
- chore: update adb_client submodule to latest commit (a157979)
- fix win fs (7aaa1ee)
- feat(themes): add new theme configurations and rename atom-one (55e657b)
- feat: add ADB module export to Library index (f398d6e)
- feat(themes): add arduino theme and light variants for dracula and atom-one (78f36d8)
- feat(editor): add support for dynamic theme switching in monaco editor (a4021dd)
- fix(settingsStore): prevent race conditions in settings save operations (38e5240)
- feat(theme): add theme translations and improve theme handling (294422c)
- chore: bump version to 0.3.4 and remove unused theme settings (d8aae72)
- feat(themes): add yuzuki theme and remove OwO variant from catppuccin (9ec401d)
- feat(theme): add derived colors and refactor CSS to use theme variables (496e0ae)
- feat(themes): improve theme handling and add new light variant (e17c461)
- feat(themes): restructure theme configuration and add new themes (c96f8f7)
- feat(themes): add theme system with light and dark modes (11a92b4)
- refactor(utils): consolidate utility functions into dedicated modules (b06a28f)
- feat(updater): enhance update progress display with download details (4247159)
- feat(image-loader): handle encrypted images and improve error reporting (c20e127)
- refactor(adb): update import paths from 'Adb' to 'ADB' (dbd005a)
- refactor(FirmwareLoader): simplify DTB handling and parsing (2a258aa)
- refactor: optimize tauri api imports for better performance (88e7945)

## OpenixSuit v0.3.3

### Changes
- chore: bump version to 0.3.3 and update i18n files (8905418)
- feat(flash): add image resource release before flashing (884f767)
- refactor(GenericFlash): improve logic offset detection and validation (bfe558a)
- fix(i18n): update flash control button text for clarity (6d06961)
- fix(GenericFlash): handle logic offset overflow in flash state (52b7983)
- feat(GenericFlash): add logic offset support for raw image flashing (ebf3aea)
- feat(flash): add logic offset configuration for flash operations (38aa06b)
- feat(fdt): add DTS generation support for device tree (f3ea157)
- feat(MonacoEditor): add reusable Monaco editor component and DTB viewer (74a2c33)
- refactor(dtb): improve property parsing and node path handling (59c7280)
- feat(dtb): add device tree blob parsing functionality (1eeb4ae)
- refactor: remove unused GPT parser code and exports (b11c026)
- feat(deviceScanner): add device scanning status messages (4f61aa0)
- refactor(FlashLog): use centralized log level display function (d852d3d)
- feat(adb): support more file types in ADB file listing (edb6480)
- fix(FlashManager): improve flash completion handling (3acfe2f)
- feat(i18n): add initialization timeout message and update translations (9b72c14)
- refactor(SectorFlash): extract partition editor utilities and components (8c26a71)
- feat(i18n): add Chinese translations for UI components and error messages (59e1dc4)
- feat(diskpart): add MBR support and refactor disk parsing (154e41e)
- feat(gpt): add GPT partition table parsing functionality (7458033)
- refactor(GenericFlash): replace partition table with raw image info display (e42ae18)
- feat(sector-flash): add clear all partitions functionality (717b63e)
- feat(PartitionEditor): add clear all partitions functionality (56d673e)
- refactor(FlashLog): use getLogLevelDisplay for consistent log level formatting (7baf3af)
- feat(DRAM): add dynamic timeout calculation for DRAM initialization (ec68db0)
- refactor(FlashManager): rename ADB2FELHandler to ADBHandler for consistency (aaa4211)
- refactor(GenericFlash): restructure flash functionality into modular hooks (b728e4b)
- feat(Settings): add bootloader option to flash mode and use translation (7f2a73b)
- feat(generic-flash): add generic flash component with bootloader support (5bb671b)
- feat: prevent default browser search with Ctrl+F (202b043)

## OpenixSuit v0.3.2

### Changes
- refactor(ADBExplorer): remove unused selection hooks (a0db26e)
- refactor(ADBExplorer): remove multi-selection feature and related code (8a53bdc)
- fix(ADBExplorer): remove redundant context menu handlers and add conditional logic (2ae33af)
- refactor(MonacoEditor): simplify editor options configuration (326058c)
- feat(editor): integrate monaco editor with custom theme and options (bf61868)
- chore: bump version to 0.3.2 (c466235)
- docs(i18n): update references from Sunxi to Allwinner in locale files (79517d7)
- feat(logging): set default log level to warn (1c2f112)
- feat(TextEditor): add Catppuccin Mocha theme for Monaco editor (ebc9c9c)
- feat(editor): add text editor for viewing and editing files (4969d8c)
- refactor(adb): remove debug println in shell command execution (ba8098e)
- refactor(ADBExplorer): simplify file opening by removing save dialog (b5730ee)
- refactor(adb): reorganize module imports and improve code formatting (516ca9c)
- refactor(ADBExplorer): simplify drag drop logic and adjust content positioning (5e2c43d)
- fix(ADBExplorer): correct drag and drop position calculation (880cba2)
- feat(ADBExplorer): add clear selection on background click (87503df)
- refactor(ADBExplorer): improve drag-drop handling and context menu positioning (05cebb4)
- fix(ADBExplorer): prevent duplicate server status checks and device scans (095689a)
- refactor(adb): make server status check async and add timeout (4ea45c7)
- feat(SectorFlash): add indeterminate state to progress bar (6f1fc36)
- style(SectorFlash): remove left border from flashing row (e479578)
- feat(SectorFlash): add partition flashing progress visualization (f63b64f)
- refactor(flash): simplify partition download logic and remove batch processing (263fb79)
- feat(flash): add partition-level progress tracking (29a605b)
- style: disable text selection globally and enable for log areas (3da384d)
- refactor(ADBExplorer): remove selection box feature and improve file item styling (4de56cc)
- refactor(icons): replace material icons with emoji-based system (9d09f14)
- refactor(Icons): replace custom icon implementation with material-icon-theme (711a3e2)
- feat(ADBExplorer): add multi-selection and file upload functionality (509c481)
- feat(ADBExplorer): extract action hooks for better code organization (b297037)
- feat(ADBExplorer): add rename functionality and refactor component structure (44c7c92)
- build: add adb_client submodule (1df6d67)
- chore: remove adb_client submodule dependency (e4e11de)
- feat(adb-explorer): improve root permission UI and add translations (721e35c)
- chore: remove adb_client submodule as it's no longer needed (30ce340)
- feat(adb-explorer): add create folder and improve file operations (d9cedc4)
- Update adb_client submodule (ba30e95)
- feat(ADBExplorer): add file opening capability via opener plugin (d7849e6)
- fix(ADBExplorer): handle device disconnection and improve UI state management (d1af562)
- refactor(OpenixIMG): simplify partition data retrieval logic (72e7a2a)
- refactor(ADBExplorer): update Chinese translation and remove redundant styles (ac8d6fa)
- feat(FlashManager): add ADB to FEL mode transition support (ec1f7e2)
- feat(ADBExplorer): improve device selection UI and add no device state (eea54fe)
- feat(adb): add root command and UI for device root status (43193ca)
- refactor(ADBExplorer): reorder and enhance device scanning logic (a824f3a)
- refactor(logging): remove stdout target from logging plugin (85e412e)
- refactor(FESHandler): unify partition download handling with unified interface (dbd7172)
- refactor(MBRParser): add partition address recalculation logic (fe559e3)
- refactor(PartitionEditor): simplify address calculation logic (0166f62)
- feat(adb): add ADB file explorer with device management and file operations (b09e295)

## OpenixSuit v0.3.1

### Changes
- chore: bump version to 0.3.1 (b5d9ab8)
- feat(firmware): add secure firmware check and UI improvements (e07ccd7)

## OpenixSuit v0.3.0

### Changes
- chore: bump version to 0.3.0 and clean up i18n messages (3ebd1cb)
- feat: add hotplug support and improve device scanning (38c521a)
- feat(PartitionEditor): implement drag-and-drop sorting with dnd-kit (e575ba6)
- feat(partition-editor): add drag-and-drop to reorder partitions (e964e0d)
- feat(sector-flash): add partition auto-alignment and improve table styling (0f3d56d)
- feat(flash): add support for downloading partitions from external files (27013cc)
- feat(SectorFlash): improve file path display with auto-scrolling (b7eb4db)
- feat(SectorFlash): add partition file size validation and auto-resizing (0e007f7)
- refactor(SectorFlash): adjust actions column width and add mbr builder tracking (0512620)
- feat(SectorFlash): add persistent image loading with settings (7992a0e)
- feat(partitionEditor): add MBR modification tracking and reload functionality (f016107)
- feat(sector-flash): add support for MBR copies in flash process (f8ccf9d)
- feat(partition): add support for custom partition files (d71a50d)
- refactor(FlashManager): move flash manager to root directory and consolidate types (7ba42b3)
- feat(sector-flash): add sector flash feature with hooks and i18n support (ad77349)
- feat: add firmware sector flash tool to main menu (717885d)

## OpenixSuit v0.2.8

### Changes
- chore: bump version to 0.2.8 and clean up i18n files (efa113e)
- feat(flash): add flash access control during firmware download (071b39b)
- feat(SectorFlash): add support for inserting partitions before UDISK (78375a3)
- refactor(PartitionEditor): update align mode types and labels (69712f0)
- feat(PartitionEditor): add sector alignment functionality (3dfe610)
- feat(PartitionEditor): enhance partition editor with file selection and config support (654e06d)
- refactor(SectorFlash): extract components into separate files for better maintainability (0d1c56b)
- style(SectorFlash): adjust styling for row-adding state in table (e72bfb4)
- style(SectorFlash): update progress bar background color (f709495)
- feat: enable firmware sector and raw flash tools (705e8db)

## OpenixSuit v0.2.7

### Changes
- chore: bump version to 0.2.7 (53bd011)
- refactor: remove unused firmware flash tools and i18n strings (dca72a5)
- feat(FlashConfig): replace radio with select for flash mode (5256486)
- feat(SectorFlash): enhance firmware flashing with boot and partition support (fa70bf3)
- docs(i18n): update flash tool title for consistency (fa22bcf)
- feat(firmware-downloader): implement dynamic sizing for log and partition components (fe81e96)
- refactor(sector-flash): restructure component and update styles (b9cfdb9)
- style(FirmwareDownloader): increase min-width of device and action sections (8573f13)
- refactor(Devices): use parser functions for secure and storage type logging (14f60b7)
- feat(utils): add error message formatting utility (df93b8f)
- feat(sectorflash): enhance firmware handling and rename MBR to partition editor (841a4bf)
- fix: update download links and dependencies formatting (b83e06b)
- feat(sector-flash): add sector flash component with MBR editor and device management (ae4176e)

## OpenixSuit v0.2.6

### Changes
- chore: bump version to 0.2.6 (25a8100)
- fix(Devices): improve boot0 fallback error logging (33440f4)
- fix(i18n): add missing error message and clean up unused translations (52c9e10)
- style(FirmwareDownloader): remove max-height restriction for flex items (93616f6)
- refactor(FirmwareLoader): extract firmware loading logic to custom hook (662bf42)
- fix(FirmwareDownloader): hide partition selector when flash mode is erase_only (08963fd)
- docs(i18n): update Chinese translation for flash mode option (aa1f4d2)
- style(FirmwareDownloader): increase max-width of element from 200px to 450px (1eeaae8)
- fix(EFELGui): improve device selection logic during scan (48779a5)
- feat(release): add script to generate download links (c80e5f7)

## OpenixSuit v0.2.5

### Changes
- chore: bump version to 0.2.5 (1fac09e)
- feat(i18n): add image data translations and update references (b193445)
- feat(firmware): add erase-only flash mode support (95c1000)
- feat(FirmwareDownloader): add loading state to disable flash mode selection (4f8a8ac)
- style(EFELGui): improve device list scrollbar appearance (8c5ae00)
- feat(i18n): add device selection error message (308208e)
- fix(Settings): make language change persistent and handle errors (7175bdd)
- feat: add firmware sector flash tool to menu (b440e2a)
- feat(firmware-downloader): improve device selection UI during flashing (d1e85d4)
- feat(device): add device selection and context management (e62007f)
- fix(efex): update device scanning to use specific bus and port (aaeb4be)
- feat(firmware-downloader): improve UI layout and device selection hints (4316e97)
- feat(firmware-downloader): add multi-device support and selection hint (52964eb)
- ci(release): add download links to release notes (29255af)
- fix(SysConfigParser): correct uart baud rate key name (2a10637)
- feat(device): add fallback boot0 image handling (9e85418)
- feat(FirmwareDownloader): add debounce for USB device arrival events (04b3f5f)

## OpenixSuit v0.2.4

### Changes
- ci: improve version extraction and git config setup in release workflow (3c3c682)
- chore: bump version to 0.2.4 (b46c3b2)
- feat(firmware-downloader): enhance flash progress tracking and UI (df92897)
- refactor(Devices): remove debug console logs from UBIFS magic check (112be67)

## OpenixSuit v0.2.3

### Changes
- ci(release): improve changelog update logic in workflow (7954ba2)
- ci: fix incorrect paths in latest.json during release (e7a31b9)
- ci(release): refactor release workflow to include prepare step (7b7254e)
- ci: merge BuildReleasePub into BuildRelease.yml and add sync-to-public job (398b50b)
- ci(release): enhance release workflow with release id output (9635fb5)
- ci: replace BuildRelease with enhanced BuildReleasePub workflow (3ea2d2d)
- ci: use RELEASE_TOKEN instead of GITHUB_TOKEN for tauri builds (940165a)
- chore: bump version to 0.2.3 and clean up i18n messages (ffef67e)
- ci: simplify release workflow and remove manual dispatch (639ebc6)
- feat(sparse-parser): improve download progress tracking and remove unused FEL2FES (4138339)
- feat(sparse): implement modular sparse image parser and downloader (50300d9)
- fix: increase max retries for FEL2FES reconnection (671bffd)
- refactor(UBIFS): replace PartitionDataProvider with UbifsDataProvider (d15cf67)
- feat(sparse): add sparse image format support for partition downloads (666ebe8)
- feat: add init script and improve firmware handling (0d5dd27)
- add build release action (5b956e3)
- feat(MBRParser): add builder class and CRC32 utility (5c5cb5c)
- refactor(MBRParser): restructure partition parsing with field definitions (3e01505)
- docs: add architecture v2 documentation (955e7d7)
