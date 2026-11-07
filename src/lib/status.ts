import { isSameCalendarDay } from '@/lib/date';
import type { Nudge } from '@/lib/types';

export type NudgeStatus = 'completed' | 'snoozed' | 'missed' | 'upcoming';

export const STATUS_LABELS: Record<NudgeStatus, string> = {
  upcoming: 'Upcoming',
  completed: 'Completed',
  snoozed: 'Snoozed',
  missed: 'Overdue',
};

export function getNudgeStatus(nudge: Nudge, now: number = Date.now()): NudgeStatus {
  if (nudge.completedAt !== null) return 'completed';
  if (nudge.snoozedUntil !== null && nudge.snoozedUntil > now) return 'snoozed';
  const effectiveDate = nudge.nextOccurrenceAt ?? nudge.dueAt;
  if (effectiveDate !== null && effectiveDate < now) return 'missed';
  return 'upcoming';
}

export function isDueToday(nudge: Nudge, now: number = Date.now()): boolean {
  if (nudge.completedAt !== null) return false;
  const date = nudge.nextOccurrenceAt ?? nudge.dueAt;
  if (date === null) return false;
  return isSameCalendarDay(date, now);
}

export type NudgeGroups = Record<NudgeStatus, Nudge[]>;

function effectiveDate(nudge: Nudge): number {
  return nudge.nextOccurrenceAt ?? nudge.dueAt ?? Number.POSITIVE_INFINITY;
}

export function groupNudgesByStatus(nudges: Nudge[], now: number = Date.now()): NudgeGroups {
  const groups: NudgeGroups = { completed: [], snoozed: [], missed: [], upcoming: [] };

  for (const nudge of nudges) {
    groups[getNudgeStatus(nudge, now)].push(nudge);
  }

  groups.upcoming.sort((a, b) => {
    if (a.sortOrder !== null && b.sortOrder !== null) return a.sortOrder - b.sortOrder;
    if (a.sortOrder !== null) return -1;
    if (b.sortOrder !== null) return 1;
    return effectiveDate(a) - effectiveDate(b);
  });
  groups.missed.sort((a, b) => effectiveDate(a) - effectiveDate(b));
  groups.snoozed.sort((a, b) => (a.snoozedUntil ?? 0) - (b.snoozedUntil ?? 0));
  groups.completed.sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));

  return groups;
}

// Infinity - Infinity is NaN, which is not a valid sort result. Two undated
// nudges (both Infinity) must compare as equal.
function compareNumbers(a: number, b: number): number {
  return a === b ? 0 : a - b;
}

/**
 * Order for the summary screens, which show all lists together. The per-list
 * drag order (sortOrder) has no meaning across lists, so it is not used.
 * Returns a new array.
 */
export function sortAcrossLists(nudges: Nudge[], status: NudgeStatus): Nudge[] {
  const sorted = [...nudges];
  switch (status) {
    case 'completed':
      // Most recently completed first.
      return sorted.sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
    case 'upcoming':
      // Soonest first; nudges with no date last.
      return sorted.sort((a, b) => compareNumbers(effectiveDate(a), effectiveDate(b)));
    case 'missed':
      // Most recently due first: the newest misses matter most.
      return sorted.sort((a, b) => compareNumbers(effectiveDate(b), effectiveDate(a)));
    case 'snoozed':
      // Soonest to wake first.
      return sorted.sort((a, b) => (a.snoozedUntil ?? 0) - (b.snoozedUntil ?? 0));
  }
}
