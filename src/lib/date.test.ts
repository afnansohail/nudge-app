import { describe, it, expect } from 'vitest';
import {
  includesDifferentYear,
  formatNudgeDate,
  formatNudgeTime,
  formatNudgeDateTime,
  isSameCalendarDay,
} from '@/lib/date';

const NOW = new Date(2026, 6, 30).getTime();

describe('includesDifferentYear', () => {
  it('is false for a timestamp in the same year as now', () => {
    expect(includesDifferentYear(new Date(2026, 0, 1).getTime(), NOW)).toBe(false);
  });

  it('is true for a timestamp in a different year than now', () => {
    expect(includesDifferentYear(new Date(2036, 0, 1).getTime(), NOW)).toBe(true);
  });
});

describe('formatNudgeDate', () => {
  it('omits the year when it matches now', () => {
    const result = formatNudgeDate(new Date(2026, 0, 15).getTime(), NOW);
    expect(result).not.toContain('2026');
  });

  it('includes the year when it differs from now', () => {
    const result = formatNudgeDate(new Date(2036, 0, 15).getTime(), NOW);
    expect(result).toContain('2036');
  });
});

describe('formatNudgeTime', () => {
  it('formats hour and minute', () => {
    const result = formatNudgeTime(new Date(2026, 0, 15, 9, 5).getTime());
    expect(result).toContain('9');
    expect(result).toContain('05');
  });
});

describe('isSameCalendarDay', () => {
  it('is true for two timestamps on the same day', () => {
    const a = new Date(2026, 6, 30, 8, 0).getTime();
    const b = new Date(2026, 6, 30, 23, 0).getTime();
    expect(isSameCalendarDay(a, b)).toBe(true);
  });

  it('is false for timestamps on different days', () => {
    const a = new Date(2026, 6, 30, 23, 59).getTime();
    const b = new Date(2026, 7, 1, 0, 1).getTime();
    expect(isSameCalendarDay(a, b)).toBe(false);
  });
});

describe('formatNudgeDateTime', () => {
  it('combines date and time, including year when it differs', () => {
    const result = formatNudgeDateTime(new Date(2036, 0, 15, 14, 30).getTime(), NOW);
    expect(result).toContain('2036');
    expect(result).toContain('30');
  });
});
