import { describe, it, expect } from 'vitest';
import {
	STAT_MIN,
	STAT_MAX,
	INITIAL_STAT_POINTS,
	STAT_BOOST_POINT_CAP,
	LEVEL_STAT_POINT_INTERVAL,
	createInitialStats,
	allocateStatPoints,
	calculateStatCost,
	getTotalStatPoints,
	calculateStatModifier,
	applyRacialBonuses,
	getClassStatModifiers,
	getEffectiveStats,
	calculateHealth,
	getLevelStatPoints,
	getAvailableLevelPoints,
	calculateStatCheckChance
} from '$lib/shared/stats';
import type { CreatureStats } from '$lib/types';

const ALL_TEN: CreatureStats = {
	strength: 10,
	dexterity: 10,
	constitution: 10,
	intelligence: 10,
	wisdom: 10,
	charisma: 10
};

describe('shared stats constants', () => {
	it('exposes the approved model constants', () => {
		expect(STAT_MIN).toBe(8);
		expect(STAT_MAX).toBe(15);
		expect(INITIAL_STAT_POINTS).toBe(27);
		expect(STAT_BOOST_POINT_CAP).toBe(20);
		expect(LEVEL_STAT_POINT_INTERVAL).toBe(5);
	});

	it('creates initial stats at the floor with no points spent', () => {
		const stats = createInitialStats();
		expect(stats).toEqual({
			strength: 8,
			dexterity: 8,
			constitution: 8,
			intelligence: 8,
			wisdom: 8,
			charisma: 8
		});
		expect(getTotalStatPoints(stats)).toBe(0);
	});

	it('always charges one point per stat step', () => {
		expect(calculateStatCost(8)).toBe(1);
		expect(calculateStatCost(15)).toBe(1);
	});
});

describe('allocateStatPoints', () => {
	it('spends and refunds one point per step', () => {
		let result = allocateStatPoints(createInitialStats(), 'strength', true);
		expect(result.stats.strength).toBe(9);
		expect(result.remainingPoints).toBe(INITIAL_STAT_POINTS - 1);

		result = allocateStatPoints(result.stats, 'strength', true);
		expect(result.stats.strength).toBe(10);
		expect(result.remainingPoints).toBe(INITIAL_STAT_POINTS - 2);

		result = allocateStatPoints(result.stats, 'strength', false);
		expect(result.stats.strength).toBe(9);
		expect(result.remainingPoints).toBe(INITIAL_STAT_POINTS - 1);
	});

	it('refuses to increment past the cap', () => {
		const maxed: CreatureStats = { ...createInitialStats(), strength: STAT_MAX };
		const result = allocateStatPoints(maxed, 'strength', true);
		expect(result.stats.strength).toBe(STAT_MAX);
		expect(result.remainingPoints).toBe(INITIAL_STAT_POINTS - (STAT_MAX - STAT_MIN));
	});

	it('refuses to decrement below the floor', () => {
		const result = allocateStatPoints(createInitialStats(), 'strength', false);
		expect(result.stats.strength).toBe(STAT_MIN);
		expect(result.remainingPoints).toBe(INITIAL_STAT_POINTS);
	});

	it('refuses to spend the budget into negative remaining points', () => {
		// Spend the whole 27 point budget on two stats (15 and 15 is 14 points,
		// so spread the rest).
		let stats: CreatureStats = { ...createInitialStats() };
		let remaining = INITIAL_STAT_POINTS;
		const keys = Object.keys(stats) as (keyof CreatureStats)[];
		for (const key of keys) {
			while (stats[key] < STAT_MAX && remaining > 0) {
				const result = allocateStatPoints(stats, key, true);
				stats = result.stats;
				remaining = result.remainingPoints;
			}
		}
		expect(remaining).toBe(0);
		expect(getTotalStatPoints(stats)).toBe(INITIAL_STAT_POINTS);

		// A further increment must be refused and leave remaining at 0.
		const refused = allocateStatPoints(stats, 'strength', true);
		expect(refused.remainingPoints).toBe(0);
		expect(getTotalStatPoints(refused.stats)).toBe(INITIAL_STAT_POINTS);
	});
});

