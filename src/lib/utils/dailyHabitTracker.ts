import { db } from '../server/db';
import { dailyHabitTracker, habit } from '../server/db/schema';
import { eq, and } from 'drizzle-orm';

/**
 * Ensures that all active habits for a user have tracker entries for the current day
 * This should be called when loading the dashboard to ensure all habits are tracked
 */
export async function ensureDailyTrackerEntries(userId: string): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  
  // Get all active habits for the user
  const activeHabits = await db
    .select({ id: habit.id })
    .from(habit)
    .where(and(
      eq(habit.userId, userId),
      eq(habit.isArchived, false),
      eq(habit.isActive, true)
    ));
  
  // Get existing tracker entries for today
  const existingEntries = await db
    .select({ habitId: dailyHabitTracker.habitId })
    .from(dailyHabitTracker)
    .where(and(
      eq(dailyHabitTracker.userId, userId),
      eq(dailyHabitTracker.date, today)
    ));
  
  // Create a set of habit IDs that already have tracker entries
  const trackedHabitIds = new Set(existingEntries.map(entry => entry.habitId));
  
  // Create tracker entries for habits that don't have one yet
  const entriesToCreate = activeHabits
    .filter(habit => !trackedHabitIds.has(habit.id))
    .map(habit => ({
      userId,
      habitId: habit.id,
      date: today,
      completed: false
    }));
  
  if (entriesToCreate.length > 0) {
    await db.insert(dailyHabitTracker).values(entriesToCreate);
  }
}

/**
 * Marks a habit as completed in the daily tracker
 */
export async function markHabitCompleted(userId: string, habitId: string): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0];
  
  // Check if an entry exists for today
  const existingEntry = await db
    .select()
    .from(dailyHabitTracker)
    .where(and(
      eq(dailyHabitTracker.userId, userId),
      eq(dailyHabitTracker.habitId, habitId),
      eq(dailyHabitTracker.date, today)
    ))
    .then(rows => rows[0]);
  
  if (existingEntry) {
    // Update existing entry
    await db
      .update(dailyHabitTracker)
      .set({ 
        completed: true,
        updatedAt: new Date().toISOString()
      })
      .where(eq(dailyHabitTracker.id, existingEntry.id));
  } else {
    // Create new entry
    await db
      .insert(dailyHabitTracker)
      .values({
        userId,
        habitId,
        date: today,
        completed: true
      });
  }
  
  return true;
}

/**
 * Gets the daily progress stats for a user
 */
export async function getDailyProgressStats(userId: string): Promise<{
  total: number;
  completed: number;
  percentage: number;
}> {
  const today = new Date().toISOString().split('T')[0];
  
  // Ensure all habits have tracker entries
  await ensureDailyTrackerEntries(userId);
  
  // Get all tracker entries for today
  const entries = await db
    .select()
    .from(dailyHabitTracker)
    .where(and(
      eq(dailyHabitTracker.userId, userId),
      eq(dailyHabitTracker.date, today)
    ));
  
  const total = entries.length;
  const completed = entries.filter(entry => entry.completed).length;
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
  
  return { total, completed, percentage };
}
