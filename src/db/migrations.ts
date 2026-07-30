import type { SQLiteDatabase } from 'expo-sqlite';
import * as Crypto from 'expo-crypto';

export const DATABASE_NAME = 'nudge.db';
const CURRENT_VERSION = 4;

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

  if (version === 1) {
    // SQLite can't drop a column in place, so the nudges table is rebuilt
    // without `priority` (a removed feature) while keeping every other column.
    await db.execAsync(`
      CREATE TABLE nudges_new (
        id TEXT PRIMARY KEY NOT NULL,
        list_id TEXT NOT NULL REFERENCES lists(id),
        title TEXT NOT NULL,
        note TEXT,
        due_at INTEGER,
        recurrence_type TEXT NOT NULL DEFAULT 'none',
        recurrence_params TEXT,
        next_occurrence_at INTEGER,
        completed_at INTEGER,
        snoozed_until INTEGER,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      INSERT INTO nudges_new
        (id, list_id, title, note, due_at, recurrence_type, recurrence_params, next_occurrence_at, completed_at, snoozed_until, created_at, updated_at)
      SELECT id, list_id, title, note, due_at, recurrence_type, recurrence_params, next_occurrence_at, completed_at, snoozed_until, created_at, updated_at
      FROM nudges;

      DROP TABLE nudges;
      ALTER TABLE nudges_new RENAME TO nudges;

      ALTER TABLE settings ADD COLUMN hide_completed_section INTEGER NOT NULL DEFAULT 0;
      ALTER TABLE settings ADD COLUMN default_nudge_time TEXT NOT NULL DEFAULT '09:00';
    `);

    version = 2;
  }

  if (version === 2) {
    // Recurring nudges never set completed_at (they roll forward instead), so a
    // finished occurrence had no record anywhere — this tracks "done" per occurrence
    // without disturbing the recurrence-continues behavior.
    await db.execAsync(`
      ALTER TABLE nudges ADD COLUMN last_completed_at INTEGER;
    `);

    version = 3;
  }

  if (version === 3) {
    // Completing a recurring nudge now creates a standalone "completed occurrence"
    // copy row (recurrence_type 'none') instead of faking status off a single
    // timestamp. source_nudge_id links a copy back to the live nudge it came from;
    // prev_last_completed_at snapshots what the live nudge's last_completed_at was
    // right before this completion, so undoing the most recent copy can restore it.
    await db.execAsync(`
      ALTER TABLE nudges ADD COLUMN source_nudge_id TEXT REFERENCES nudges(id);
      ALTER TABLE nudges ADD COLUMN prev_last_completed_at INTEGER;
    `);

    version = 4;
  }

  await db.execAsync(`PRAGMA user_version = ${version}`);
}
