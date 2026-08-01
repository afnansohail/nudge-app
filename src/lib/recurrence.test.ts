import { describe, it, expect } from 'vitest';
import { computeNextOccurrence, catchUpOccurrence } from '@/lib/recurrence';

describe('computeNextOccurrence', () => {
  it('returns null for type none', () => {
    expect(computeNextOccurrence(new Date(2026, 0, 1, 9, 0), 'none', null)).toBeNull();
  });

  it('advances daily by exactly one day, same time', () => {
    const last = new Date(2026, 0, 1, 8, 30);
    const next = computeNextOccurrence(last, 'daily', null);
    expect(next).toEqual(new Date(2026, 0, 2, 8, 30));
  });

  it('advances every_n_days by the configured interval', () => {
    const last = new Date(2026, 0, 1, 8, 30);
    const next = computeNextOccurrence(last, 'every_n_days', { intervalDays: 3 });
    expect(next).toEqual(new Date(2026, 0, 4, 8, 30));
  });

  it('picks the next matching weekday', () => {
    // 2026-01-01 is a Thursday
    const last = new Date(2026, 0, 1, 8, 30);
    const next = computeNextOccurrence(last, 'weekly', { weekdays: [1, 3] }); // Mon, Wed
    expect(next).toEqual(new Date(2026, 0, 5, 8, 30)); // next Monday
  });

  it('wraps to the following week when no weekday matches sooner', () => {
    const last = new Date(2026, 0, 1, 8, 30); // Thursday
    const next = computeNextOccurrence(last, 'weekly', { weekdays: [4] }); // only Thursday
    expect(next).toEqual(new Date(2026, 0, 8, 8, 30));
  });

  it('advances to the same day next month', () => {
    const last = new Date(2026, 0, 15, 8, 30);
    const next = computeNextOccurrence(last, 'monthly', { dayOfMonth: 15 });
    expect(next).toEqual(new Date(2026, 1, 15, 8, 30));
  });

  it('clamps day-of-month when the next month is shorter', () => {
    const last = new Date(2026, 0, 31, 8, 30); // Jan 31
    const next = computeNextOccurrence(last, 'monthly', { dayOfMonth: 31 });
    expect(next).toEqual(new Date(2026, 1, 28, 8, 30)); // Feb 2026 has 28 days
  });
});

describe('catchUpOccurrence', () => {
  it('leaves a future occurrence untouched', () => {
    const next = new Date(2026, 0, 5, 8, 30).getTime();
    const now = new Date(2026, 0, 1, 0, 0).getTime();
    expect(catchUpOccurrence(next, 'daily', null, now)).toBe(next);
  });

  it('skips every missed day but leaves the most recent one due, not the future one', () => {
    const staleOccurrence = new Date(2026, 0, 1, 8, 30).getTime();
    const now = new Date(2026, 0, 10, 12, 0).getTime(); // 9 days later, app was closed
    const caughtUp = catchUpOccurrence(staleOccurrence, 'daily', null, now);
    // Jan 10, 8:30 already happened (it's before `now`) and hasn't been acted on yet,
    // so it must stay pending — jumping to Jan 11 would silently discard it.
    expect(new Date(caughtUp)).toEqual(new Date(2026, 0, 10, 8, 30));
  });

  it('catches up every_n_days without drifting off the original schedule', () => {
    const staleOccurrence = new Date(2026, 0, 1, 8, 30).getTime();
    const now = new Date(2026, 0, 10, 0, 0).getTime();
    const caughtUp = catchUpOccurrence(staleOccurrence, 'every_n_days', { intervalDays: 3 }, now);
    // Occurrences are Jan 1, 4, 7, 10. Jan 10 8:30 is still ahead of `now` (Jan 10 00:00),
    // so the most recent due one is Jan 7 — that's what should remain pending.
    expect(new Date(caughtUp)).toEqual(new Date(2026, 0, 7, 8, 30));
  });

  it('leaves a same-day occurrence that just became due untouched', () => {
    // A recurring nudge created for today with a time already in the past must keep
    // showing as due today, not skip straight to tomorrow's occurrence.
    const dueEarlierToday = new Date(2026, 0, 1, 8, 30).getTime();
    const now = new Date(2026, 0, 1, 9, 0).getTime();
    expect(catchUpOccurrence(dueEarlierToday, 'daily', null, now)).toBe(dueEarlierToday);
  });

  it('never returns a past time and never spins forever for one-time nudges', () => {
    const stale = new Date(2026, 0, 1, 8, 30).getTime();
    const now = new Date(2026, 0, 10, 0, 0).getTime();
    expect(catchUpOccurrence(stale, 'none', null, now)).toBe(stale);
  });
});
