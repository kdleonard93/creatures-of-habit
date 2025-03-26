import type { CreatureStats, CreatureRaceType, CreatureClassType } from '$lib/types';
import { raceDefinitions } from '$lib/data/races';
import { classDefinitions } from '$lib/data/classes';

export const STAT_MIN = 8;
export const STAT_MAX = 15;
export const INITIAL_STAT_POINTS = 27;

/**
 * Creates default initial stats
 */
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

/**
 * Calculate cost for a particular stat value
 */
export function calculateStatCost(currentValue: number): number {
	if (currentValue < STAT_MIN || currentValue > STAT_MAX) {
		throw new Error(
			`Stat value ${currentValue} is outside the valid range (${STAT_MIN}-${STAT_MAX})`
		);
	}
	if (currentValue <= 13) return currentValue - 8;
	if (currentValue === 14) return 5;
	if (currentValue === 15) return 7;
	return 0;
}

/**
 * Allocate stat points for character creation
 * Returns updated stats and remaining points
 */
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
	if (increment) {
		const newValue = currentValue + 1;
		const incrementCost = calculateStatCost(newValue);

		if (newValue <= STAT_MAX && remainingPoints >= incrementCost) {
			newStats[statToModify] = newValue;
			remainingPoints -= incrementCost;
		}
	}
	else {
		const newValue = currentValue - 1;
		const currentCost = calculateStatCost(currentValue);

		if (newValue >= STAT_MIN) {
			newStats[statToModify] = newValue;
			remainingPoints += currentCost;
		}
	}

	return { stats: newStats, remainingPoints };
}

/**
 * Calculate a modifier value from a stat
 */
export function calculateStatModifier(statValue: number): number {
	return Math.floor((statValue - 10) / 2);
}

/**
 * Get the total points spent on stats
 */
export function getTotalStatPoints(stats: CreatureStats): number {
	return Object.values(stats).reduce((total, value) => {
		return total + calculateStatCost(value)
	}, 0);
}

/**
 * Apply racial bonuses to stats
 * Uses the actual race definitions from the data folder
 */
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
 * Get class-based stat modifiers
 * Uses class definitions from data folder
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
 * Calculate a creature's health based on stats and level
 */
export function calculateHealth(
	constitution: number,
	level: number,
	classType: CreatureClassType
): number {
	const constitutionModifier = calculateStatModifier(constitution);

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
	const firstLevelHealth = constitutionModifier;

	// Additional levels get an average roll plus constitution modifier
	const additionalLevels = level - 1;
	const averageDiceRoll = Math.floor(baseHealth / 2) + 1;
	const levelUpHealth = additionalLevels * (averageDiceRoll + constitutionModifier);

    const level1Health = baseHealth + constitutionModifier;
    const totalHealth = level1Health + levelUpHealth;
	return Math.max(1, totalHealth);
}
