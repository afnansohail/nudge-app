import type { RecurrenceParams, RecurrenceType } from '@/lib/types';

export function computeNextOccurrence(
  lastOccurrence: Date,
  type: RecurrenceType,
  params: RecurrenceParams | null
): Date | null {
  if (type === 'none') return null;

  if (type === 'daily') {
    return addDays(lastOccurrence, 1);
  }

  if (type === 'every_n_days') {
    const interval = params?.intervalDays ?? 1;
    return addDays(lastOccurrence, Math.max(1, interval));
  }

  if (type === 'weekly') {
    const weekdays = params?.weekdays?.length
      ? [...params.weekdays].sort((a, b) => a - b)
      : [lastOccurrence.getDay()];
    for (let offset = 1; offset <= 7; offset++) {
      const candidate = addDays(lastOccurrence, offset);
      if (weekdays.includes(candidate.getDay())) {
        return candidate;
      }
    }
    return addDays(lastOccurrence, 7);
  }

  if (type === 'monthly') {
    const dayOfMonth = params?.dayOfMonth ?? lastOccurrence.getDate();
    return nextMonthlyOccurrence(lastOccurrence, dayOfMonth);
  }

  return null;
}

// Advances a recurring nudge's next-occurrence time past `now` in one step, without
// firing a notification for every occurrence missed while the app was closed.
export function catchUpOccurrence(
  nextOccurrenceAt: number,
  type: RecurrenceType,
  params: RecurrenceParams | null,
  now: number
): number {
  if (type === 'none' || nextOccurrenceAt >= now) return nextOccurrenceAt;

  let next = nextOccurrenceAt;
  // Bounded: a lapse of years of daily occurrences still resolves in a few thousand
  // steps, and a malformed rule that never advances must not spin forever.
  for (let i = 0; i < 10_000 && next < now; i++) {
    const computed = computeNextOccurrence(new Date(next), type, params);
    if (!computed || computed.getTime() <= next) break;
    next = computed.getTime();
  }
  return next;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function nextMonthlyOccurrence(from: Date, dayOfMonth: number): Date {
  const next = new Date(from);
  // Reset to day 1 first: setting month directly on a date whose day-of-month
  // exceeds the target month's length rolls over into the month after (JS Date quirk).
  next.setDate(1);
  next.setMonth(next.getMonth() + 1);
  const daysInTargetMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(dayOfMonth, daysInTargetMonth));
  return next;
}
