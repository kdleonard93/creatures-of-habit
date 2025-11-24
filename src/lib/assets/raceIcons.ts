import type { CreatureRaceType } from '$lib/types';
import { getSvg } from '$lib/utils/icons';

export const raceIcons: Record<CreatureRaceType, string> = {
    human: getSvg('bandana'),
    orc: getSvg('orc-head'),
    elf: getSvg('woman-elf-face'),
    dwarf: getSvg('dwarf-face'),
};