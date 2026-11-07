import { describe, it, expect } from 'vitest';
import {
  includesDifferentYear,
  formatNudgeDate,
  formatNudgeTime,
  formatNudgeDateTime,
  isSameCalendarDay,
  nextTimeOfDay,
  clampNumberText,
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

describe('nextTimeOfDay', () => {
  const at = (h: number, m: number) => new Date(2026, 6, 30, h, m);

  it('is today when the time has not passed yet', () => {
    expect(nextTimeOfDay(17, 0, at(9, 0))).toBe(at(17, 0).getTime());
  });

  it('is tomorrow when the time has passed today', () => {
    expect(nextTimeOfDay(8, 30, at(9, 0))).toBe(new Date(2026, 6, 31, 8, 30).getTime());
  });

  it('is tomorrow when the time is exactly now', () => {
    expect(nextTimeOfDay(9, 0, at(9, 0))).toBe(new Date(2026, 6, 31, 9, 0).getTime());
  });

  it('rolls over the end of the month', () => {
    expect(nextTimeOfDay(8, 0, new Date(2026, 6, 31, 9, 0))).toBe(new Date(2026, 7, 1, 8, 0).getTime());
  });
});

describe('clampNumberText', () => {
  it('keeps a number that is in range', () => {
    expect(clampNumberText('15', 1, 31)).toBe('15');
  });

  it('clamps numbers above and below the range', () => {
    expect(clampNumberText('45', 1, 31)).toBe('31');
    expect(clampNumberText('0', 1, 31)).toBe('1');
  });

  it('uses the minimum for empty or non-numeric text', () => {
    expect(clampNumberText('', 1, 31)).toBe('1');
    expect(clampNumberText('abc', 1, 365)).toBe('1');
  });
});
