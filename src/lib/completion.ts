import { computeNextOccurrence } from '@/lib/recurrence';
import type { Nudge } from '@/lib/types';

type NudgeUpdate = Partial<Nudge> & Pick<Nudge, 'id'>;
type CopyFields = Omit<Nudge, 'id' | 'createdAt' | 'updatedAt'>;

export type CompletionResult = {
  updatedNudge: NudgeUpdate;
  copy: CopyFields | null;
};

export function computeCompletion(nudge: Nudge, now: number): CompletionResult {
  if (nudge.recurrenceType === 'none') {
    return {
      updatedNudge: { id: nudge.id, completedAt: now, lastCompletedAt: now },
      copy: null,
    };
  }

  const anchor = nudge.nextOccurrenceAt ?? nudge.dueAt ?? now;
  const next = computeNextOccurrence(new Date(anchor), nudge.recurrenceType, nudge.recurrenceParams);

  return {
    updatedNudge: {
      id: nudge.id,
      nextOccurrenceAt: next ? next.getTime() : null,
      snoozedUntil: null,
      lastCompletedAt: now,
    },
    copy: {
      listId: nudge.listId,
      title: nudge.title,
      note: nudge.note,
      dueAt: anchor,
      recurrenceType: 'none',
      recurrenceParams: null,
      nextOccurrenceAt: null,
      completedAt: now,
      lastCompletedAt: now,
      snoozedUntil: null,
      sourceNudgeId: nudge.id,
      rollbackLastCompletedAt: nudge.lastCompletedAt,
      sortOrder: null,
    },
  };
}

export type UncompletionResult =
  | { kind: 'revert'; updatedNudge: NudgeUpdate }
  | { kind: 'deleteCopy'; deletedId: string; sourceUpdate: NudgeUpdate | null };

export function computeUncompletion(target: Nudge, source: Nudge | null): UncompletionResult {
  if (target.sourceNudgeId === null) {
    return {
      kind: 'revert',
      updatedNudge: { id: target.id, completedAt: null, lastCompletedAt: null },
    };
  }

  const isMostRecent = source !== null && source.lastCompletedAt === target.completedAt;

  return {
    kind: 'deleteCopy',
    deletedId: target.id,
    sourceUpdate: isMostRecent
      ? {
          id: source!.id,
          nextOccurrenceAt: target.dueAt,
          lastCompletedAt: target.rollbackLastCompletedAt,
        }
      : null,
  };
}
