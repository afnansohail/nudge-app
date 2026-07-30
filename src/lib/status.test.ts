import { describe, it, expect } from 'vitest';
import { getNudgeStatus, groupNudgesByStatus } from '@/lib/status';
import type { Nudge } from '@/lib/types';

const NOW = 1_000_000;

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

describe('getNudgeStatus', () => {
  it('is completed regardless of date', () => {
    const nudge = makeNudge({ completedAt: 5, dueAt: NOW - 100 });
    expect(getNudgeStatus(nudge, NOW)).toBe('completed');
  });

  it('is snoozed when snoozedUntil is in the future and not completed', () => {
    const nudge = makeNudge({ snoozedUntil: NOW + 100 });
    expect(getNudgeStatus(nudge, NOW)).toBe('snoozed');
  });

  it('is not snoozed once snoozedUntil has passed', () => {
    const nudge = makeNudge({ snoozedUntil: NOW - 100 });
    expect(getNudgeStatus(nudge, NOW)).toBe('upcoming');
  });

  it('is missed when the effective date is in the past and not completed/snoozed', () => {
    const nudge = makeNudge({ dueAt: NOW - 100 });
    expect(getNudgeStatus(nudge, NOW)).toBe('missed');
  });

  it('prefers nextOccurrenceAt over dueAt for recurring nudges', () => {
    const nudge = makeNudge({ dueAt: NOW - 100, nextOccurrenceAt: NOW + 100 });
    expect(getNudgeStatus(nudge, NOW)).toBe('upcoming');
  });

  it('is upcoming when there is no date at all', () => {
    const nudge = makeNudge({ dueAt: null });
    expect(getNudgeStatus(nudge, NOW)).toBe('upcoming');
  });

  it('is upcoming when the effective date is in the future', () => {
    const nudge = makeNudge({ dueAt: NOW + 100 });
    expect(getNudgeStatus(nudge, NOW)).toBe('upcoming');
  });

  it('is upcoming for a recurring nudge that finished its occurrence today', () => {
    const nudge = makeNudge({
      recurrenceType: 'daily',
      lastCompletedAt: NOW - 100,
      nextOccurrenceAt: NOW + 1000 * 60 * 60 * 24,
    });
    expect(getNudgeStatus(nudge, NOW)).toBe('upcoming');
  });

  it('is not completed once the day rolls over, even with a stale lastCompletedAt', () => {
    const oneDayMs = 1000 * 60 * 60 * 24;
    const nudge = makeNudge({
      recurrenceType: 'daily',
      lastCompletedAt: NOW - oneDayMs,
      nextOccurrenceAt: NOW - 1000,
    });
    expect(getNudgeStatus(nudge, NOW)).toBe('missed');
  });

  it('ignores lastCompletedAt for non-recurring nudges', () => {
    const nudge = makeNudge({ lastCompletedAt: NOW - 100, dueAt: NOW - 100 });
    expect(getNudgeStatus(nudge, NOW)).toBe('missed');
  });
});

describe('groupNudgesByStatus', () => {
  it('sorts missed and upcoming soonest-first', () => {
    const later = makeNudge({ id: 'later', dueAt: NOW + 200 });
    const sooner = makeNudge({ id: 'sooner', dueAt: NOW + 100 });
    const groups = groupNudgesByStatus([later, sooner], NOW);
    expect(groups.upcoming.map((n) => n.id)).toEqual(['sooner', 'later']);
  });

  it('sorts completed most-recently-completed-first', () => {
    const older = makeNudge({ id: 'older', completedAt: 100 });
    const newer = makeNudge({ id: 'newer', completedAt: 200 });
    const groups = groupNudgesByStatus([older, newer], NOW);
    expect(groups.completed.map((n) => n.id)).toEqual(['newer', 'older']);
  });

  it('partitions nudges into exactly one bucket each', () => {
    const nudges = [
      makeNudge({ id: 'a', completedAt: 5 }),
      makeNudge({ id: 'b', snoozedUntil: NOW + 100 }),
      makeNudge({ id: 'c', dueAt: NOW - 100 }),
      makeNudge({ id: 'd', dueAt: null }),
    ];
    const groups = groupNudgesByStatus(nudges, NOW);
    expect(groups.completed.map((n) => n.id)).toEqual(['a']);
    expect(groups.snoozed.map((n) => n.id)).toEqual(['b']);
    expect(groups.missed.map((n) => n.id)).toEqual(['c']);
    expect(groups.upcoming.map((n) => n.id)).toEqual(['d']);
  });
});
