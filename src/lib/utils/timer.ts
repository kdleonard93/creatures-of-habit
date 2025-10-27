/**
 * Timer utility functions for countdown timers
 */

/**
 * Calculates the time remaining until the next midnight (local time)
 * @returns Object with hours, minutes, and seconds remaining
 */

export function getTimeUntilMidnight (): {hours: number; minutes: number; seconds: number} {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);

    const timeUntilMidnight = midnight.getTime() - now.getTime();

    const hours = Math.floor(timeUntilMidnight / (1000 * 60 * 60));
    const minutes = Math.floor((timeUntilMidnight % (1000 * 60 * 60)) / (1000 * 60));
    const seconds =Math.floor((timeUntilMidnight % (1000 * 60)) / 1000);

    return {hours, minutes, seconds}
}

/**
 * Formats time remaining into a readable string
 * @param hours Hours remaining
 * @param minutes Minutes remaining
 * @param seconds Seconds remaining
 * @returns Formatted string like "5h 23m 45s"
 */

export function formatRemainingTime(hours: number, minutes: number, seconds: number): string {
    return `${hours}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`;
}

/**
 * Checks if a quest was created today
 * @param createdAt ISO timestamp string from the database
 * @returns true if the quest was created today
 */

export function isQuestFromToday(createdAt: string): boolean {
    const questDate = new Date(createdAt);
    const today = new Date();

    return questDate.toDateString() === today.toDateString();
}