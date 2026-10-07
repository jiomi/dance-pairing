/**
 * Format a session date like "Tuesday Nov. 7".
 * Abbreviated months get a period ("Nov."), short ones stay whole ("May").
 * The year is added only when it differs from the current one.
 */
export function formatSessionDate(timestamp: number, now: number = Date.now()): string {
  const date = new Date(timestamp);
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
  const shortMonth = date.toLocaleDateString('en-US', { month: 'short' });
  const longMonth = date.toLocaleDateString('en-US', { month: 'long' });
  const month = shortMonth === longMonth ? longMonth : `${shortMonth}.`;
  const label = `${weekday} ${month} ${date.getDate()}`;
  return date.getFullYear() === new Date(now).getFullYear()
    ? label
    : `${label}, ${date.getFullYear()}`;
}
