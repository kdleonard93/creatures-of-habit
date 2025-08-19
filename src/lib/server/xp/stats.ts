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

export function calculateStatCost(_currentValue: number): number {
	return 1;
}

/**
 * Allocate stat points for character creation
 * Returns updated stats and remaining points
 * 
 * This function calculates the correct number of remaining stat points by:
 * 1. Starting with the initial stat points (27)
 * 2. Subtracting the cost of all current stats
 * 3. When increasing a stat, subtracting the cost of the new value
 * 4. When decreasing a stat, adding back the cost of the old value
 */
export function allocateStatPoints(
	currentStats: CreatureStats,
	statToModify: keyof CreatureStats,
	increment: boolean
): { stats: CreatureStats; remainingPoints: number } {
	const newStats = { ...currentStats };
	let remainingPoints = INITIAL_STAT_POINTS;

	// Calculate current total point cost
	for (const value of Object.values(currentStats)) {
		remainingPoints -= Math.max(0, value - STAT_MIN)
	}

	const currentValue = newStats[statToModify];
	if (increment) {
		const newValue = currentValue + 1;
		if (newValue > STAT_MAX || remainingPoints <= 0) {
			return { stats: currentStats, remainingPoints };
		  }
			newStats[statToModify] = newValue;
			remainingPoints -= 1;
	} else {
		const newValue = currentValue - 1;
		if (newValue < STAT_MIN) {
			return { stats: currentStats, remainingPoints };
		}
		newStats[statToModify] = newValue;
		remainingPoints += 1;
	}

	return { stats: newStats, remainingPoints };
}

export function calculateStatModifier(statValue: number): number {
	return Math.floor((statValue - 10) / 2);
}

export function getTotalStatPoints(stats: CreatureStats): number {
	return Object.values(stats).reduce((total, value) => {
		return total + Math.max(0, value - STAT_MIN);
	}, 0);
}

export function applyRacialBonuses(stats: CreatureStats, race: CreatureRaceType): CreatureStats {
	const newStats = { ...stats };
	const raceBonuses = raceDefinitions[race]?.statBonuses || {};

	for (const [stat, bonus] of Object.entries(raceBonuses)) {
		const statKey = stat as keyof CreatureStats;
		newStats[statKey] += bonus as number;
	}

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
		for (const stat of classInfo.primaryStats) {
			modifiers[stat] = 1;
		}
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
	for (const [stat, modifier] of Object.entries(classModifiers)) {
		const statKey = stat as keyof CreatureStats;
		if (modifier) effectiveStats[statKey] += modifier;
	}

	// Apply level-based increases (every 4 levels)
	const _statIncreases = Math.floor((level - 1) / 4);


	// Apply equipment bonuses
	for (const item of equipment) {
		if (item.bonuses) {
			for (const [stat, bonus] of Object.entries(item.bonuses)) {
				const statKey = stat as keyof CreatureStats;
				if (bonus) effectiveStats[statKey] += bonus;
			}
		}
	}

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
	const _classInfo = classDefinitions[classType];

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