describe('getLevelStatPoints and getAvailableLevelPoints', () => {
	it('grants one point per five levels', () => {
		expect(getLevelStatPoints(1)).toBe(0);
		expect(getLevelStatPoints(4)).toBe(0);
		expect(getLevelStatPoints(5)).toBe(1);
		expect(getLevelStatPoints(9)).toBe(1);
		expect(getLevelStatPoints(10)).toBe(2);
		expect(getLevelStatPoints(0)).toBe(0);
	});

	it('subtracts points already spent and never goes negative', () => {
		expect(getAvailableLevelPoints(5, 0)).toBe(1);
		expect(getAvailableLevelPoints(5, 1)).toBe(0);
		expect(getAvailableLevelPoints(10, 1)).toBe(1);
		expect(getAvailableLevelPoints(30, 6)).toBe(0);
		expect(getAvailableLevelPoints(10, 99)).toBe(0);
	});
});

describe('calculateStatCheckChance', () => {
	it('gives 50 percent when the stat equals the threshold', () => {
		expect(calculateStatCheckChance(10, 10)).toBeCloseTo(0.5, 10);
		expect(calculateStatCheckChance(8, 8)).toBeCloseTo(0.5, 10);
	});

	it('uses stat / (stat + threshold)', () => {
		expect(calculateStatCheckChance(12, 10)).toBeCloseTo(12 / 22, 10);
		expect(calculateStatCheckChance(15, 8)).toBeCloseTo(15 / 23, 10);
	});

	it('clamps to the [0.1, 0.9] range', () => {
		expect(calculateStatCheckChance(1000, 1)).toBe(0.9);
		expect(calculateStatCheckChance(1, 1000)).toBe(0.1);
	});

	it('is monotonic in the stat value', () => {
		const low = calculateStatCheckChance(10, 12);
		const high = calculateStatCheckChance(12, 12);
		expect(high).toBeGreaterThan(low);
	});
});

describe('modifiers, racial bonuses, and effective stats', () => {
	it('derives the classic ability modifier', () => {
		expect(calculateStatModifier(8)).toBe(-1);
		expect(calculateStatModifier(10)).toBe(0);
		expect(calculateStatModifier(11)).toBe(0);
		expect(calculateStatModifier(15)).toBe(2);
	});

	it('applies racial bonuses', () => {
		const withRace = applyRacialBonuses(ALL_TEN, 'orc');
		expect(withRace.strength).toBe(12);
		expect(withRace.constitution).toBe(11);
		expect(withRace.dexterity).toBe(10);
	});

	it('gives the class primary stats a +1 modifier', () => {
		const modifiers = getClassStatModifiers('warrior');
		expect(modifiers.strength).toBe(1);
		expect(modifiers.constitution).toBe(1);
		expect(modifiers.dexterity).toBeUndefined();
	});

	it('combines race and class bonuses at read time', () => {
		const effective = getEffectiveStats(ALL_TEN, 'human', 'warrior', 1);
		expect(effective).toEqual({
			strength: 12, // 10 + human +1 + warrior +1
			dexterity: 10,
			constitution: 12, // 10 + human +1 + warrior +1
			intelligence: 10,
			wisdom: 10,
			charisma: 11 // 10 + human +1
		});
	});

	it('does not change effective stats with level (dead level logic removed)', () => {
		const atLevel1 = getEffectiveStats(ALL_TEN, 'human', 'warrior', 1);
		const atLevel40 = getEffectiveStats(ALL_TEN, 'human', 'warrior', 40);
		expect(atLevel40).toEqual(atLevel1);
	});

	it('applies equipment bonuses', () => {
		const effective = getEffectiveStats(ALL_TEN, 'human', 'warrior', 1, [
			{ slot: 'weapon', bonuses: { strength: 2 } }
		]);
		expect(effective.strength).toBe(14);
	});
});

describe('calculateHealth', () => {
	it('uses the class base health plus the constitution modifier', () => {
		expect(calculateHealth(10, 1, 'warrior')).toBe(10);
		expect(calculateHealth(14, 1, 'wizard')).toBe(8); // 6 + 2
	});

	it('never drops below 1', () => {
		expect(calculateHealth(1, 1, 'wizard')).toBeGreaterThanOrEqual(1);
	});
});
