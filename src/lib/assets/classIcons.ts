import type { CreatureClassType } from '$lib/types';

const warriorIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="w-8 h-8">
  <circle cx="50" cy="50" r="40" fill="#67917A"/>
  <path d="M30 30 L70 70 M30 70 L70 30" stroke="#CCBF82" stroke-width="8"/>
  <circle cx="50" cy="50" r="10" fill="#170409"/>
</svg>`;

const brawlerIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="w-8 h-8">
  <circle cx="50" cy="50" r="40" fill="#67917A"/>
  <path d="M30 40 L70 40 L70 60 L30 60 Z" fill="#B8AF03"/>
  <path d="M35 45 L65 45 M35 55 L65 55" stroke="#170409" stroke-width="3"/>
</svg>`;

const wizardIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="w-8 h-8">
  <circle cx="50" cy="50" r="40" fill="#67917A"/>
  <path d="M35 70 L50 20 L65 70" fill="#E33258"/>
  <path d="M40 50 L60 50" stroke="#CCBF82" stroke-width="4"/>
  <circle cx="50" cy="45" r="5" fill="#CCBF82"/>
</svg>`;

const clericIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="w-8 h-8">
  <circle cx="50" cy="50" r="40" fill="#67917A"/>
  <path d="M40 20 L60 20 L60 40 L80 40 L80 60 L60 60 L60 80 L40 80 L40 60 L20 60 L20 40 L40 40 Z" 
        fill="#CCBF82" transform="scale(0.6) translate(33.33, 33.33)"/>
</svg>`;

const assassinIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="w-8 h-8">
  <circle cx="50" cy="50" r="40" fill="#67917A"/>
  <path d="M30 70 L50 30 L70 70 L50 60 Z" fill="#170409"/>
  <path d="M40 45 L60 45" stroke="#E33258" stroke-width="2"/>
</svg>`;

const archerIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="w-8 h-8">
  <circle cx="50" cy="50" r="40" fill="#67917A"/>
  <path d="M30 50 C30 30 70 30 70 50" fill="none" stroke="#B8AF03" stroke-width="4"/>
  <path d="M50 30 L50 70" stroke="#CCBF82" stroke-width="2"/>
  <path d="M45 35 L50 30 L55 35" fill="none" stroke="#CCBF82" stroke-width="2"/>
</svg>`;

const alchemistIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="w-8 h-8">
  <circle cx="50" cy="50" r="40" fill="#67917A"/>
  <path d="M40 30 L40 50 L30 70 L70 70 L60 50 L60 30" fill="none" stroke="#CCBF82" stroke-width="3"/>
  <circle cx="50" cy="60" r="8" fill="#E33258"/>
</svg>`;

const engineerIcon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" class="w-8 h-8">
  <circle cx="50" cy="50" r="40" fill="#67917A"/>
  <path d="M20 50 L80 50" stroke="#B8AF03" stroke-width="3"/>
  <path d="M30 40 L40 60 M70 40 L60 60" stroke="#B8AF03" stroke-width="6"/>
  <circle cx="50" cy="50" r="8" fill="#170409"/>
</svg>`;

export const classIcons: Record<CreatureClassType, string> = {
  warrior: warriorIcon,
  brawler: brawlerIcon,
  wizard: wizardIcon,
  cleric: clericIcon,
  assassin: assassinIcon,
  archer: archerIcon,
  alchemist: alchemistIcon,
  engineer: engineerIcon
};

export {
  warriorIcon,
  brawlerIcon,
  wizardIcon,
  clericIcon,
  assassinIcon,
  archerIcon,
  alchemistIcon,
  engineerIcon
};