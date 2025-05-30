import { db } from '../server/db';
import { dailyHabitTracker, habit, user } from '../server/db/schema';
import { eq, and, sql, lt } from 'drizzle-orm';
import { SQLiteTransaction } from 'drizzle-orm/sqlite-core';

/**
 * Custom error class for daily tracker operations
 */
export class DailyTrackerError extends Error {
  constructor(message: string, public code: string, public statusCode = 500) {
    super(message);
    this.name = 'DailyTrackerError';
  }
}

/**
 * Verify that the user exists and has permission to access the data
 * @throws DailyTrackerError if user doesn't exist
 */
async function verifyUserExists(userId: string): Promise<void> {
  try {
    const userExists = await db
      .select({ id: user.id })
      .from(user)
      .where(eq(user.id, userId))
      .then(rows => rows.length > 0);
    
    if (!userExists) {
      throw new DailyTrackerError('User not found', 'USER_NOT_FOUND', 404);
    }
  } catch (error) {
    if (error instanceof DailyTrackerError) throw error;
    throw new DailyTrackerError('Failed to verify user', 'DATABASE_ERROR', 500);
  }
}

/**
 * Verify that the habit belongs to the user
 * @throws DailyTrackerError if habit doesn't exist or doesn't belong to user
 */
async function verifyHabitBelongsToUser(userId: string, habitId: string): Promise<void> {
  try {
    const habitBelongsToUser = await db
      .select({ id: habit.id })
      .from(habit)
      .where(and(
        eq(habit.id, habitId),
        eq(habit.userId, userId)
      ))
      .then(rows => rows.length > 0);
    
    if (!habitBelongsToUser) {
      throw new DailyTrackerError('Habit not found or does not belong to user', 'UNAUTHORIZED_ACCESS', 403);
    }
  } catch (error) {
    if (error instanceof DailyTrackerError) throw error;
    throw new DailyTrackerError('Failed to verify habit ownership', 'DATABASE_ERROR', 500);
  }
}

/**
 * Get the current date in YYYY-MM-DD format
 */
function getCurrentDate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Ensures that all active habits for a user have tracker entries for the current day
 * This should be called when loading the dashboard to ensure all habits are tracked
 * @throws DailyTrackerError if operation fails
 */
export async function ensureDailyTrackerEntries(userId: string): Promise<void> {
  try {
    // Verify user exists
    await verifyUserExists(userId);
    
    const today = getCurrentDate();
    
    // Use a transaction to ensure consistency
    await db.transaction(async (tx) => {
      // Get all active habits and existing entries in a single transaction
      const [activeHabits, existingEntries] = await Promise.all([
        tx
          .select({ id: habit.id })
          .from(habit)
          .where(and(
            eq(habit.userId, userId),
            eq(habit.isArchived, false),
            eq(habit.isActive, true)
          )),
        tx
          .select({ habitId: dailyHabitTracker.habitId })
          .from(dailyHabitTracker)
          .where(and(
            eq(dailyHabitTracker.userId, userId),
            eq(dailyHabitTracker.date, today)
          ))
      ]);
      
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
        await tx.insert(dailyHabitTracker).values(entriesToCreate);
      }
    });
  } catch (error) {
    if (error instanceof DailyTrackerError) throw error;
    throw new DailyTrackerError(
      `Failed to ensure daily tracker entries: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'TRACKER_ERROR',
      500
    );
  }
}

/**
 * Marks a habit as completed in the daily tracker
 * @throws DailyTrackerError if operation fails or unauthorized
 */
export async function markHabitCompleted(userId: string, habitId: string): Promise<boolean> {
  try {
    // Verify user exists and habit belongs to user
    await verifyUserExists(userId);
    await verifyHabitBelongsToUser(userId, habitId);
    
    const today = getCurrentDate();
    
    // Use a transaction for the operation
    return await db.transaction(async (tx) => {
      // Check if an entry exists for today
      const existingEntry = await tx
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
        await tx
          .update(dailyHabitTracker)
          .set({ 
            completed: true,
            updatedAt: new Date().toISOString()
          })
          .where(eq(dailyHabitTracker.id, existingEntry.id));
      } else {
        // Create new entry
        await tx
          .insert(dailyHabitTracker)
          .values({
            userId,
            habitId,
            date: today,
            completed: true
          });
      }
      
      return true;
    });
  } catch (error) {
    if (error instanceof DailyTrackerError) throw error;
    throw new DailyTrackerError(
      `Failed to mark habit as completed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'COMPLETION_ERROR',
      500
    );
  }
}

/**
 * Gets the daily progress stats for a user
 * @throws DailyTrackerError if operation fails or unauthorized
 */
export async function getDailyProgressStats(userId: string): Promise<{
  total: number;
  completed: number;
  percentage: number;
}> {
  try {
    // Verify user exists
    await verifyUserExists(userId);
    
    const today = getCurrentDate();
    
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
  } catch (error) {
    if (error instanceof DailyTrackerError) throw error;
    throw new DailyTrackerError(
      `Failed to get daily progress stats: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'STATS_ERROR',
      500
    );
  }
}

/**
 * Cleans up old tracker entries to prevent database bloat
 * @param daysToKeep Number of days of history to retain
 * @throws DailyTrackerError if operation fails
 */
export async function cleanupOldTrackerEntries(daysToKeep = 30): Promise<number> {
  try {
    // Calculate the cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
    const cutoffDateString = cutoffDate.toISOString().split('T')[0];
    
    // Delete entries older than the cutoff date
    const result = await db
      .delete(dailyHabitTracker)
      .where(lt(dailyHabitTracker.date, cutoffDateString));
    
    // Return the number of deleted entries if available
    return result.rowsAffected || 0;
  } catch (error) {
    throw new DailyTrackerError(
      `Failed to clean up old tracker entries: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'CLEANUP_ERROR',
      500
    );
  }
}
