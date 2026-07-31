import { describe, it, expect } from 'vitest';
import {
  buildExportPayload,
  parseImportPayload,
  sanitizeImportedLists,
  sanitizeImportedNudges,
  sanitizeImportPayload,
  EXPORT_VERSION,
} from '@/lib/backup';
import type { ExportPayload } from '@/lib/backup';
import type { Nudge, NudgeList } from '@/lib/types';

function makeList(overrides: Partial<NudgeList>): NudgeList {
  return {
    id: 'list-1',
    name: 'My nudges',
    icon: 'sparkles',
    color: 'coral',
    sortOrder: 0,
    isDefault: true,
    createdAt: 0,
    ...overrides,
  };
}

function makeNudge(overrides: Partial<Nudge>): Nudge {
  return {
    id: 'nudge-1',
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
    sortOrder: null,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

describe('buildExportPayload', () => {
  it('includes lists and drops completed nudges', () => {
    const lists = [makeList({})];
    const nudges = [
      makeNudge({ id: 'active', completedAt: null }),
      makeNudge({ id: 'done', completedAt: 123 }),
    ];

    const payload = buildExportPayload(lists, nudges, 999);

    expect(payload.version).toBe(EXPORT_VERSION);
    expect(payload.exportedAt).toBe(999);
    expect(payload.lists).toEqual([
      { id: 'list-1', name: 'My nudges', icon: 'sparkles', color: 'coral', createdAt: 0 },
    ]);
    expect(payload.nudges.map((n) => n.id)).toEqual(['active']);
  });
});

describe('parseImportPayload', () => {
  it('accepts a well-formed payload', () => {
    const json = JSON.stringify({ version: 1, exportedAt: 1, lists: [], nudges: [] });
    const result = parseImportPayload(json);
    expect(result.ok).toBe(true);
  });

  it('rejects invalid JSON', () => {
    const result = parseImportPayload('{not json');
    expect(result).toEqual({ ok: false, error: expect.any(String) });
  });

  it('rejects JSON that is not an object', () => {
    const result = parseImportPayload(JSON.stringify([1, 2, 3]));
    expect(result.ok).toBe(false);
  });

  it('rejects an unsupported version', () => {
    const json = JSON.stringify({ version: 99, lists: [], nudges: [] });
    const result = parseImportPayload(json);
    expect(result.ok).toBe(false);
  });

  it('rejects a payload missing lists/nudges arrays', () => {
    const json = JSON.stringify({ version: 1 });
    const result = parseImportPayload(json);
    expect(result.ok).toBe(false);
  });
});

describe('sanitizeImportedLists', () => {
  const validIcons = new Set(['home', 'list']);
  const validColors = new Set(['blue', 'coral']);

  it('keeps well-formed lists as-is', () => {
    const result = sanitizeImportedLists(
      [{ id: 'a', name: 'Home', icon: 'home', color: 'blue', createdAt: 5 }],
      validIcons,
      validColors,
      'list',
      'coral'
    );
    expect(result).toEqual([
      { originalId: 'a', name: 'Home', icon: 'home', color: 'blue', createdAt: 5 },
    ]);
  });

  it('falls back to defaults for unrecognized icon/color', () => {
    const result = sanitizeImportedLists(
      [{ id: 'a', name: 'Home', icon: 'not-a-real-icon', color: 'not-a-real-color', createdAt: 0 }],
      validIcons,
      validColors,
      'list',
      'coral'
    );
    expect(result[0].icon).toBe('list');
    expect(result[0].color).toBe('coral');
  });

  it('drops entries missing required fields', () => {
    const result = sanitizeImportedLists(
      [{ id: 'a' }, { name: 'no id', icon: 'home', color: 'blue' }, null, 'not an object'],
      validIcons,
      validColors,
      'list',
      'coral'
    );
    expect(result).toEqual([]);
  });
});

describe('sanitizeImportedNudges', () => {
  const validListIds = new Set(['list-a']);

  it('keeps well-formed nudges referencing a valid list', () => {
    const result = sanitizeImportedNudges(
      [
        {
          listId: 'list-a',
          title: 'Water plants',
          note: 'daily',
          dueAt: 100,
          recurrenceType: 'daily',
          recurrenceParams: { intervalDays: 1 },
          nextOccurrenceAt: 100,
          createdAt: 5,
        },
      ],
      validListIds
    );
    expect(result).toEqual([
      {
        originalListId: 'list-a',
        title: 'Water plants',
        note: 'daily',
        dueAt: 100,
        recurrenceType: 'daily',
        recurrenceParams: { intervalDays: 1 },
        nextOccurrenceAt: 100,
        createdAt: 5,
      },
    ]);
  });

  it('drops nudges referencing a list not present in the payload', () => {
    const result = sanitizeImportedNudges(
      [{ listId: 'unknown-list', title: 'Orphan', recurrenceType: 'none' }],
      validListIds
    );
    expect(result).toEqual([]);
  });

  it('drops nudges with an unrecognized recurrenceType', () => {
    const result = sanitizeImportedNudges(
      [{ listId: 'list-a', title: 'Bad recurrence', recurrenceType: 'hourly' }],
      validListIds
    );
    expect(result).toEqual([]);
  });

  it('drops nudges missing a title', () => {
    const result = sanitizeImportedNudges(
      [{ listId: 'list-a', recurrenceType: 'none' }],
      validListIds
    );
    expect(result).toEqual([]);
  });
});

describe('sanitizeImportPayload', () => {
  const validIcons = new Set(['home']);
  const validColors = new Set(['blue']);

  it('drops a nudge whose list entry itself got rejected', () => {
    const payload = {
      version: EXPORT_VERSION,
      exportedAt: 0,
      lists: [{ id: 'bad-list' /* missing name */, icon: 'home', color: 'blue', createdAt: 0 }],
      nudges: [{ listId: 'bad-list', title: 'Orphaned by rejected list', recurrenceType: 'none' }],
    } as unknown as ExportPayload;

    const result = sanitizeImportPayload(payload, validIcons, validColors, 'list', 'coral');

    expect(result.lists).toEqual([]);
    expect(result.nudges).toEqual([]);
  });

  it('keeps nudges whose list survives sanitization', () => {
    const payload = {
      version: EXPORT_VERSION,
      exportedAt: 0,
      lists: [{ id: 'good-list', name: 'Home', icon: 'home', color: 'blue', createdAt: 0 }],
      nudges: [{ listId: 'good-list', title: 'Keep me', recurrenceType: 'none' }],
    } as unknown as ExportPayload;

    const result = sanitizeImportPayload(payload, validIcons, validColors, 'list', 'coral');

    expect(result.lists).toHaveLength(1);
    expect(result.nudges).toHaveLength(1);
  });
});
