export const CreatureClass = {
	WARRIOR: 'warrior',
	BRAWLER: 'brawler',
	WIZARD: 'wizard',
	CLERIC: 'cleric',
	ASSASSIN: 'assassin',
	ARCHER: 'archer',
	ALCHEMIST: 'alchemist',
	ENGINEER: 'engineer'
  } as const;


export const CreatureRace = {
	HUMAN: 'human',
	ORC: 'orc',
	ELF: 'elf',
	DWARF: 'dwarf',
  } as const;

export type CreatureClassType = typeof CreatureClass[keyof typeof CreatureClass];
export type CreatureRaceType = typeof CreatureRace[keyof typeof CreatureRace];

export interface CreatureStats {
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
}

export interface RaceAttributes {
  name: CreatureRaceType;
  description: string;
  statBonuses: Partial<CreatureStats>;
  abilities: Array<{
      name: string;
      description: string;
  }>;
  backgroundOptions: Array<{
      title: string;
      description: string;
  }>;
}

export interface ClassAttributes {
  name: CreatureClassType;
  description: string;
  startingEquipment: Array<{
      slot: string;
      itemId: string;
      name: string; 
  }>;
  startingSkills: string[];
  abilities: Array<{
      name: string;
      description: string;
      levelRequired: number;
  }>;
  primaryStats: Array<keyof CreatureStats>;
}

export interface RegistrationData {
    email: string;
    username: string;
    password: string;
    confirmPassword: string;
    age: number;
    creature: {
      name: string;
      class: CreatureClassType;
      race: CreatureRaceType;
      stats: CreatureStats;
      background?: string;
    };
    general: string;
  }

export interface Equipment {
    id: string;
    name: string;
    slot: EquipmentSlot;
    requirements?: Partial<CreatureStats>;
    bonuses?: Partial<CreatureStats>;
    classRestrictions?: CreatureClassType[];
}

export type EquipmentSlot = 
    | 'weapon'
    | 'offhand'
    | 'armor'
    | 'helmet'
    | 'gloves'
    | 'boots'
    | 'accessory1'
    | 'accessory2';