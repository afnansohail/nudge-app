import type { SQLiteDatabase } from 'expo-sqlite';
import * as Crypto from 'expo-crypto';

export const DATABASE_NAME = 'nudge.db';
const CURRENT_VERSION = 1;

export async function migrateDbIfNeeded(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  let version = row?.user_version ?? 0;

  if (version >= CURRENT_VERSION) return;

  if (version === 0) {
    await db.execAsync(`
      CREATE TABLE lists (
        id TEXT PRIMARY KEY NOT NULL,
        name TEXT NOT NULL,
        icon TEXT NOT NULL,
        color TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0,
        is_default INTEGER NOT NULL DEFAULT 0,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE nudges (
        id TEXT PRIMARY KEY NOT NULL,
        list_id TEXT NOT NULL REFERENCES lists(id),
        title TEXT NOT NULL,
        note TEXT,
        due_at INTEGER,
        recurrence_type TEXT NOT NULL DEFAULT 'none',
        recurrence_params TEXT,
        next_occurrence_at INTEGER,
        priority TEXT NOT NULL DEFAULT 'gentle',
        completed_at INTEGER,
        snoozed_until INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE settings (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        theme_preference TEXT NOT NULL DEFAULT 'system',
        completed_count INTEGER NOT NULL DEFAULT 0
      );
    `);

    const defaultListId = Crypto.randomUUID();
    const now = Date.now();
    await db.runAsync(
      'INSERT INTO lists (id, name, icon, color, sort_order, is_default, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)',
      [defaultListId, 'My nudges', 'sparkles', 'coral', 0, now]
    );
    await db.runAsync(
      "INSERT INTO settings (id, theme_preference, completed_count) VALUES (1, 'system', 0)"
    );

    version = 1;
  }

  await db.execAsync(`PRAGMA user_version = ${version}`);
}
