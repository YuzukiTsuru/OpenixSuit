export function getChipName(chipId: number): string {
    if (chipId === 0x00161000) {
        return `Sunxi FES Devices`;
    }
    return `Sunxi FEL Device (0x${chipId.toString(16).toUpperCase().padStart(8, '0')})`;
}

export function formatChipId(chipId: number): string {
    return `0x${chipId.toString(16).toUpperCase().padStart(8, '0')}`;
}
