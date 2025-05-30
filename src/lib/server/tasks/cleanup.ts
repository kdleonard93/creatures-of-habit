import { cleanupOldTrackerEntries } from '$lib/utils/dailyHabitTracker';
import { logger } from '$lib/utils/logger';

/**
 * Cleanup task to remove old daily habit tracker entries
 * @param daysToKeep Number of days of history to retain (default: 30)
 */
export async function runDailyTrackerCleanup(daysToKeep = 30): Promise<void> {
  try {
    logger.info(`Starting cleanup of old daily habit tracker entries (keeping ${daysToKeep} days)`);
    
    const deletedCount = await cleanupOldTrackerEntries(daysToKeep);
    
    logger.info(`Cleanup completed: removed ${deletedCount} old tracker entries`);
  } catch (error) {
    logger.error('Failed to clean up old tracker entries', {
      error: error instanceof Error ? error.message : String(error)
    });
  }
}
