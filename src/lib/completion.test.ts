import { describe, it, expect } from 'vitest';
import { computeCompletion, computeUncompletion } from '@/lib/completion';
import type { Nudge } from '@/lib/types';

const NOW = 1_000_000;
const DAY = 1000 * 60 * 60 * 24;

function makeNudge(overrides: Partial<Nudge>): Nudge {
  return {
    id: 'id',
    listId: 'list-1',
    title: 'Test nudge',
    note: null,
    dueAt: null,
    recurrenceType: 'none',
    recurrenceParams: null,
    nextOccurrenceAt: null,
    completedAt: null,
    lastCompletedAt: null,
    snoozedUntil: null,
    sourceNudgeId: null,
    rollbackLastCompletedAt: null,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

describe('computeCompletion', () => {
  it('completes a non-recurring nudge in place with no copy', () => {
    const nudge = makeNudge({ dueAt: NOW - 100 });

    const result = computeCompletion(nudge, NOW);

    expect(result.copy).toBeNull();
    expect(result.updatedNudge).toEqual({
      id: 'id',
      completedAt: NOW,
      lastCompletedAt: NOW,
    });
  });

  it('rolls a recurring nudge forward and produces a completed-occurrence copy', () => {
    const nudge = makeNudge({
      id: 'live-1',
      listId: 'list-9',
      title: 'Water the plants',
      note: 'Check the ferns too',
      recurrenceType: 'daily',
      recurrenceParams: null,
      dueAt: NOW - 500,
      nextOccurrenceAt: NOW - 500,
      lastCompletedAt: NOW - DAY,
      snoozedUntil: NOW + 999,
    });

    const result = computeCompletion(nudge, NOW);

    expect(result.updatedNudge).toEqual({
      id: 'live-1',
      nextOccurrenceAt: NOW - 500 + DAY,
      snoozedUntil: null,
      lastCompletedAt: NOW,
    });
    expect(result.copy).toEqual({
      listId: 'list-9',
      title: 'Water the plants',
      note: 'Check the ferns too',
      dueAt: NOW - 500,
      recurrenceType: 'none',
      recurrenceParams: null,
      nextOccurrenceAt: null,
      completedAt: NOW,
      lastCompletedAt: NOW,
      snoozedUntil: null,
      sourceNudgeId: 'live-1',
      rollbackLastCompletedAt: NOW - DAY,
    });
  });

  it('anchors the recurring rollover on dueAt when nextOccurrenceAt is unset', () => {
    const nudge = makeNudge({
      id: 'live-2',
      recurrenceType: 'daily',
      dueAt: NOW - 500,
      nextOccurrenceAt: null,
    });

    const result = computeCompletion(nudge, NOW);

    expect(result.copy?.dueAt).toBe(NOW - 500);
    expect(result.updatedNudge.nextOccurrenceAt).toBe(NOW - 500 + DAY);
  });
});

describe('computeUncompletion', () => {
  it('reverts a plain non-recurring nudge in place', () => {
    const target = makeNudge({ id: 'plain-1', completedAt: NOW, lastCompletedAt: NOW });

    const result = computeUncompletion(target, null);

    expect(result).toEqual({
      kind: 'revert',
      updatedNudge: { id: 'plain-1', completedAt: null, lastCompletedAt: null },
    });
  });

  it('rolls the live nudge back when undoing its most recent completed copy', () => {
    const source = makeNudge({
      id: 'live-1',
      recurrenceType: 'daily',
      nextOccurrenceAt: NOW + DAY,
      lastCompletedAt: NOW,
    });
    const copy = makeNudge({
      id: 'copy-1',
      sourceNudgeId: 'live-1',
      dueAt: NOW - 500,
      completedAt: NOW,
      lastCompletedAt: NOW,
      rollbackLastCompletedAt: NOW - DAY,
    });

    const result = computeUncompletion(copy, source);

    expect(result).toEqual({
      kind: 'deleteCopy',
      deletedId: 'copy-1',
      sourceUpdate: { id: 'live-1', nextOccurrenceAt: NOW - 500, lastCompletedAt: NOW - DAY },
    });
  });

  it('only deletes an older completed copy, leaving the live nudge untouched', () => {
    const source = makeNudge({
      id: 'live-1',
      recurrenceType: 'daily',
      nextOccurrenceAt: NOW + DAY,
      lastCompletedAt: NOW, // live nudge has since completed again
    });
    const olderCopy = makeNudge({
      id: 'copy-old',
      sourceNudgeId: 'live-1',
      dueAt: NOW - DAY - 500,
      completedAt: NOW - DAY,
      lastCompletedAt: NOW - DAY,
      rollbackLastCompletedAt: NOW - 2 * DAY,
    });

    const result = computeUncompletion(olderCopy, source);

    expect(result).toEqual({
      kind: 'deleteCopy',
      deletedId: 'copy-old',
      sourceUpdate: null,
    });
  });

  it('only deletes a copy whose source nudge no longer exists', () => {
    const copy = makeNudge({
      id: 'copy-orphan',
      sourceNudgeId: 'deleted-live',
      completedAt: NOW,
      lastCompletedAt: NOW,
    });

    const result = computeUncompletion(copy, null);

    expect(result).toEqual({
      kind: 'deleteCopy',
      deletedId: 'copy-orphan',
      sourceUpdate: null,
    });
  });
});
