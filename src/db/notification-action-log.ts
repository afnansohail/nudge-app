import type { SQLiteDatabase } from 'expo-sqlite';

const MAX_ENTRY_AGE_MS = 7 * 24 * 60 * 60 * 1000;

export async function claimNotificationAction(
  db: SQLiteDatabase,
  dedupeKey: string
): Promise<boolean> {
  const now = Date.now();
  await db.runAsync('DELETE FROM notification_action_log WHERE created_at < ?', [
    now - MAX_ENTRY_AGE_MS,
  ]);
  const result = await db.runAsync(
    'INSERT OR IGNORE INTO notification_action_log (dedupe_key, created_at) VALUES (?, ?)',
    [dedupeKey, now]
  );
  return result.changes > 0;
}

// Undoes a claim when the action failed after it was claimed, so a retry (a
// second tap on the restored notification) is not blocked by the dedupe key.
export async function releaseNotificationAction(
  db: SQLiteDatabase,
  dedupeKey: string
): Promise<void> {
  await db.runAsync('DELETE FROM notification_action_log WHERE dedupe_key = ?', [dedupeKey]);
}
