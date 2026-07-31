import type { SQLiteDatabase } from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import { LIST_ICON_KEYS, DEFAULT_LIST_ICON } from '@/constants/list-icons';
import { LIST_COLOR_KEYS } from '@/theme/tokens';
import type { ListColorKey } from '@/theme/tokens';
import type { Nudge, NudgeList } from '@/lib/types';
import {
  sanitizeImportPayload,
  type ExportPayload,
  type SanitizedList,
  type SanitizedNudge,
} from '@/lib/backup';

const DEFAULT_LIST_COLOR: ListColorKey = 'coral';

export type ImportResult = {
  lists: NudgeList[];
  nudges: Nudge[];
};

export function prepareImport(payload: ExportPayload) {
  return sanitizeImportPayload(
    payload,
    new Set(LIST_ICON_KEYS),
    new Set(LIST_COLOR_KEYS),
    DEFAULT_LIST_ICON,
    DEFAULT_LIST_COLOR
  );
}

async function insertImportedLists(
  db: SQLiteDatabase,
  sanitizedLists: SanitizedList[]
): Promise<{ lists: NudgeList[]; idMap: Map<string, string> }> {
  const countRow = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM lists');
  let sortOrder = countRow?.count ?? 0;

  const lists: NudgeList[] = [];
  const idMap = new Map<string, string>();

  for (const sanitized of sanitizedLists) {
    const id = Crypto.randomUUID();
    idMap.set(sanitized.originalId, id);

    await db.runAsync(
      'INSERT INTO lists (id, name, icon, color, sort_order, is_default, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)',
      [id, sanitized.name, sanitized.icon, sanitized.color, sortOrder, sanitized.createdAt]
    );

    lists.push({
      id,
      name: sanitized.name,
      icon: sanitized.icon,
      color: sanitized.color,
      sortOrder,
      isDefault: false,
      createdAt: sanitized.createdAt,
    });
    sortOrder += 1;
  }

  return { lists, idMap };
}

async function insertImportedNudges(
  db: SQLiteDatabase,
  sanitizedNudges: SanitizedNudge[],
  listIdMap: Map<string, string>
): Promise<Nudge[]> {
  const now = Date.now();
  const nudges: Nudge[] = [];

  for (const sanitized of sanitizedNudges) {
    const listId = listIdMap.get(sanitized.originalListId);
    if (!listId) continue;

    const id = Crypto.randomUUID();
    await db.runAsync(
      `INSERT INTO nudges
         (id, list_id, title, note, due_at, recurrence_type, recurrence_params, next_occurrence_at, completed_at, last_completed_at, snoozed_until, source_nudge_id, prev_last_completed_at, sort_order, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, NULL, NULL, NULL, NULL, ?, ?)`,
      [
        id,
        listId,
        sanitized.title,
        sanitized.note,
        sanitized.dueAt,
        sanitized.recurrenceType,
        sanitized.recurrenceParams ? JSON.stringify(sanitized.recurrenceParams) : null,
        sanitized.nextOccurrenceAt,
        sanitized.createdAt,
        now,
      ]
    );

    nudges.push({
      id,
      listId,
      title: sanitized.title,
      note: sanitized.note,
      dueAt: sanitized.dueAt,
      recurrenceType: sanitized.recurrenceType,
      recurrenceParams: sanitized.recurrenceParams,
      nextOccurrenceAt: sanitized.nextOccurrenceAt,
      completedAt: null,
      lastCompletedAt: null,
      snoozedUntil: null,
      sourceNudgeId: null,
      rollbackLastCompletedAt: null,
      sortOrder: null,
      createdAt: sanitized.createdAt,
      updatedAt: now,
    });
  }

  return nudges;
}

export async function importBackup(
  db: SQLiteDatabase,
  sanitized: { lists: SanitizedList[]; nudges: SanitizedNudge[] }
): Promise<ImportResult> {
  const { lists, idMap } = await insertImportedLists(db, sanitized.lists);
  const nudges = await insertImportedNudges(db, sanitized.nudges, idMap);
  return { lists, nudges };
}
