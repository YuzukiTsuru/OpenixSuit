# Changelog

## OpenixSuit v0.2.3

### Changes
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
