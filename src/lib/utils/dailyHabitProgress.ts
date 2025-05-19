/**
 * Utility functions for calculating daily habit progress statistics
 */

type Habit = {
  id: string;
  completedToday: boolean;
};

type DailyProgressStats = {
  total: number;
  completed: number;
  percentage: number;
};

/**
 * Calculate daily habit completion statistics with robust type handling and edge cases
 * @param habits Array of habit objects
 * @returns Object containing total, completed, and percentage values
 */
export function calculateDailyProgress(habits: Habit[] | undefined): DailyProgressStats {
  // Handle null/undefined data
  if (!habits || !habits.length) {
    return { total: 0, completed: 0, percentage: 0 };
  }
  

  const total = habits.length;
  
  const completed = habits.reduce((count: number, habit: Habit) => {
    // Convert completedToday to boolean to handle different data types
    return habit.completedToday ? count + 1 : count;
  }, 0);
  
  // Calculate percentage with bounds checking
  const percentage = total > 0 ? Math.min(100, Math.max(0, Math.round((completed / total) * 100))) : 0;
  
  return { total, completed, percentage };
}
