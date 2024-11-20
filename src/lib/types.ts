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
    };
  }