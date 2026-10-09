import type { CreatureStats, CreatureRaceType, CreatureClassType } from '$lib/types';
import { raceDefinitions } from '$lib/data/races';
import { classDefinitions } from '$lib/data/classes';

/**
 * Single source of truth for the stats system, shared by the server and the
 * client so character creation and the running app cannot diverge. See
 * `docs/stats-design.md` and `docs/reports/05-correctness.md` C-4.
 *
 * Allocation is unchanged: every stat has a floor of 8 and a cap of 15, and
 * character creation grants 27 points to spend above the floor, one point per
 * stat. Quest boost points and level-up points are separate currencies that
 * may only raise a base stat up to the cap of 15.
 */

/** Lowest value a base stat can be allocated to. */
export const STAT_MIN = 8;

/** Highest value a base stat can reach, including boost and level points. */
export const STAT_MAX = 15;

/** Points granted at character creation to spend above the floor. */
export const INITIAL_STAT_POINTS = 27;

/** Maximum number of quest stat boost points that can be banked. */
export const STAT_BOOST_POINT_CAP = 20;

/** Every this many levels a creature earns one allocatable stat point. */
export const LEVEL_STAT_POINT_INTERVAL = 5;

/**
 * Creates default initial stats, all at the floor. No points are spent.
 */
export function createInitialStats(): CreatureStats {
	return {
		strength: STAT_MIN,
		dexterity: STAT_MIN,
		constitution: STAT_MIN,
		intelligence: STAT_MIN,
		wisdom: STAT_MIN,
		charisma: STAT_MIN
	};
}

/**
 * Cost of raising a stat by one point. Always 1 under the current model.
 */
export function calculateStatCost(_currentValue: number): number {
	return 1;
}

/**
 * Total points spent on allocated stats (each point above the floor counts).
 */
export function getTotalStatPoints(stats: CreatureStats): number {
	return Object.values(stats).reduce((total, value) => {
		return total + Math.max(0, value - STAT_MIN);
	}, 0);
}

/**
 * Allocate a single stat point during character creation.
 *
 * Recomputes remaining points from the supplied stats each call, refuses to
 * increment past the cap or when the budget is exhausted, and refuses to
 * decrement below the floor. Returns the (possibly unchanged) stats and the
 * remaining points.
 */
export function allocateStatPoints(
	currentStats: CreatureStats,
	statToModify: keyof CreatureStats,
	increment: boolean
): { stats: CreatureStats; remainingPoints: number } {
	const newStats = { ...currentStats };
	let remainingPoints = INITIAL_STAT_POINTS;

	// Calculate current total point cost.
	for (const value of Object.values(currentStats)) {
		remainingPoints -= Math.max(0, value - STAT_MIN);
	}

	const currentValue = newStats[statToModify];
	if (increment) {
		const newValue = currentValue + 1;
		if (newValue > STAT_MAX || remainingPoints <= 0) {
			return { stats: currentStats, remainingPoints };
		}
		newStats[statToModify] = newValue;
		remainingPoints -= calculateStatCost(currentValue);
	} else {
		const newValue = currentValue - 1;
		if (newValue < STAT_MIN) {
			return { stats: currentStats, remainingPoints };
		}
		newStats[statToModify] = newValue;
		remainingPoints += calculateStatCost(newValue);
	}

	return { stats: newStats, remainingPoints };
}

/**
 * Ability modifier derived from a stat value, matching the classic curve.
 */
export function calculateStatModifier(statValue: number): number {
	return Math.floor((statValue - 10) / 2);
}

/**
 * Apply race bonuses at read time. Never persisted.
 */
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
 * Class-based modifiers at read time. Primary stats of the class get +1.
 */
export function getClassStatModifiers(classType: CreatureClassType): Partial<CreatureStats> {
	const classInfo = classDefinitions[classType];
	const modifiers: Partial<CreatureStats> = {};

	if (classInfo?.primaryStats) {
		for (const stat of classInfo.primaryStats) {
			modifiers[stat] = 1;
		}
	}

	return modifiers;
}

/**
 * Effective stats with race, class, and equipment bonuses applied at read
 * time. Base stats are never written back; the effective value may exceed
 * STAT_MAX for display purposes because of a race or class bonus.
 */
export function getEffectiveStats(
	baseStats: CreatureStats,
	race: CreatureRaceType,
	classType: CreatureClassType,
	_level: number,
	equipment: Array<{ slot: string; bonuses?: Partial<CreatureStats> }> = []
): CreatureStats {
	// Start with base stats.
	const effectiveStats = { ...baseStats };

	// Apply racial bonuses.
	const withRace = applyRacialBonuses(effectiveStats, race);

	// Apply class modifiers.
	const classModifiers = getClassStatModifiers(classType);
	for (const [stat, modifier] of Object.entries(classModifiers)) {
		const statKey = stat as keyof CreatureStats;
		if (modifier) withRace[statKey] += modifier;
	}

	// Apply equipment bonuses.
	for (const item of equipment) {
		if (item.bonuses) {
			for (const [stat, bonus] of Object.entries(item.bonuses)) {
				const statKey = stat as keyof CreatureStats;
				if (bonus) withRace[statKey] += bonus;
			}
		}
	}

	return withRace;
}

/**
 * Health based on constitution, level, and class. Floored at 1.
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

	// First level gets max health.
	const firstLevelHealth = baseHealth + constitutionModifier;

	// Additional levels get an average roll plus the constitution modifier.
	const additionalLevels = level - 1;
	const levelUpHealth = additionalLevels * (baseHealth / 2 + 1 + constitutionModifier);

	return Math.max(1, Math.floor(firstLevelHealth + levelUpHealth));
}

/**
 * Total allocatable stat points earned from leveling: one point per five
 * levels. Level 1-4 gives 0, level 5-9 gives 1, and so on.
 */
export function getLevelStatPoints(level: number): number {
	return Math.floor(level / LEVEL_STAT_POINT_INTERVAL);
}

/**
 * Level points still available to spend, given how many have been spent.
 */
export function getAvailableLevelPoints(level: number, spent: number): number {
	return Math.max(0, getLevelStatPoints(level) - spent);
}

function clamp(value: number, min: number, max: number): number {
	return Math.min(max, Math.max(min, value));
}

/**
 * Probability that a stat check succeeds: `stat / (stat + threshold)`, clamped
 * to [0.1, 0.9]. A stat equal to the threshold gives 50 percent. The same
 * function is intended to drive boss battles later.
 */
export function calculateStatCheckChance(statValue: number, threshold: number): number {
	const denominator = statValue + threshold;
	if (denominator <= 0) {
		return 0.1;
	}
	return clamp(statValue / denominator, 0.1, 0.9);
}
