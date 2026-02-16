export interface ChipInfo {
    name: string;
    aliases?: string[];
}

export const CHIP_ID_MAP: Record<number, ChipInfo> = {
    0x00162300: { name: 'A10', aliases: ['A13', 'R8'] },
    0x00162500: { name: 'A10s', aliases: ['A13', 'R8'] },
    0x00165000: { name: 'A23', aliases: ['A20'] },
    0x00163300: { name: 'A31', aliases: ['A30'] },
    0x00163900: { name: 'A80', aliases: ['A83'] },
    0x00165100: { name: 'A20', aliases: ['A23'] },
    0x00166300: { name: 'F1C100S', aliases: ['F1C200S', 'F1C500S'] },
    0x00166700: { name: 'A33', aliases: ['R16'] },
    0x00167300: { name: 'A83T', aliases: ['A83'] },
    0x00168000: { name: 'H3', aliases: ['H2'] },
    0x00168100: { name: 'V3s', aliases: ['S3'] },
    0x00168900: { name: 'A64', },
    0x00170100: { name: 'R40', aliases: ['A40i'] },
    0x00171800: { name: 'H5', },
    0x00172800: { name: 'H6', },
    0x00175500: { name: 'A50', },
    0x00181600: { name: 'V536', },
    0x00181700: { name: 'V831', },
    0x00182100: { name: 'R328', },
    0x00182300: { name: 'H616', aliases: ['H313', 'H618', 'T507'], },
    0x00185100: { name: 'R329', },
    0x00185900: { name: 'D1', aliases: ['D1s', 'F133', 'R528', 'T113'], },
    0x00188200: { name: 'V821', },
    0x00188300: { name: 'R128', },
    0x00188600: { name: 'V853', aliases: ['V851'], },
    0x00189000: { name: 'A523', aliases: ['A527', 'T527', 'MR527'], },
    0x00190300: { name: 'A733', aliases: ['T736'], },
    0x00191800: { name: 'V881', aliases: ['V861', 'V838'], },
};

export function getChipInfo(chipId: number): ChipInfo | null {
    return CHIP_ID_MAP[chipId] || null;
}

export function getChipName(chipId: number): string {
    const info = CHIP_ID_MAP[chipId];
    if (info) {
        if (info.aliases && info.aliases.length > 0) {
            return `${info.name}/${info.aliases.join('/')}`;
        }
        return info.name;
    }
    if (chipId === 0x00161000) {
        return `Allwinner FES Devices`;
    }
    return `Unknown Chip (0x${chipId.toString(16).toUpperCase().padStart(8, '0')})`;
}

export function getChipPrimaryName(chipId: number): string {
    const info = CHIP_ID_MAP[chipId];
    return info ? info.name : `Allwinner Devices (0x${chipId.toString(16).toUpperCase().padStart(8, '0')})`;
}

export function isKnownChip(chipId: number): boolean {
    return chipId in CHIP_ID_MAP;
}

export function formatChipId(chipId: number): string {
    return `0x${chipId.toString(16).toUpperCase().padStart(8, '0')}`;
}
