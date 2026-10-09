/**
 * Habit scheduling and streak logic.
 *
 * Confirmed rules (see docs/domain-rules.md):
 * - A streak is per habit and resets to 0 when a scheduled occurrence is missed.
 * - daily: every day. weekly: the same weekday each week (derived from the
 *   habit start date). custom: every assigned weekday.
 * - Completing a habit on a non-scheduled day does not advance the streak and
 *   is rejected by the completion endpoint.
 *
 * Dates are UTC calendar dates in `YYYY-MM-DD` form, matching storage. Weekday
 * numbers use JavaScript convention (0 = Sunday).
 */

export type HabitFrequencyName = 'daily' | 'weekly' | 'custom';

export interface HabitSchedule {
	frequency: HabitFrequencyName;
	/** Custom weekdays (0 = Sunday). Ignored for daily and weekly. */
	days?: number[] | null;
	/** The habit start date, used to derive the weekly assigned weekday. */
	startDate: string;
}

export interface StreakState {
	currentStreak: number;
	longestStreak: number;
}

export function toUtcDate(dateStr: string): Date {
	const [year, month, day] = dateStr.split('-').map(Number);
	return new Date(Date.UTC(year, month - 1, day));
}

export function toDateOnly(date: Date): string {
	return date.toISOString().slice(0, 10);
}

export function addDays(dateStr: string, days: number): string {
	const date = toUtcDate(dateStr);
	date.setUTCDate(date.getUTCDate() + days);
	return toDateOnly(date);
}

export function getWeekday(dateStr: string): number {
	return toUtcDate(dateStr).getUTCDay();
}

export function getAssignedWeekday(schedule: HabitSchedule): number {
	return getWeekday(schedule.startDate);
}

/** Whether the habit is scheduled (due) on the given date. */
export function isScheduledOn(dateStr: string, schedule: HabitSchedule): boolean {
	switch (schedule.frequency) {
		case 'daily':
			return true;
		case 'weekly':
			return getWeekday(dateStr) === getAssignedWeekday(schedule);
		case 'custom':
			return (schedule.days ?? []).includes(getWeekday(dateStr));
		default:
			return true;
	}
}

/** The most recent scheduled date strictly before `dateStr`, or null. */
export function getPreviousScheduledDate(
	dateStr: string,
	schedule: HabitSchedule
): string | null {
	switch (schedule.frequency) {
		case 'daily':
			return addDays(dateStr, -1);
		case 'weekly':
			return addDays(dateStr, -7);
		case 'custom': {
			const days = schedule.days ?? [];
			if (days.length === 0) return null;
			for (let i = 1; i <= 7; i++) {
				const candidate = addDays(dateStr, -i);
				if (days.includes(getWeekday(candidate))) return candidate;
			}
			return null;
		}
		default:
			return null;
	}
}

/** The next scheduled date strictly after `dateStr`, or null. */
export function getNextScheduledDate(dateStr: string, schedule: HabitSchedule): string | null {
	switch (schedule.frequency) {
		case 'daily':
			return addDays(dateStr, 1);
		case 'weekly': {
			const assigned = getAssignedWeekday(schedule);
			let delta = (assigned - getWeekday(dateStr) + 7) % 7;
			if (delta === 0) delta = 7;
			return addDays(dateStr, delta);
		}
		case 'custom': {
			const days = schedule.days ?? [];
			if (days.length === 0) return null;
			for (let i = 1; i <= 7; i++) {
				const candidate = addDays(dateStr, i);
				if (days.includes(getWeekday(candidate))) return candidate;
			}
			return null;
		}
		default:
			return null;
	}
}

/**
 * Compute the streak after completing a habit today.
 *
 * The streak advances only when the previous completion landed on the previous
 * scheduled occurrence. Any gap (a missed scheduled day) resets it to 1.
 */
export function computeStreakUpdate(input: {
	schedule: HabitSchedule;
	today: string;
	lastCompletedDate: string | null;
	state: StreakState;
}): StreakState {
	const { schedule, today, lastCompletedDate, state } = input;

	let currentStreak: number;
	if (!lastCompletedDate) {
		currentStreak = 1;
	} else {
		const previous = getPreviousScheduledDate(today, schedule);
		currentStreak = previous && lastCompletedDate === previous ? state.currentStreak + 1 : 1;
	}

	return {
		currentStreak,
		longestStreak: Math.max(state.longestStreak, currentStreak)
	};
}
