import type { SQLiteDatabase } from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import type { Nudge, RecurrenceParams, RecurrenceType } from '@/lib/types';
import { computeCompletion, computeUncompletion } from '@/lib/completion';
import { incrementCompletedCount, decrementCompletedCount } from '@/db/settings';

type NudgeRow = {
  id: string;
  list_id: string;
  title: string;
  note: string | null;
  due_at: number | null;
  recurrence_type: RecurrenceType;
  recurrence_params: string | null;
  next_occurrence_at: number | null;
  completed_at: number | null;
  last_completed_at: number | null;
  snoozed_until: number | null;
  source_nudge_id: string | null;
  prev_last_completed_at: number | null;
  sort_order: number | null;
  created_at: number;
  updated_at: number;
};

function mapRow(row: NudgeRow): Nudge {
  return {
    id: row.id,
    listId: row.list_id,
    title: row.title,
    note: row.note,
    dueAt: row.due_at,
    recurrenceType: row.recurrence_type,
    recurrenceParams: row.recurrence_params ? JSON.parse(row.recurrence_params) : null,
    nextOccurrenceAt: row.next_occurrence_at,
    completedAt: row.completed_at,
    lastCompletedAt: row.last_completed_at,
    snoozedUntil: row.snoozed_until,
    sourceNudgeId: row.source_nudge_id,
    rollbackLastCompletedAt: row.prev_last_completed_at,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getAllNudges(db: SQLiteDatabase): Promise<Nudge[]> {
  const rows = await db.getAllAsync<NudgeRow>('SELECT * FROM nudges ORDER BY created_at DESC');
  return rows.map(mapRow);
}

export type CreateNudgeInput = {
  listId: string;
  title: string;
  note?: string | null;
  dueAt?: number | null;
  recurrenceType?: RecurrenceType;
  recurrenceParams?: RecurrenceParams | null;
};

export async function createNudge(db: SQLiteDatabase, input: CreateNudgeInput): Promise<Nudge> {
  const id = Crypto.randomUUID();
  const now = Date.now();
  const recurrenceType = input.recurrenceType ?? 'none';
  const recurrenceParams = input.recurrenceParams ?? null;
  const dueAt = input.dueAt ?? null;

  await db.runAsync(
    `INSERT INTO nudges
       (id, list_id, title, note, due_at, recurrence_type, recurrence_params, next_occurrence_at, completed_at, last_completed_at, snoozed_until, source_nudge_id, prev_last_completed_at, sort_order, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, NULL, NULL, ?, ?)`,
    [
      id,
      input.listId,
      input.title,
      input.note ?? null,
      dueAt,
      recurrenceType,
      recurrenceParams ? JSON.stringify(recurrenceParams) : null,
      dueAt,
      now,
      now,
    ]
  );

  return {
    id,
    listId: input.listId,
    title: input.title,
    note: input.note ?? null,
    dueAt,
    recurrenceType,
    recurrenceParams,
    nextOccurrenceAt: dueAt,
    completedAt: null,
    lastCompletedAt: null,
    snoozedUntil: null,
    sourceNudgeId: null,
    rollbackLastCompletedAt: null,
    sortOrder: null,
    createdAt: now,
    updatedAt: now,
  };
}

export type UpdateNudgeInput = Partial<{
  title: string;
  note: string | null;
  dueAt: number | null;
  recurrenceType: RecurrenceType;
  recurrenceParams: RecurrenceParams | null;
  nextOccurrenceAt: number | null;
  lastCompletedAt: number | null;
  snoozedUntil: number | null;
}>;

const COLUMN_MAP: Record<string, string> = {
  title: 'title',
  note: 'note',
  dueAt: 'due_at',
  recurrenceType: 'recurrence_type',
  recurrenceParams: 'recurrence_params',
  nextOccurrenceAt: 'next_occurrence_at',
  lastCompletedAt: 'last_completed_at',
  snoozedUntil: 'snoozed_until',
};

export async function updateNudge(
  db: SQLiteDatabase,
  id: string,
  patch: UpdateNudgeInput
): Promise<void> {
  const fields: string[] = [];
  const values: (string | number | null)[] = [];

  for (const [key, column] of Object.entries(COLUMN_MAP)) {
    const value = (patch as Record<string, unknown>)[key];
    if (value === undefined) continue;
    fields.push(`${column} = ?`);
    values.push(
      key === 'recurrenceParams'
        ? value
          ? JSON.stringify(value)
          : null
        : (value as string | number | null)
    );
  }

  if (fields.length === 0) return;
  fields.push('updated_at = ?');
  values.push(Date.now());
  values.push(id);
  await db.runAsync(`UPDATE nudges SET ${fields.join(', ')} WHERE id = ?`, values);
}

export async function deleteNudge(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM nudges WHERE id = ? OR source_nudge_id = ?', [id, id]);
}

export async function deleteNudgesForList(db: SQLiteDatabase, listId: string): Promise<void> {
  await db.runAsync('DELETE FROM nudges WHERE list_id = ?', [listId]);
}

export type CompleteResult = { nudge: Nudge; copy: Nudge | null };

export async function completeNudge(db: SQLiteDatabase, id: string): Promise<CompleteResult> {
  const row = await db.getFirstAsync<NudgeRow>('SELECT * FROM nudges WHERE id = ?', [id]);
  if (!row) throw new Error(`Nudge ${id} not found`);
  const nudge = mapRow(row);
  const now = Date.now();

  await incrementCompletedCount(db);

  const { updatedNudge, copy } = computeCompletion(nudge, now);

  if (copy === null) {
    await db.runAsync(
      'UPDATE nudges SET completed_at = ?, last_completed_at = ?, updated_at = ? WHERE id = ?',
      [updatedNudge.completedAt ?? null, updatedNudge.lastCompletedAt ?? null, now, id]
    );
    return { nudge: { ...nudge, ...updatedNudge, updatedAt: now }, copy: null };
  }

  await db.runAsync(
    'UPDATE nudges SET next_occurrence_at = ?, snoozed_until = ?, last_completed_at = ?, updated_at = ? WHERE id = ?',
    [
      updatedNudge.nextOccurrenceAt ?? null,
      updatedNudge.snoozedUntil ?? null,
      updatedNudge.lastCompletedAt ?? null,
      now,
      id,
    ]
  );

  const copyId = Crypto.randomUUID();
  await db.runAsync(
    `INSERT INTO nudges
       (id, list_id, title, note, due_at, recurrence_type, recurrence_params, next_occurrence_at, completed_at, last_completed_at, snoozed_until, source_nudge_id, prev_last_completed_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      copyId,
      copy.listId,
      copy.title,
      copy.note,
      copy.dueAt,
      copy.recurrenceType,
      copy.recurrenceParams ? JSON.stringify(copy.recurrenceParams) : null,
      copy.nextOccurrenceAt,
      copy.completedAt,
      copy.lastCompletedAt,
      copy.snoozedUntil,
      copy.sourceNudgeId,
      copy.rollbackLastCompletedAt,
      now,
      now,
    ]
  );

  return {
    nudge: { ...nudge, ...updatedNudge, updatedAt: now },
    copy: { ...copy, id: copyId, createdAt: now, updatedAt: now },
  };
}

export type UncompleteResult =
  | { kind: 'reverted'; nudge: Nudge }
  | { kind: 'copyDeleted'; deletedId: string; sourceNudge: Nudge | null };

export async function uncompleteNudge(db: SQLiteDatabase, id: string): Promise<UncompleteResult> {
  const row = await db.getFirstAsync<NudgeRow>('SELECT * FROM nudges WHERE id = ?', [id]);
  if (!row) throw new Error(`Nudge ${id} not found`);
  const target = mapRow(row);
  if (target.completedAt === null) return { kind: 'reverted', nudge: target };

  let source: Nudge | null = null;
  if (target.sourceNudgeId !== null) {
    const sourceRow = await db.getFirstAsync<NudgeRow>('SELECT * FROM nudges WHERE id = ?', [
      target.sourceNudgeId,
    ]);
    source = sourceRow ? mapRow(sourceRow) : null;
  }

  const result = computeUncompletion(target, source);
  const now = Date.now();

  await decrementCompletedCount(db);

  if (result.kind === 'revert') {
    await db.runAsync(
      'UPDATE nudges SET completed_at = NULL, last_completed_at = NULL, updated_at = ? WHERE id = ?',
      [now, id]
    );
    return {
      kind: 'reverted',
      nudge: { ...target, completedAt: null, lastCompletedAt: null, updatedAt: now },
    };
  }

  await db.runAsync('DELETE FROM nudges WHERE id = ?', [result.deletedId]);

  if (result.sourceUpdate === null || source === null) {
    return { kind: 'copyDeleted', deletedId: result.deletedId, sourceNudge: null };
  }

  await db.runAsync(
    'UPDATE nudges SET next_occurrence_at = ?, last_completed_at = ?, updated_at = ? WHERE id = ?',
    [
      result.sourceUpdate.nextOccurrenceAt ?? null,
      result.sourceUpdate.lastCompletedAt ?? null,
      now,
      result.sourceUpdate.id,
    ]
  );

  return {
    kind: 'copyDeleted',
    deletedId: result.deletedId,
    sourceNudge: { ...source, ...result.sourceUpdate, updatedAt: now },
  };
}

export async function snoozeNudge(db: SQLiteDatabase, id: string, until: number): Promise<void> {
  await updateNudge(db, id, { snoozedUntil: until });
}

// Persists a drag-reordered section: every id gets its array index as its new
// sort_order, so the whole section switches from date-based to manual ordering.
export async function reorderNudges(db: SQLiteDatabase, orderedIds: string[]): Promise<void> {
  const now = Date.now();
  await Promise.all(
    orderedIds.map((id, index) =>
      db.runAsync('UPDATE nudges SET sort_order = ?, updated_at = ? WHERE id = ?', [
        index,
        now,
        id,
      ])
    )
  );
}
