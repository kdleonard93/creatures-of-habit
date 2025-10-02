import type { CreatureClassType } from '$lib/types';
import { getSvg } from '$lib/utils/icons';

export const classIcons: Record<CreatureClassType, string> = {
  warrior: getSvg('crossed-swords'),
  brawler: getSvg('boxing-glove'),
  wizard: getSvg('wizard-staff'),
  cleric: getSvg('holy-grail'),
  assassin: getSvg('hood'),
  archer: getSvg('bowman'),
  alchemist: getSvg('potion-of-madness'),
  engineer: getSvg('robot-grab'),
};
