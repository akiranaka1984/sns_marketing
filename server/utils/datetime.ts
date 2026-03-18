/**
 * Convert a Date to MySQL-compatible timestamp string (YYYY-MM-DD HH:MM:SS).
 * Drizzle ORM with `timestamp({ mode: 'string' })` expects this format.
 */
export function toMySQLTimestamp(date: Date = new Date()): string {
  return date.toISOString().slice(0, 19).replace("T", " ");
}
