/**
 * Habit status utilities for determining if a habit is active on a given day
 * Handles frequency-based activation logic for daily, weekly, and custom habits
 */

import type { HabitFrequency } from '$lib/types';

export interface HabitStatusInfo {
  isActiveToday: boolean;
  completedToday: boolean;
  nextActiveDate: Date | null;
  daysUntilActive: number;
  availabilityMessage: string;
}

interface HabitData {
  frequency: HabitFrequency | null;
  customFrequency?: { days: number[] } | null;
  createdAt: string;
}

interface CompletionData {
  completedAt: string;
}

/**
 * Determines if a habit is active on the current day based on frequency
 * 
 * @param habit The habit with frequency info
 * @param lastCompletion The most recent completion (if any)
 * @param currentDate The date to check (defaults to today)
 * @returns Whether the habit is active today
 */
export function isHabitActiveToday(
  habit: HabitData,
  lastCompletion: CompletionData | null,
  currentDate: Date = new Date()
): boolean {
  const frequency = habit.frequency || 'daily';

  if (frequency === 'daily') {
    return true;
  }

  if (frequency === 'weekly') {
    if (!lastCompletion) {
      return true;
    }

    const lastCompletedDate = new Date(lastCompletion.completedAt);
    const daysSinceCompletion = Math.floor(
      (currentDate.getTime() - lastCompletedDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    return daysSinceCompletion >= 7;
  }

  if (frequency === 'custom' && habit.customFrequency?.days) {
    const currentDayOfWeek = currentDate.getDay();
    return habit.customFrequency.days.includes(currentDayOfWeek);
  }

  return true;
}

/**
 * Calculates the next date when a habit will be active
 * 
 * @param habit The habit with frequency info
 * @param lastCompletion The most recent completion (if any)
 * @param currentDate The date to check from (defaults to today)
 * @returns The next active date, or null if always active
 */
export function getNextActiveDate(
  habit: HabitData,
  lastCompletion: CompletionData | null,
  currentDate: Date = new Date()
): Date | null {
  const frequency = habit.frequency || 'daily';

  if (frequency === 'daily') {
    if (!lastCompletion) {
      return null;
    }
    
    const nextMidnight = new Date(currentDate);
    nextMidnight.setHours(24, 0, 0, 0);
    
    return nextMidnight;
  }

  if (frequency === 'weekly') {
    if (!lastCompletion) {
      return null;
    }

    const lastCompletedDate = new Date(lastCompletion.completedAt);
    const nextActiveDate = new Date(lastCompletedDate);
    nextActiveDate.setDate(nextActiveDate.getDate() + 7);

    if (nextActiveDate <= currentDate) {
      return null;
    }

    return nextActiveDate;
  }

  if (frequency === 'custom' && Array.isArray(habit.customFrequency?.days) && habit.customFrequency.days.length > 0) {
    const activeDays = [...habit.customFrequency.days].sort((a, b) => a - b);
    const currentDayOfWeek = currentDate.getDay();

    const nextDayThisWeek = activeDays.find((day) => day > currentDayOfWeek);
    if (nextDayThisWeek !== undefined) {
      const daysUntil = nextDayThisWeek - currentDayOfWeek;
      const nextDate = new Date(currentDate);
      nextDate.setDate(nextDate.getDate() + daysUntil);
      return nextDate;
    }

    const firstDayNextWeek = activeDays[0];
    const daysUntil = 7 - currentDayOfWeek + firstDayNextWeek;
    const nextDate = new Date(currentDate);
    nextDate.setDate(nextDate.getDate() + daysUntil);
    return nextDate;
  }

  return null;
}

/**
 * Calculates days until a habit becomes active
 * 
 * @param habit The habit with frequency info
 * @param lastCompletion The most recent completion (if any)
 * @param currentDate The date to check from (defaults to today)
 * @returns Number of days until active (0 if active now, -1 if always active)
 */
export function getDaysUntilActive(
  habit: HabitData,
  lastCompletion: CompletionData | null,
  currentDate: Date = new Date()
): number {
  const nextDate = getNextActiveDate(habit, lastCompletion, currentDate);

  if (nextDate === null) {
    return -1;
  }

  const daysUntil = Math.ceil(
    (nextDate.getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24)
  ) - 1;

  return Math.max(0, daysUntil);
}

/**
 * Formats a user-friendly message about when a habit is available
 * 
 * @param habit The habit with frequency info
 * @param lastCompletion The most recent completion (if any)
 * @param currentDate The date to check from (defaults to today)
 * @returns A formatted message string
 */
export function formatAvailabilityMessage(
  habit: HabitData,
  lastCompletion: CompletionData | null,
  currentDate: Date = new Date()
): string {
  const frequency = habit.frequency || 'daily';
  const isActive = isHabitActiveToday(habit, lastCompletion, currentDate);

  if (isActive) {
    return '';
  }

  if (frequency === 'weekly') {
    const daysUntil = getDaysUntilActive(habit, lastCompletion, currentDate);
    if (daysUntil === 1) {
      return 'Available in 1 day';
    }
    return `Available in ${daysUntil} days`;
  }

  if (frequency === 'custom' && Array.isArray(habit.customFrequency?.days) && habit.customFrequency.days.length > 0) {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const activeDayNames = [...habit.customFrequency.days]
      .sort((a, b) => a - b)
      .map((day) => dayNames[day]);
    return `Available on: ${activeDayNames.join(', ')}`;
  }

  return '';
}

/**
 * Gets complete status information for a habit
 * 
 * @param habit The habit with frequency info
 * @param lastCompletion The most recent completion (if any)
 * @param completedToday Whether the habit was completed today
 * @param currentDate The date to check from (defaults to today)
 * @returns Complete status information
 */
export function getHabitStatus(
  habit: HabitData,
  lastCompletion: CompletionData | null,
  completedToday: boolean,
  currentDate: Date = new Date()
): HabitStatusInfo {
  const isActive = isHabitActiveToday(habit, lastCompletion, currentDate) && !completedToday;
  
  return {
    isActiveToday: isActive,
    completedToday,
    nextActiveDate: getNextActiveDate(habit, lastCompletion, currentDate),
    daysUntilActive: getDaysUntilActive(habit, lastCompletion, currentDate),
    availabilityMessage: formatAvailabilityMessage(habit, lastCompletion, currentDate),
  };
}
