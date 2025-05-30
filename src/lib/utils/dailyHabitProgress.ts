/**
 * Utility functions for calculating daily habit progress statistics
 * 
 * Note: This is a client-side fallback for calculating progress.
 * The server uses the dailyHabitTracker table for more accurate tracking.
 */

type Habit = {
  id: string;
  completedToday: boolean;
  isArchived?: boolean;
};

type DailyProgressStats = {
  total: number;
  completed: number;
  percentage: number;
};

/**
 * Calculate daily habit completion statistics with robust type handling and edge cases
 * This is a client-side fallback that can be used for testing or when server data is unavailable
 * 
 * @param habits Array of habit objects
 * @returns Object containing total, completed, and percentage values
 */
export function calculateDailyProgress(habits: Habit[] | undefined): DailyProgressStats {
  // Handle null/undefined data
  if (!habits || !habits.length) {
    return { total: 0, completed: 0, percentage: 0 };
  }
  
  // Filter out archived habits unless they're completed today
  // This ensures we count all active habits plus any that were completed today
  const relevantHabits = habits.filter(habit => !habit.isArchived || habit.completedToday);
  
  const total = relevantHabits.length;
  
  const completed = relevantHabits.reduce((count: number, habit: Habit) => {
    // Convert completedToday to boolean to handle different data types
    return habit.completedToday ? count + 1 : count;
  }, 0);
  
  // Calculate percentage with bounds checking
  const percentage = total > 0 ? Math.min(100, Math.max(0, Math.round((completed / total) * 100))) : 0;
  
  return { total, completed, percentage };
}
