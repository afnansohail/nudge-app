import type { Nudge } from '@/lib/types';

export type NudgeBuckets = {
  soon: Nudge[];
  whenever: Nudge[];
  completed: Nudge[];
};

export function bucketNudges(nudges: Nudge[]): NudgeBuckets {
  const soon: Nudge[] = [];
  const whenever: Nudge[] = [];
  const completed: Nudge[] = [];

  for (const nudge of nudges) {
    if (nudge.completedAt !== null) {
      completed.push(nudge);
      continue;
    }
    const effectiveDate = nudge.nextOccurrenceAt ?? nudge.dueAt;
    if (effectiveDate !== null) {
      soon.push(nudge);
    } else {
      whenever.push(nudge);
    }
  }

  soon.sort((a, b) => (a.nextOccurrenceAt ?? a.dueAt ?? 0) - (b.nextOccurrenceAt ?? b.dueAt ?? 0));
  completed.sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));

  return { soon, whenever, completed };
}
