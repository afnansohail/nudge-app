import type { Nudge } from '@/lib/types';

export type NudgeStatus = 'completed' | 'snoozed' | 'missed' | 'upcoming';

export const STATUS_LABELS: Record<NudgeStatus, string> = {
  upcoming: 'Upcoming',
  completed: 'Completed',
  snoozed: 'Snoozed',
  missed: 'Missed',
};

export function getNudgeStatus(nudge: Nudge, now: number = Date.now()): NudgeStatus {
  if (nudge.completedAt !== null) return 'completed';
  if (nudge.snoozedUntil !== null && nudge.snoozedUntil > now) return 'snoozed';
  const effectiveDate = nudge.nextOccurrenceAt ?? nudge.dueAt;
  if (effectiveDate !== null && effectiveDate < now) return 'missed';
  return 'upcoming';
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

  groups.upcoming.sort((a, b) => effectiveDate(a) - effectiveDate(b));
  groups.missed.sort((a, b) => effectiveDate(a) - effectiveDate(b));
  groups.snoozed.sort((a, b) => (a.snoozedUntil ?? 0) - (b.snoozedUntil ?? 0));
  groups.completed.sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));

  return groups;
}
