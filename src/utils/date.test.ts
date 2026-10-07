import { describe, it, expect } from 'vitest';
import { formatSessionDate } from './date';

const NOW = new Date(2026, 9, 7).getTime(); // Oct 7, 2026

describe('formatSessionDate', () => {
  it('shows weekday, abbreviated month with a period, and day', () => {
    expect(formatSessionDate(new Date(2026, 10, 10).getTime(), NOW)).toBe('Tuesday Nov. 10');
  });

  it('does not abbreviate short month names', () => {
    expect(formatSessionDate(new Date(2026, 4, 5).getTime(), NOW)).toBe('Tuesday May 5');
  });

  it('adds the year for another year', () => {
    expect(formatSessionDate(new Date(2025, 11, 25).getTime(), NOW)).toBe('Thursday Dec. 25, 2025');
  });

  it('uses the current date by default', () => {
    expect(formatSessionDate(Date.now())).not.toContain(',');
  });
});
