import type { SQLiteDatabase } from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import type { Nudge, Priority, RecurrenceParams, RecurrenceType } from '@/lib/types';
import { computeNextOccurrence } from '@/lib/recurrence';
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
  priority: Priority;
  completed_at: number | null;
  snoozed_until: number | null;
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
    priority: row.priority,
    completedAt: row.completed_at,
    snoozedUntil: row.snoozed_until,
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
  priority?: Priority;
};

export async function createNudge(db: SQLiteDatabase, input: CreateNudgeInput): Promise<Nudge> {
  const id = Crypto.randomUUID();
  const now = Date.now();
  const recurrenceType = input.recurrenceType ?? 'none';
  const recurrenceParams = input.recurrenceParams ?? null;
  const dueAt = input.dueAt ?? null;
  const priority = input.priority ?? 'gentle';

  await db.runAsync(
    `INSERT INTO nudges
       (id, list_id, title, note, due_at, recurrence_type, recurrence_params, next_occurrence_at, priority, completed_at, snoozed_until, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, ?, ?)`,
    [
      id,
      input.listId,
      input.title,
      input.note ?? null,
      dueAt,
      recurrenceType,
      recurrenceParams ? JSON.stringify(recurrenceParams) : null,
      dueAt,
      priority,
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
    priority,
    completedAt: null,
    snoozedUntil: null,
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
  priority: Priority;
  nextOccurrenceAt: number | null;
  snoozedUntil: number | null;
}>;

const COLUMN_MAP: Record<string, string> = {
  title: 'title',
  note: 'note',
  dueAt: 'due_at',
  recurrenceType: 'recurrence_type',
  recurrenceParams: 'recurrence_params',
  priority: 'priority',
  nextOccurrenceAt: 'next_occurrence_at',
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
  await db.runAsync('DELETE FROM nudges WHERE id = ?', [id]);
}

export async function deleteNudgesForList(db: SQLiteDatabase, listId: string): Promise<void> {
  await db.runAsync('DELETE FROM nudges WHERE list_id = ?', [listId]);
}

export async function completeNudge(db: SQLiteDatabase, id: string): Promise<Nudge> {
  const row = await db.getFirstAsync<NudgeRow>('SELECT * FROM nudges WHERE id = ?', [id]);
  if (!row) throw new Error(`Nudge ${id} not found`);
  const nudge = mapRow(row);
  const completedAt = Date.now();

  await incrementCompletedCount(db);

  if (nudge.recurrenceType === 'none') {
    await db.runAsync('UPDATE nudges SET completed_at = ?, updated_at = ? WHERE id = ?', [
      completedAt,
      completedAt,
      id,
    ]);
    return { ...nudge, completedAt, updatedAt: completedAt };
  }

  const anchor = new Date(nudge.nextOccurrenceAt ?? nudge.dueAt ?? completedAt);
  const next = computeNextOccurrence(anchor, nudge.recurrenceType, nudge.recurrenceParams);
  const nextOccurrenceAt = next ? next.getTime() : null;
  await updateNudge(db, id, { nextOccurrenceAt, snoozedUntil: null });
  return { ...nudge, nextOccurrenceAt, snoozedUntil: null, updatedAt: Date.now() };
}

export async function uncompleteNudge(db: SQLiteDatabase, id: string): Promise<Nudge> {
  const row = await db.getFirstAsync<NudgeRow>('SELECT * FROM nudges WHERE id = ?', [id]);
  if (!row) throw new Error(`Nudge ${id} not found`);
  const nudge = mapRow(row);
  if (nudge.completedAt === null) return nudge;

  await decrementCompletedCount(db);
  const updatedAt = Date.now();
  await db.runAsync('UPDATE nudges SET completed_at = NULL, updated_at = ? WHERE id = ?', [
    updatedAt,
    id,
  ]);
  return { ...nudge, completedAt: null, updatedAt };
}

export async function snoozeNudge(db: SQLiteDatabase, id: string, until: number): Promise<void> {
  await updateNudge(db, id, { snoozedUntil: until });
}
