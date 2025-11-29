/**
 * Habit status utilities for determining if a habit is active on a given day
 * Handles frequency-based activation logic for daily, weekly, and custom habits
 */

import type { HabitFrequency } from '$lib/types';

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
): string | null {
  const frequency = habit.frequency || 'daily';

  if (frequency === 'daily') {
    if (!lastCompletion) {
      return null;
    }
    
    // Return tomorrow's date as YYYY-MM-DD
    const tomorrow = new Date(currentDate);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }

  if (frequency === 'weekly') {
    if (!lastCompletion) {
      return null;
    }

    const lastCompletedDate = new Date(lastCompletion.completedAt);
    const nextActiveDate = new Date(lastCompletedDate);
    nextActiveDate.setDate(nextActiveDate.getDate() + 7);

    // Check if already past (compare dates only)
    const nextDateStr = nextActiveDate.toISOString().split('T')[0];
    const todayStr = currentDate.toISOString().split('T')[0];
    if (nextDateStr <= todayStr) {
      return null;
    }

    return nextDateStr;
  }

  if (frequency === 'custom' && Array.isArray(habit.customFrequency?.days) && habit.customFrequency.days.length > 0) {
    const activeDays = [...habit.customFrequency.days].sort((a, b) => a - b);
    const currentDayOfWeek = currentDate.getDay();

    // If today is an active day and habit hasn't been completed, return null (active now)
    const isTodayActive = activeDays.includes(currentDayOfWeek);
    if (isTodayActive && !lastCompletion) {
      return null;
    }

    // If today is an active day and was completed today, find next occurrence
    if (isTodayActive && lastCompletion) {
      const lastCompletedDate = new Date(lastCompletion.completedAt);
      const today = new Date(currentDate);
      today.setHours(0, 0, 0, 0);
      lastCompletedDate.setHours(0, 0, 0, 0);
      
      // If completed today, skip to next active day
      if (lastCompletedDate.getTime() === today.getTime()) {
        // Find next occurrence (skip today)
        const nextDayThisWeek = activeDays.find((day) => day > currentDayOfWeek);
        if (nextDayThisWeek !== undefined) {
          const daysUntil = nextDayThisWeek - currentDayOfWeek;
          const nextDate = new Date(currentDate);
          nextDate.setDate(nextDate.getDate() + daysUntil);
          return nextDate.toISOString().split('T')[0];
        }

        const firstDayNextWeek = activeDays[0];
        const daysUntil = 7 - currentDayOfWeek + firstDayNextWeek;
        const nextDate = new Date(currentDate);
        nextDate.setDate(nextDate.getDate() + daysUntil);
        return nextDate.toISOString().split('T')[0];
      }
    }

    // Find next active day
    const nextDayThisWeek = activeDays.find((day) => day > currentDayOfWeek);
    if (nextDayThisWeek !== undefined) {
      const daysUntil = nextDayThisWeek - currentDayOfWeek;
      const nextDate = new Date(currentDate);
      nextDate.setDate(nextDate.getDate() + daysUntil);
      return nextDate.toISOString().split('T')[0];
    }

    const firstDayNextWeek = activeDays[0];
    const daysUntil = 7 - currentDayOfWeek + firstDayNextWeek;
    const nextDate = new Date(currentDate);
    nextDate.setDate(nextDate.getDate() + daysUntil);
    return nextDate.toISOString().split('T')[0];
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
  const nextDateString = getNextActiveDate(habit, lastCompletion, currentDate);

  if (nextDateString === null) {
    return -1;
  }

  // Parse date string (YYYY-MM-DD) to midnight in local timezone
  const [year, month, day] = nextDateString.split('-').map(Number);
  const nextDate = new Date(year, month - 1, day, 0, 0, 0, 0);
  const today = new Date(currentDate);
  today.setHours(0, 0, 0, 0);
  
  const daysUntil = Math.floor(
    (nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );

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
    if (daysUntil === -1) {
      return '';
    }
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
