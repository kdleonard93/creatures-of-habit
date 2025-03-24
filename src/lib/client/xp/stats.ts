import type { CreatureStats, CreatureRaceType, CreatureClassType } from '$lib/types';
import { raceDefinitions } from '$lib/data/races';
import { classDefinitions } from '$lib/data/classes'

export const STAT_MIN = 8;
export const STAT_MAX = 15;
export const INITIAL_STAT_POINTS = 27;

export function createInitialStats(): CreatureStats {
	return {
		strength: 8,
		dexterity: 8,
		constitution: 8,
		intelligence: 8,
		wisdom: 8,
		charisma: 8
	};
}

export function calculateStatCost(currentValue: number): number {
	if (currentValue <= 13) return currentValue - 8;
	if (currentValue === 14) return 5;
	if (currentValue === 15) return 7;
	return 0;
}

export function getTotalStatPoints(stats: CreatureStats): number {
	return Object.values(stats).reduce((total, value) => {
		return total + calculateStatCost(value);
	}, 0);
}


export function allocateStatPoints(
	currentStats: CreatureStats,
	statToModify: keyof CreatureStats,
	increment: boolean
): { stats: CreatureStats; remainingPoints: number } {
	const newStats = { ...currentStats };
	let remainingPoints = INITIAL_STAT_POINTS;

	// Calculate current total point cost
	Object.values(currentStats).forEach((value) => {
		remainingPoints -= calculateStatCost(value);
	});

	const currentValue = newStats[statToModify];
	const costOfChange = calculateStatCost(increment ? currentValue + 1 : currentValue - 1);
	const costDifference = increment ? costOfChange : -calculateStatCost(currentValue);

	if (increment && currentValue < STAT_MAX && remainingPoints >= costOfChange) {
		newStats[statToModify]++;
		remainingPoints -= costOfChange;
	}

	if (!increment && currentValue > STAT_MIN && remainingPoints + costDifference >= 0) {
		newStats[statToModify]--;
		remainingPoints += costDifference;
	}

	return { stats: newStats, remainingPoints };
}

export function calculateStatModifier(statValue: number): number {
	return Math.floor((statValue - 10) / 2);
}

export function applyRacialBonuses(stats: CreatureStats, race: CreatureRaceType): CreatureStats {
	const newStats = { ...stats };
	const raceBonuses = raceDefinitions[race]?.statBonuses || {};

	Object.entries(raceBonuses).forEach(([stat, bonus]) => {
		const statKey = stat as keyof CreatureStats;
		newStats[statKey] += bonus as number;
	});

	return newStats;
}

/**
 * Apply class-based modifiers
 */
export function getClassStatModifiers(classType: CreatureClassType): Partial<CreatureStats> {
	const classInfo = classDefinitions[classType];
	const modifiers: Partial<CreatureStats> = {};

	// Primary stats for the class get a small bonus
	if (classInfo?.primaryStats) {
		classInfo.primaryStats.forEach((stat) => {
			modifiers[stat] = 1;
		});
	}

	return modifiers;
}

/**
 * Get total effective stats with all bonuses applied
 */
export function getEffectiveStats(
	baseStats: CreatureStats,
	race: CreatureRaceType,
	classType: CreatureClassType,
	level: number,
	equipment: Array<{ slot: string; bonuses?: Partial<CreatureStats> }> = []
): CreatureStats {
	// Start with base stats
	let effectiveStats = { ...baseStats };

	// Apply racial bonuses
	effectiveStats = applyRacialBonuses(effectiveStats, race);

	// Apply class modifiers
	const classModifiers = getClassStatModifiers(classType);
	Object.entries(classModifiers).forEach(([stat, modifier]) => {
		const statKey = stat as keyof CreatureStats;
		if (modifier) effectiveStats[statKey] += modifier;
	});

	// Apply level-based increases (every 4 levels)
	const statIncreases = Math.floor((level - 1) / 4);


	// Apply equipment bonuses
	equipment.forEach((item) => {
		if (item.bonuses) {
			Object.entries(item.bonuses).forEach(([stat, bonus]) => {
				const statKey = stat as keyof CreatureStats;
				if (bonus) effectiveStats[statKey] += bonus;
			});
		}
	});

	return effectiveStats;
}

/**
 * Calculate a creature's health based on stats and level
 */
export function calculateHealth(
	constitution: number,
	level: number,
	classType: CreatureClassType
): number {
	const constitutionModifier = calculateStatModifier(constitution);
	const classInfo = classDefinitions[classType];

	// Base health varies by class
	const baseHealth =
		{
			warrior: 10,
			brawler: 12,
			wizard: 6,
			cleric: 8,
			assassin: 8,
			archer: 8,
			alchemist: 6,
			engineer: 8
		}[classType] || 8;

	// First level gets max health
	const firstLevelHealth = baseHealth + constitutionModifier;

	// Additional levels get an average roll plus constitution modifier
	const additionalLevels = level - 1;
	const levelUpHealth = additionalLevels * (baseHealth / 2 + 1 + constitutionModifier);

	return Math.max(1, Math.floor(firstLevelHealth + levelUpHealth));
}