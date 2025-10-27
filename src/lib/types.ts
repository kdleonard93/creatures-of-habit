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
	DWARF: 'dwarf'
} as const;

export type CreatureClassType = (typeof CreatureClass)[keyof typeof CreatureClass];
export type CreatureRaceType = (typeof CreatureRace)[keyof typeof CreatureRace];


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

export interface EquipmentRecord {
    id: string;
    creatureId: string;
    slot: EquipmentSlot;
    itemId: string;
    equipped: number;
}

export interface EnhancedEquipment extends EquipmentRecord {
    name: string;
    details?: Equipment;
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

export interface HabitData {
	title: string;
	description?: string;
	categoryId?: string;
	category?: {
		id: string;
		name: string;
		description?: string;
	};
	frequency: HabitFrequency;
	customFrequency?: {
		days?: number[]; // [0,1,2,3,4,5,6] for specific days of week
	};
	days?: number[];
	difficulty: HabitDifficulty;
	startDate: string;
	endDate?: string;
}

export interface ContactFormData {
	name: string;
	email: string;
	message: string;
}

export type HabitFrequency = 'daily' | 'weekly' | 'custom';
export type HabitDifficulty = 'easy' | 'medium' | 'hard';

export interface HabitCategory {
	id: string;
	name: string;
	description?: string;
	isDefault: boolean;
}

export interface HabitCompletion {
	id: string;
	habitId: string;
	completedAt: string;
	value: number;
	experienceEarned: number;
	note?: string;
}

export interface HabitStreak {
	habitId: string;
	currentStreak: number;
	longestStreak: number;
	lastCompletedAt?: string;
}

export interface Notifications {
	id: string;
	message: string;
	type: NotificationType;
	subject: string;
	timestamp: Date;
	browserNotification?: Notification;
	category?: NotificationCategory;
}

export type NotificationChannel = 'email' | 'sms' | 'push' | 'in-app';
export type NotificationCategory = 'reminder' | 'achievement' | 'system' | 'quest';

export type NotificationType = NotificationChannel;

export interface WaitlistData {
    title: string;
    description: string;
}