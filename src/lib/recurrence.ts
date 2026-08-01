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

export function catchUpOccurrence(
  nextOccurrenceAt: number,
  type: RecurrenceType,
  params: RecurrenceParams | null,
  now: number
): number {
  if (type === 'none' || nextOccurrenceAt >= now) return nextOccurrenceAt;

  let next = nextOccurrenceAt;
  for (let i = 0; i < 10_000; i++) {
    const computed = computeNextOccurrence(new Date(next), type, params);
    if (!computed || computed.getTime() <= next) break;
    if (computed.getTime() >= now) break;
    next = computed.getTime();
  }
  return next;
}

export function formatRecurrenceLabel(
  type: RecurrenceType,
  params: RecurrenceParams | null
): string | null {
  if (type === 'daily') return 'Daily';
  if (type === 'weekly') return 'Weekly';
  if (type === 'monthly') return 'Monthly';
  if (type === 'every_n_days') {
    const interval = Math.max(1, params?.intervalDays ?? 1);
    return interval === 1 ? 'Daily' : `Every ${interval} days`;
  }
  return null;
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function nextMonthlyOccurrence(from: Date, dayOfMonth: number): Date {
  const next = new Date(from);
  next.setDate(1);
  next.setMonth(next.getMonth() + 1);
  const daysInTargetMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(dayOfMonth, daysInTargetMonth));
  return next;
}
