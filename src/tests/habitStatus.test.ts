import { describe, it, expect } from 'vitest';
import {
	isHabitActiveToday,
	getNextActiveDate,
	getDaysUntilActive,
	formatAvailabilityMessage,
	getHabitStatus
} from '$lib/utils/habitStatus';

// 2026-01-05 is a Monday, 2026-01-06 a Tuesday, 2026-01-09 a Friday.
const MONDAY = new Date('2026-01-05T12:00:00Z');
const TUESDAY = new Date('2026-01-06T12:00:00Z');
const FRIDAY = new Date('2026-01-09T12:00:00Z');
const SATURDAY = new Date('2026-01-10T12:00:00Z');

const dailyHabit = { frequency: 'daily' as const, startDate: '2026-01-01' };
const weeklyHabit = { frequency: 'weekly' as const, startDate: '2026-01-05' };
const customHabit = {
	frequency: 'custom' as const,
	customFrequency: { days: [1, 5] },
	startDate: '2026-01-01'
};

describe('habit status (schedule based)', () => {
	describe('daily', () => {
		it('is active every day when not completed', () => {
			expect(isHabitActiveToday(dailyHabit, null, MONDAY)).toBe(true);
			expect(isHabitActiveToday(dailyHabit, null, TUESDAY)).toBe(true);
			expect(getHabitStatus(dailyHabit, null, false, MONDAY).isActiveToday).toBe(true);
		});

		it('is not active once completed today, and the next date is tomorrow', () => {
			const status = getHabitStatus(dailyHabit, null, true, MONDAY);
			expect(status.isActiveToday).toBe(false);
			expect(status.nextActiveDate).toBe('2026-01-06');
			expect(status.daysUntilActive).toBe(1);
		});
	});

	describe('missing frequency defaults to daily', () => {
		it('is active every day', () => {
			expect(isHabitActiveToday({ frequency: null }, null, TUESDAY)).toBe(true);
		});
	});

	describe('weekly', () => {
		it('is active only on the weekday derived from the start date', () => {
			expect(isHabitActiveToday(weeklyHabit, null, MONDAY)).toBe(true);
			expect(isHabitActiveToday(weeklyHabit, null, TUESDAY)).toBe(false);
		});

		it('points to the next assigned weekday when completed', () => {
			const status = getHabitStatus(weeklyHabit, null, true, MONDAY);
			expect(status.isActiveToday).toBe(false);
			expect(status.nextActiveDate).toBe('2026-01-12');
			expect(status.daysUntilActive).toBe(7);
		});

		it('points to the next assigned weekday when viewed off-schedule', () => {
			const status = getHabitStatus(weeklyHabit, null, false, TUESDAY);
			expect(status.isActiveToday).toBe(false);
			expect(status.nextActiveDate).toBe('2026-01-12');
		});
	});

	describe('custom', () => {
		it('is active only on the assigned weekdays', () => {
			expect(isHabitActiveToday(customHabit, null, MONDAY)).toBe(true);
			expect(isHabitActiveToday(customHabit, null, FRIDAY)).toBe(true);
			expect(isHabitActiveToday(customHabit, null, TUESDAY)).toBe(false);
			expect(isHabitActiveToday(customHabit, null, SATURDAY)).toBe(false);
		});

		it('points to the next assigned weekday', () => {
			expect(getNextActiveDate(customHabit, null, TUESDAY)).toBe('2026-01-09');
			expect(getDaysUntilActive(customHabit, null, TUESDAY)).toBe(3);
			expect(formatAvailabilityMessage(customHabit, null, TUESDAY)).toBe('Available on: Mon, Fri');
		});

		it('points to the next assigned weekday after completing on an assigned day', () => {
			const status = getHabitStatus(customHabit, null, true, MONDAY);
			expect(status.isActiveToday).toBe(false);
			expect(status.nextActiveDate).toBe('2026-01-09');
		});
	});

	describe('edge cases', () => {
		it('a custom habit with no days is never active', () => {
			const empty = { frequency: 'custom' as const, customFrequency: { days: [] }, startDate: '2026-01-01' };
			expect(isHabitActiveToday(empty, null, MONDAY)).toBe(false);
			expect(getNextActiveDate(empty, null, MONDAY)).toBeNull();
		});

		it('reports an availability message of one day for a future weekday', () => {
			const tuesday = { frequency: 'weekly' as const, startDate: '2026-01-06' };
			const message = formatAvailabilityMessage(tuesday, null, MONDAY);
			expect(message).toBe('Available in 1 day');
		});
	});
});
