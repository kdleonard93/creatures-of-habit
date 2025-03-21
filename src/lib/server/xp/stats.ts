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

function getTotalStatPoints(stats: CreatureStats): number {
	return Object.values(stats).reduce((total, value) => {
		return total + calculateStatCost(value);
	}, 0);
}

export function allocateStatPoints(
	currentStats: CreatureStats, 
	statToModify: keyof CreatureStats, 
	increment: boolean
  ): { stats: CreatureStats; remainingPoints: number } {
	const newStats = {...currentStats};

	if (increment) {
	  if (statToModify === 'intelligence' && 
		  Object.values(currentStats).some(val => val === 15) && 
		  currentStats.intelligence === 8) {
			return { 
			  stats: newStats, 
			  remainingPoints: 0 
			};
	  }
	  
	  if (newStats[statToModify] < STAT_MAX) {
		newStats[statToModify]++;
		const newPoints = getTotalStatPoints(newStats);
		return { 
		  stats: newStats, 
		  remainingPoints: INITIAL_STAT_POINTS - newPoints 
		};
	  }
	} else {
	  if (newStats[statToModify] > STAT_MIN) {
		newStats[statToModify]--;
		const newPoints = getTotalStatPoints(newStats);
		return { 
		  stats: newStats, 
		  remainingPoints: INITIAL_STAT_POINTS - newPoints 
		};
	  }
	}
	
	const currentPoints = getTotalStatPoints(currentStats);
	return { 
	  stats: newStats, 
	  remainingPoints: INITIAL_STAT_POINTS - currentPoints 
	};
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
	let effectiveStats = { ...baseStats };

	effectiveStats = applyRacialBonuses(effectiveStats, race);

	const classModifiers = getClassStatModifiers(classType);
	Object.entries(classModifiers).forEach(([stat, modifier]) => {
		const statKey = stat as keyof CreatureStats;
		if (modifier) effectiveStats[statKey] += modifier;
	});

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

	const firstLevelHealth = baseHealth + constitutionModifier;

	const additionalLevels = level - 1;
	const levelUpHealth = additionalLevels * (baseHealth / 2 + 1 + constitutionModifier);

	return Math.max(1, Math.floor(firstLevelHealth + levelUpHealth));
}