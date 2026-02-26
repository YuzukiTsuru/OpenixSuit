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
