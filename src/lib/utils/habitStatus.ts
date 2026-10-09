/**
 * Habit status utilities for determining if a habit is active on a given day.
 *
 * Now backed by the shared schedule engine so the UI matches the completion
 * endpoint: daily habits are due every day, weekly habits are due on the
 * weekday they started, and custom habits are due on their assigned weekdays.
 * A missed scheduled day does not make a habit "active" later; the streak
 * reset is handled on completion. See docs/audit-backlog.md C-8.
 */

import type { HabitFrequency } from '$lib/types';
import {
	isScheduledOn,
	getNextScheduledDate,
	getDateOnlyInTimeZone,
	type HabitSchedule,
	type HabitFrequencyName
} from '$lib/shared/streaks/schedule';

export interface HabitStatusInfo {
	isActiveToday: boolean;
	completedToday: boolean;
	nextActiveDate: string | null;
	daysUntilActive: number;
	availabilityMessage: string;
}

interface HabitData {
	frequency: HabitFrequency | null;
	customFrequency?: { days: number[] } | null;
	createdAt?: string;
	startDate?: string;
}

interface CompletionData {
	completedAt: string;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function toSchedule(habit: HabitData): HabitSchedule {
	const frequency = (habit.frequency ?? 'daily') as HabitFrequencyName;
	const days = Array.isArray(habit.customFrequency?.days) ? habit.customFrequency?.days ?? null : null;
	const startDate = (habit.startDate ?? habit.createdAt ?? '1970-01-01').slice(0, 10);
	return { frequency, days, startDate };
}

function completedOn(lastCompletion: CompletionData | null, dateStr: string): boolean {
	return Boolean(lastCompletion && lastCompletion.completedAt.slice(0, 10) === dateStr);
}

/** Whether the habit is scheduled (due) on the given day. */
export function isHabitActiveToday(
	habit: HabitData,
	_lastCompletion: CompletionData | null,
	currentDate: Date = new Date(),
	timeZone = 'UTC'
): boolean {
	return isScheduledOn(getDateOnlyInTimeZone(currentDate, timeZone), toSchedule(habit));
}

/**
 * The next date the habit is due, or null when it is due now (scheduled today
 * and not yet completed).
 */
export function getNextActiveDate(
	habit: HabitData,
	lastCompletion: CompletionData | null,
	currentDate: Date = new Date(),
	timeZone = 'UTC'
): string | null {
	const schedule = toSchedule(habit);
	const today = getDateOnlyInTimeZone(currentDate, timeZone);

	if (!isScheduledOn(today, schedule)) {
		return getNextScheduledDate(today, schedule);
	}

	if (completedOn(lastCompletion, today)) {
		return getNextScheduledDate(today, schedule);
	}

	return null;
}

export function getDaysUntilActive(
	habit: HabitData,
	lastCompletion: CompletionData | null,
	currentDate: Date = new Date(),
	timeZone = 'UTC'
): number {
	const nextDateString = getNextActiveDate(habit, lastCompletion, currentDate, timeZone);
	if (nextDateString === null) {
		return -1;
	}

	const nextDate = new Date(`${nextDateString}T00:00:00Z`).getTime();
	const today = new Date(`${getDateOnlyInTimeZone(currentDate, timeZone)}T00:00:00Z`).getTime();
	const daysUntil = Math.round((nextDate - today) / (1000 * 60 * 60 * 24));
	return Math.max(0, daysUntil);
}

export function formatAvailabilityMessage(
	habit: HabitData,
	lastCompletion: CompletionData | null,
	currentDate: Date = new Date(),
	timeZone = 'UTC'
): string {
	const isActive = isHabitActiveToday(habit, lastCompletion, currentDate, timeZone);
	if (isActive && !completedOn(lastCompletion, getDateOnlyInTimeZone(currentDate, timeZone))) {
		return '';
	}

	const schedule = toSchedule(habit);
	if (schedule.frequency === 'custom' && schedule.days && schedule.days.length > 0) {
		const names = [...schedule.days].sort((a, b) => a - b).map((day) => DAY_NAMES[day]);
		return `Available on: ${names.join(', ')}`;
	}

	const daysUntil = getDaysUntilActive(habit, lastCompletion, currentDate, timeZone);
	if (daysUntil === -1) {
		return '';
	}
	if (daysUntil <= 1) {
		return 'Available in 1 day';
	}
	return `Available in ${daysUntil} days`;
}

export function getHabitStatus(
	habit: HabitData,
	lastCompletion: CompletionData | null,
	completedToday: boolean,
	currentDate: Date = new Date(),
	timeZone = 'UTC'
): HabitStatusInfo {
	const isActive = isHabitActiveToday(habit, lastCompletion, currentDate, timeZone) && !completedToday;

	// Treat a completed-today habit as if it had a completion dated today, so
	// the next active date and the countdown are computed consistently even
	// when the caller does not pass the completion record.
	const today = getDateOnlyInTimeZone(currentDate, timeZone);
	const effectiveCompletion =
		completedToday && !completedOn(lastCompletion, today)
			? { completedAt: today }
			: lastCompletion;

	return {
		isActiveToday: isActive,
		completedToday,
		nextActiveDate: getNextActiveDate(habit, effectiveCompletion, currentDate, timeZone),
		daysUntilActive: getDaysUntilActive(habit, effectiveCompletion, currentDate, timeZone),
		availabilityMessage: formatAvailabilityMessage(habit, effectiveCompletion, currentDate, timeZone)
	};
}
