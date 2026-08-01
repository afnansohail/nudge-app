import type { SQLiteDatabase } from 'expo-sqlite';
import * as Crypto from 'expo-crypto';
import type { NudgeList } from '@/lib/types';
import type { ListColorKey } from '@/theme/tokens';
import type { ListIconKey } from '@/constants/list-icons';

type ListRow = {
  id: string;
  name: string;
  icon: string;
  color: string;
  sort_order: number;
  is_default: number;
  created_at: number;
};

function mapRow(row: ListRow): NudgeList {
  return {
    id: row.id,
    name: row.name,
    icon: row.icon as ListIconKey,
    color: row.color as ListColorKey,
    sortOrder: row.sort_order,
    isDefault: row.is_default === 1,
    createdAt: row.created_at,
  };
}

export async function getAllLists(db: SQLiteDatabase): Promise<NudgeList[]> {
  const rows = await db.getAllAsync<ListRow>(
    'SELECT * FROM lists ORDER BY sort_order ASC, created_at ASC'
  );
  return rows.map(mapRow);
}

export async function createList(
  db: SQLiteDatabase,
  input: { name: string; icon: ListIconKey; color: ListColorKey }
): Promise<NudgeList> {
  const id = Crypto.randomUUID();
  const now = Date.now();
  const countRow = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) as count FROM lists');
  const sortOrder = countRow?.count ?? 0;
  await db.runAsync(
    'INSERT INTO lists (id, name, icon, color, sort_order, is_default, created_at) VALUES (?, ?, ?, ?, ?, 0, ?)',
    [id, input.name, input.icon, input.color, sortOrder, now]
  );
  return {
    id,
    name: input.name,
    icon: input.icon,
    color: input.color,
    sortOrder,
    isDefault: false,
    createdAt: now,
  };
}

export async function updateList(
  db: SQLiteDatabase,
  id: string,
  patch: Partial<Pick<NudgeList, 'name' | 'icon' | 'color' | 'sortOrder'>>
): Promise<void> {
  const fields: string[] = [];
  const values: (string | number)[] = [];
  if (patch.name !== undefined) {
    fields.push('name = ?');
    values.push(patch.name);
  }
  if (patch.icon !== undefined) {
    fields.push('icon = ?');
    values.push(patch.icon);
  }
  if (patch.color !== undefined) {
    fields.push('color = ?');
    values.push(patch.color);
  }
  if (patch.sortOrder !== undefined) {
    fields.push('sort_order = ?');
    values.push(patch.sortOrder);
  }
  if (fields.length === 0) return;
  values.push(id);
  await db.runAsync(`UPDATE lists SET ${fields.join(', ')} WHERE id = ?`, values);
}

export async function deleteList(db: SQLiteDatabase, id: string): Promise<void> {
  const list = await db.getFirstAsync<ListRow>('SELECT * FROM lists WHERE id = ?', [id]);
  if (list?.is_default === 1) {
    throw new Error('Cannot delete the default list');
  }
  await db.runAsync('DELETE FROM lists WHERE id = ?', [id]);
}

export async function reorderLists(db: SQLiteDatabase, orderedIds: string[]): Promise<void> {
  await Promise.all(
    orderedIds.map((id, index) =>
      db.runAsync('UPDATE lists SET sort_order = ? WHERE id = ?', [index, id])
    )
  );
}
