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

# Changelog

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
