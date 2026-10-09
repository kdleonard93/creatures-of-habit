import { describe, it, expect } from 'vitest';
import {
	getWeekday,
	getAssignedWeekday,
	isScheduledOn,
	getPreviousScheduledDate,
	getNextScheduledDate,
	computeStreakUpdate,
	type HabitSchedule
} from '$lib/shared/streaks/schedule';

// 2026-01-05 is a Monday, 2026-01-09 a Friday, 2026-01-12 the next Monday.
const MONDAY = '2026-01-05';
const FRIDAY = '2026-01-09';

describe('habit schedule', () => {
	it('computes weekdays from a date string (0 = Sunday)', () => {
		expect(getWeekday(MONDAY)).toBe(1);
		expect(getWeekday(FRIDAY)).toBe(5);
	});

	it('treats daily habits as scheduled every day', () => {
		const schedule: HabitSchedule = { frequency: 'daily', startDate: MONDAY };
		expect(isScheduledOn(MONDAY, schedule)).toBe(true);
		expect(isScheduledOn(FRIDAY, schedule)).toBe(true);
		expect(getPreviousScheduledDate(MONDAY, schedule)).toBe('2026-01-04');
		expect(getNextScheduledDate(MONDAY, schedule)).toBe('2026-01-06');
	});

	it('derives the weekly weekday from the start date and schedules only that day', () => {
		const schedule: HabitSchedule = { frequency: 'weekly', startDate: MONDAY };
		expect(getAssignedWeekday(schedule)).toBe(1);
		expect(isScheduledOn(MONDAY, schedule)).toBe(true);
		expect(isScheduledOn(FRIDAY, schedule)).toBe(false);
		expect(getPreviousScheduledDate(MONDAY, schedule)).toBe('2025-12-29');
		expect(getNextScheduledDate(MONDAY, schedule)).toBe('2026-01-12');
	});

	it('treats custom habits as scheduled only on the assigned weekdays', () => {
		const schedule: HabitSchedule = { frequency: 'custom', days: [1, 5], startDate: MONDAY };
		expect(isScheduledOn(MONDAY, schedule)).toBe(true);
		expect(isScheduledOn('2026-01-06', schedule)).toBe(false);
		expect(isScheduledOn(FRIDAY, schedule)).toBe(true);
		// Previous scheduled date before Saturday is Friday.
		expect(getPreviousScheduledDate('2026-01-10', schedule)).toBe(FRIDAY);
		// Previous scheduled date before the next Monday is also Friday.
		expect(getPreviousScheduledDate('2026-01-12', schedule)).toBe(FRIDAY);
		expect(getNextScheduledDate(MONDAY, schedule)).toBe(FRIDAY);
	});

	describe('computeStreakUpdate', () => {
		it('starts a streak at 1 for a first completion', () => {
			const schedule: HabitSchedule = { frequency: 'daily', startDate: MONDAY };
			expect(
				computeStreakUpdate({
					schedule,
					today: MONDAY,
					lastCompletedDate: null,
					state: { currentStreak: 0, longestStreak: 0 }
				})
			).toEqual({ currentStreak: 1, longestStreak: 1 });
		});

		it('increments a daily streak on a consecutive day', () => {
			const schedule: HabitSchedule = { frequency: 'daily', startDate: MONDAY };
			expect(
				computeStreakUpdate({
					schedule,
					today: '2026-01-06',
					lastCompletedDate: MONDAY,
					state: { currentStreak: 4, longestStreak: 6 }
				})
			).toEqual({ currentStreak: 5, longestStreak: 6 });
		});

		it('resets a daily streak when a day is missed', () => {
			const schedule: HabitSchedule = { frequency: 'daily', startDate: MONDAY };
			expect(
				computeStreakUpdate({
					schedule,
					today: '2026-01-08',
					lastCompletedDate: MONDAY,
					state: { currentStreak: 4, longestStreak: 6 }
				})
			).toEqual({ currentStreak: 1, longestStreak: 6 });
		});

		it('increments a weekly streak on consecutive assigned weeks and resets on a skipped week', () => {
			const schedule: HabitSchedule = { frequency: 'weekly', startDate: MONDAY };
			expect(
				computeStreakUpdate({
					schedule,
					today: '2026-01-12',
					lastCompletedDate: MONDAY,
					state: { currentStreak: 2, longestStreak: 2 }
				})
			).toEqual({ currentStreak: 3, longestStreak: 3 });

			// Skipped the previous Monday (2025-12-29).
			expect(
				computeStreakUpdate({
					schedule,
					today: '2026-01-12',
					lastCompletedDate: '2025-12-22',
					state: { currentStreak: 2, longestStreak: 2 }
				})
			).toEqual({ currentStreak: 1, longestStreak: 2 });
		});

		it('increments a custom streak only across consecutive assigned days', () => {
			const schedule: HabitSchedule = { frequency: 'custom', days: [1, 5], startDate: MONDAY };
			// Monday then Friday is consecutive on the schedule.
			expect(
				computeStreakUpdate({
					schedule,
					today: FRIDAY,
					lastCompletedDate: MONDAY,
					state: { currentStreak: 1, longestStreak: 1 }
				})
			).toEqual({ currentStreak: 2, longestStreak: 2 });

			// Friday then Monday is consecutive too.
			expect(
				computeStreakUpdate({
					schedule,
					today: '2026-01-12',
					lastCompletedDate: FRIDAY,
					state: { currentStreak: 2, longestStreak: 2 }
				})
			).toEqual({ currentStreak: 3, longestStreak: 3 });

			// Missed the Friday before Monday resets the streak.
			expect(
				computeStreakUpdate({
					schedule,
					today: '2026-01-12',
					lastCompletedDate: MONDAY,
					state: { currentStreak: 2, longestStreak: 2 }
				})
			).toEqual({ currentStreak: 1, longestStreak: 2 });
		});
	});
});
