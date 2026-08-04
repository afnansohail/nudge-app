import { describe, it, expect } from 'vitest';
import type { SQLiteDatabase } from 'expo-sqlite';
import { claimNotificationAction } from '@/db/notification-action-log';

function makeFakeDb() {
  const claimed = new Set<string>();

  const runAsync = async (sql: string, params: unknown[] = []) => {
    if (sql.startsWith('DELETE')) return { changes: 0 };
    const [dedupeKey] = params as [string, number];
    if (claimed.has(dedupeKey)) return { changes: 0 };
    claimed.add(dedupeKey);
    return { changes: 1 };
  };

  return { runAsync } as unknown as SQLiteDatabase;
}

describe('claimNotificationAction', () => {
  it('claims a dedupe key the first time it is seen', async () => {
    const db = makeFakeDb();
    await expect(claimNotificationAction(db, 'nudge-1:mark-done:100')).resolves.toBe(true);
  });

  it('refuses to claim the same dedupe key twice', async () => {
    const db = makeFakeDb();
    await claimNotificationAction(db, 'nudge-1:mark-done:100');
    await expect(claimNotificationAction(db, 'nudge-1:mark-done:100')).resolves.toBe(false);
  });

  it('treats different actions on the same nudge as distinct keys', async () => {
    const db = makeFakeDb();
    await claimNotificationAction(db, 'nudge-1:mark-done:100');
    await expect(claimNotificationAction(db, 'nudge-1:snooze-1h:100')).resolves.toBe(true);
  });
});
