import { runDailyTrackerCleanup } from './cleanup';
import { logger } from '$lib/utils/logger';

interface ScheduledTask {
  name: string;
  fn: () => Promise<void>;
  interval: number; // in milliseconds
  lastRun?: Date;
}

/**
 * Scheduler for running periodic maintenance tasks
 */
class TaskScheduler {
  private tasks: ScheduledTask[] = [];
  private intervals: NodeJS.Timeout[] = [];
  private isRunning = false;

  /**
   * Register a new task to be run on a schedule
   */
  registerTask(name: string, fn: () => Promise<void>, intervalMs: number): void {
    this.tasks.push({
      name,
      fn,
      interval: intervalMs
    });
    logger.info(`Registered task: ${name} (interval: ${intervalMs}ms)`);
  }

  /**
   * Start the scheduler
   */
  start(): void {
    if (this.isRunning) {
      logger.warn('Scheduler is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting task scheduler');

    // Start each task on its own interval
    for (const task of this.tasks) {
      const interval = setInterval(async () => {
        try {
          logger.info(`Running scheduled task: ${task.name}`);
          task.lastRun = new Date();
          await task.fn();
        } catch (error) {
          logger.error(`Error in scheduled task ${task.name}`, {
            error: error instanceof Error ? error.message : String(error)
          });
        }
      }, task.interval);

      this.intervals.push(interval);
    }
  }

  /**
   * Stop the scheduler
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    logger.info('Stopping task scheduler');
    for (const interval of this.intervals) {
      clearInterval(interval);
    }
    this.intervals = [];
    this.isRunning = false;
  }

  /**
   * Run a specific task immediately
   */
  async runTaskNow(taskName: string): Promise<void> {
    const task = this.tasks.find(t => t.name === taskName);
    if (!task) {
      throw new Error(`Task not found: ${taskName}`);
    }

    logger.info(`Manually running task: ${taskName}`);
    task.lastRun = new Date();
    await task.fn();
  }
}

// Create singleton instance
export const taskScheduler = new TaskScheduler();

// Register default tasks
// Daily cleanup at midnight (or app startup, then every 24 hours)
taskScheduler.registerTask(
  'daily-tracker-cleanup',
  () => runDailyTrackerCleanup(30), // Keep 30 days of history
  24 * 60 * 60 * 1000 // Run every 24 hours
);

/**
 * Initialize the task scheduler
 * Call this during app startup
 */
export function initializeScheduler(): void {
  // Only start the scheduler in production or when explicitly enabled
  if (process.env.NODE_ENV === 'production' || process.env.ENABLE_SCHEDULER === 'true') {
    taskScheduler.start();
    logger.info('Task scheduler initialized');
  } else {
    logger.info('Task scheduler not started (not in production)');
  }
}
