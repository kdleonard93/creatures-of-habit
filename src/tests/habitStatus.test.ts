import { describe, it, expect } from 'vitest';
import {
	isHabitActiveToday,
	getNextActiveDate,
	getDaysUntilActive,
	formatAvailabilityMessage,
	getHabitStatus
} from '$lib/utils/habitStatus';

describe('Habit Status Logic', () => {
	describe('Daily Habits', () => {
		const dailyHabit = {
			frequency: 'daily' as const,
			customFrequency: null,
			createdAt: '2024-11-01'
		};

		it('should always be active regardless of last completion', () => {
			const today = new Date('2024-11-28T10:00:00Z');
			const lastCompletion = { completedAt: '2024-11-28' };

			expect(isHabitActiveToday(dailyHabit, lastCompletion, today)).toBe(true);
			expect(isHabitActiveToday(dailyHabit, null, today)).toBe(true);
		});

		it('should be inactive when completed today (via getHabitStatus)', () => {
			const today = new Date('2024-11-28T10:00:00Z');
			const lastCompletion = { completedAt: '2024-11-28' };

			const status = getHabitStatus(dailyHabit, lastCompletion, true, today);
			expect(status.isActiveToday).toBe(false);
			expect(status.completedToday).toBe(true);
		});

		it('should be active again the next day', () => {
			const today = new Date('2024-11-28T10:00:00Z');
			const tomorrow = new Date('2024-11-29T10:00:00Z');
			const lastCompletion = { completedAt: '2024-11-28' };

			// Completed today
			const statusToday = getHabitStatus(dailyHabit, lastCompletion, true, today);
			expect(statusToday.isActiveToday).toBe(false);

			// Active tomorrow (completedToday = false because it's a new day)
			const statusTomorrow = getHabitStatus(dailyHabit, lastCompletion, false, tomorrow);
			expect(statusTomorrow.isActiveToday).toBe(true);
		});

		it('should not show availability message', () => {
			const today = new Date('2024-11-28T10:00:00Z');
			const message = formatAvailabilityMessage(dailyHabit, null, today);
			expect(message).toBe('');
		});
	});

	describe('Weekly Habits', () => {
		const weeklyHabit = {
			frequency: 'weekly' as const,
			customFrequency: null,
			createdAt: '2024-11-01'
		};

		it('should be active if never completed', () => {
			const today = new Date('2024-11-28T10:00:00Z');
			expect(isHabitActiveToday(weeklyHabit, null, today)).toBe(true);
		});

		it('should be inactive for 6 days after completion', () => {
			const completionDate = new Date('2024-11-21T10:00:00Z'); // Nov 21
			const lastCompletion = { completedAt: '2024-11-21' };

			// Day 0 (completion day) - should be inactive via completedToday
			const day0 = new Date('2024-11-21T10:00:00Z');
			expect(isHabitActiveToday(weeklyHabit, lastCompletion, day0)).toBe(false);

			// Days 1-6 after completion
			for (let i = 1; i <= 6; i++) {
				const testDate = new Date('2024-11-21T10:00:00Z');
				testDate.setDate(testDate.getDate() + i);
				expect(isHabitActiveToday(weeklyHabit, lastCompletion, testDate)).toBe(false);
			}
		});

		it('should be active exactly 7 days after completion', () => {
			const lastCompletion = { completedAt: '2024-11-21' };
			const day7 = new Date('2024-11-28T10:00:00Z'); // Exactly 7 days later

			expect(isHabitActiveToday(weeklyHabit, lastCompletion, day7)).toBe(true);
		});

		it('should be active 8+ days after completion', () => {
			const lastCompletion = { completedAt: '2024-11-21' };
			const day8 = new Date('2024-11-29T10:00:00Z');
			const day30 = new Date('2024-12-21T10:00:00Z');

			expect(isHabitActiveToday(weeklyHabit, lastCompletion, day8)).toBe(true);
			expect(isHabitActiveToday(weeklyHabit, lastCompletion, day30)).toBe(true);
		});

		it('should show correct countdown days', () => {
			const lastCompletion = { completedAt: '2024-11-21' };

			// Day 1 after completion (6 days until midnight of day 7 in local timezone)
			const day1 = new Date('2024-11-22T10:00:00Z');
			expect(getDaysUntilActive(weeklyHabit, lastCompletion, day1)).toBe(6);

			// Day 3 after completion (4 days until midnight of day 7)
			const day3 = new Date('2024-11-24T10:00:00Z');
			expect(getDaysUntilActive(weeklyHabit, lastCompletion, day3)).toBe(4);

			// Day 6 after completion (1 day until midnight of day 7)
			const day6 = new Date('2024-11-27T10:00:00Z');
			expect(getDaysUntilActive(weeklyHabit, lastCompletion, day6)).toBe(1);

			// Day 7 (active again)
			const day7 = new Date('2024-11-28T10:00:00Z');
			expect(getDaysUntilActive(weeklyHabit, lastCompletion, day7)).toBe(-1);
		});

		it('should show correct availability messages', () => {
			const lastCompletion = { completedAt: '2024-11-21' };

			const day1 = new Date('2024-11-22T10:00:00Z');
			expect(formatAvailabilityMessage(weeklyHabit, lastCompletion, day1)).toBe(
				'Available in 6 days'
			);

			const day6 = new Date('2024-11-27T10:00:00Z');
			expect(formatAvailabilityMessage(weeklyHabit, lastCompletion, day6)).toBe('Available in 1 day');

			const day7 = new Date('2024-11-28T10:00:00Z');
			expect(formatAvailabilityMessage(weeklyHabit, lastCompletion, day7)).toBe('');
		});
	});

	describe('Custom Habits', () => {
		// Monday = 1, Friday = 5, Saturday = 6
		const customHabit = {
			frequency: 'custom' as const,
			customFrequency: { days: [1, 5, 6] },
			createdAt: '2024-11-01'
		};

		it('should be active on selected days (Mon, Fri, Sat)', () => {
			// Monday, Nov 25, 2024
			const monday = new Date('2024-11-25T10:00:00Z');
			expect(isHabitActiveToday(customHabit, null, monday)).toBe(true);

			// Friday, Nov 29, 2024
			const friday = new Date('2024-11-29T10:00:00Z');
			expect(isHabitActiveToday(customHabit, null, friday)).toBe(true);

			// Saturday, Nov 30, 2024
			const saturday = new Date('2024-11-30T10:00:00Z');
			expect(isHabitActiveToday(customHabit, null, saturday)).toBe(true);
		});

		it('should be inactive on non-selected days', () => {
			// Sunday, Nov 24, 2024
			const sunday = new Date('2024-11-24T10:00:00Z');
			expect(isHabitActiveToday(customHabit, null, sunday)).toBe(false);

			// Tuesday, Nov 26, 2024
			const tuesday = new Date('2024-11-26T10:00:00Z');
			expect(isHabitActiveToday(customHabit, null, tuesday)).toBe(false);

			// Wednesday, Nov 27, 2024
			const wednesday = new Date('2024-11-27T10:00:00Z');
			expect(isHabitActiveToday(customHabit, null, wednesday)).toBe(false);

			// Thursday, Nov 28, 2024
			const thursday = new Date('2024-11-28T10:00:00Z');
			expect(isHabitActiveToday(customHabit, null, thursday)).toBe(false);
		});

		it('should be inactive when completed on active day', () => {
			const monday = new Date('2024-11-25T10:00:00Z');
			const lastCompletion = { completedAt: '2024-11-25' };

			const status = getHabitStatus(customHabit, lastCompletion, true, monday);
			expect(status.isActiveToday).toBe(false);
			expect(status.completedToday).toBe(true);
		});

		it('should be active again on next selected day', () => {
			const monday = new Date('2024-11-25T10:00:00Z');
			const lastCompletion = { completedAt: '2024-11-25' };

			// Completed on Monday
			const statusMonday = getHabitStatus(customHabit, lastCompletion, true, monday);
			expect(statusMonday.isActiveToday).toBe(false);

			// Active again on Friday (completedToday = false)
			const friday = new Date('2024-11-29T10:00:00Z');
			const statusFriday = getHabitStatus(customHabit, lastCompletion, false, friday);
			expect(statusFriday.isActiveToday).toBe(true);
		});

		it('should show correct availability message', () => {
			const tuesday = new Date('2024-11-26T10:00:00Z');
			const message = formatAvailabilityMessage(customHabit, null, tuesday);
			expect(message).toBe('Available on: Mon, Fri, Sat');
		});

		it('should calculate next active date correctly', () => {
			// Tuesday (next active is Friday)
			const tuesday = new Date('2024-11-26T10:00:00Z');
			const nextFromTuesday = getNextActiveDate(customHabit, null, tuesday);
			expect(nextFromTuesday).toBe('2024-11-29'); // Friday

			// Saturday (active today and not completed, returns null)
			const saturday = new Date('2024-11-30T10:00:00Z');
			const nextFromSaturday = getNextActiveDate(customHabit, null, saturday);
			expect(nextFromSaturday).toBeNull(); // Saturday is an active day

			// Monday (active today and not completed, returns null - habit is active now)
			const monday = new Date('2024-11-25T10:00:00Z');
			const nextFromMonday = getNextActiveDate(customHabit, null, monday);
			// Returns null since Monday is active today and habit not completed
			expect(nextFromMonday).toBeNull();
		});
	});

	describe('Edge Cases', () => {
		it('should handle habits with no frequency (defaults to daily)', () => {
			const noFrequencyHabit = {
				frequency: null,
				customFrequency: null,
				createdAt: '2024-11-01'
			};

			const today = new Date('2024-11-28T10:00:00Z');
			expect(isHabitActiveToday(noFrequencyHabit, null, today)).toBe(true);
		});

		it('should handle custom habits with empty days array', () => {
			const emptyCustomHabit = {
				frequency: 'custom' as const,
				customFrequency: { days: [] },
				createdAt: '2024-11-01'
			};

			const today = new Date('2024-11-28T10:00:00Z');
			// Empty days array means never active
			expect(isHabitActiveToday(emptyCustomHabit, null, today)).toBe(false);
		});

		it('should handle timezone differences correctly', () => {
			const weeklyHabit = {
				frequency: 'weekly' as const,
				customFrequency: null,
				createdAt: '2024-11-01'
			};

			const lastCompletion = { completedAt: '2024-11-21' };

			// Same day, different times
			const morning = new Date('2024-11-28T08:00:00Z');
			const evening = new Date('2024-11-28T20:00:00Z');

			expect(isHabitActiveToday(weeklyHabit, lastCompletion, morning)).toBe(true);
			expect(isHabitActiveToday(weeklyHabit, lastCompletion, evening)).toBe(true);
		});
	});
});
