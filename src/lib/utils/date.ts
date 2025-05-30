/**
 * Date utility functions for consistent formatting across the application
 */

/**
 * Formats a date to match SQLite's CURRENT_TIMESTAMP format (YYYY-MM-DD HH:MM:SS)
 * Use this for any date that will be stored in a column with a CURRENT_TIMESTAMP default
 * 
 * @param date The date to format (defaults to current date/time)
 * @returns A string in the format "YYYY-MM-DD HH:MM:SS"
 */
export function formatSqliteTimestamp(date: Date = new Date()): string {
  return date.toISOString().replace('T', ' ').substring(0, 19);
}

/**
 * Formats a date as YYYY-MM-DD (useful for date-only fields)
 * 
 * @param date The date to format (defaults to current date)
 * @returns A string in the format "YYYY-MM-DD"
 */
export function formatDateOnly(date: Date = new Date()): string {
  return date.toISOString().split('T')[0];
}
