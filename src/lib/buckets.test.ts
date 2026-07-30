import { describe, it, expect } from 'vitest';
import { bucketNudges } from '@/lib/buckets';
import type { Nudge } from '@/lib/types';

function makeNudge(overrides: Partial<Nudge>): Nudge {
  return {
    id: overrides.id ?? 'id',
    listId: 'list-1',
    title: 'Test nudge',
    note: null,
    dueAt: null,
    recurrenceType: 'none',
    recurrenceParams: null,
    nextOccurrenceAt: null,
    priority: 'gentle',
    completedAt: null,
    snoozedUntil: null,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

describe('bucketNudges', () => {
  it('puts completed nudges in completed regardless of date', () => {
    const nudge = makeNudge({ id: 'a', completedAt: 100, dueAt: 50 });
    const result = bucketNudges([nudge]);
    expect(result.completed).toEqual([nudge]);
    expect(result.soon).toEqual([]);
    expect(result.whenever).toEqual([]);
  });

  it('puts nudges with no date in whenever', () => {
    const nudge = makeNudge({ id: 'a', dueAt: null });
    const result = bucketNudges([nudge]);
    expect(result.whenever).toEqual([nudge]);
  });

  it('puts dated nudges in soon, sorted soonest first', () => {
    const later = makeNudge({ id: 'later', dueAt: 200 });
    const sooner = makeNudge({ id: 'sooner', dueAt: 100 });
    const result = bucketNudges([later, sooner]);
    expect(result.soon.map((n) => n.id)).toEqual(['sooner', 'later']);
  });

  it('prefers nextOccurrenceAt over dueAt for recurring nudges', () => {
    const nudge = makeNudge({ id: 'a', dueAt: 50, nextOccurrenceAt: 999 });
    const result = bucketNudges([nudge]);
    expect(result.soon).toEqual([nudge]);
  });
});
