import { describe, expect, it, vi } from 'vitest';
import type { SQLiteDatabase } from 'expo-sqlite';

vi.mock('expo-crypto', () => ({ randomUUID: () => 'copy-id' }));

const { completeNudge, uncompleteNudge } = await import('@/db/nudges');
const { getSerializedDb } = await import('@/db/serialized-db');

function makeRow(recurrenceType: 'none' | 'daily', completedAt: number | null = null) {
  const day = 24 * 60 * 60 * 1000;
  return {
    id: 'nudge-1',
    list_id: 'list-1',
    title: 'Buy milk',
    note: null,
    due_at: Date.now() - day,
    recurrence_type: recurrenceType,
    recurrence_params: null,
    next_occurrence_at: recurrenceType === 'none' ? null : Date.now() - day,
    completed_at: completedAt,
    last_completed_at: completedAt,
    snoozed_until: null,
    source_nudge_id: null,
    prev_last_completed_at: null,
    sort_order: null,
    created_at: 1,
    updated_at: 1,
  };
}

// Records every statement, and whether it ran inside a transaction. A
// statement that matches `failOn` throws, like a real SQLite error.
function makeFakeDb(recurrenceType: 'none' | 'daily', failOn?: string, completedAt: number | null = null) {
  const log: string[] = [];
  let inTransaction = false;
  const record = (sql: string) => {
    log.push(`${inTransaction ? 'tx' : 'NO-TX'}: ${sql.trim().split(/\s+/).slice(0, 3).join(' ')}`);
    if (failOn && sql.includes(failOn)) throw new Error('disk I/O error');
  };
  const db = {
    getFirstAsync: async (sql: string) => {
      record(sql);
      return sql.includes('FROM nudges')
        ? makeRow(recurrenceType, completedAt)
        : { completed_count: 1 };
    },
    runAsync: async (sql: string) => {
      record(sql);
      return { changes: 1 };
    },
    withTransactionAsync: async (task: () => Promise<void>) => {
      inTransaction = true;
      log.push('BEGIN');
      try {
        await task();
        log.push('COMMIT');
      } catch (error) {
        log.push('ROLLBACK');
        throw error;
      } finally {
        inTransaction = false;
      }
    },
  } as unknown as SQLiteDatabase;
  return { db: getSerializedDb(db), log };
}

describe('completeNudge', () => {
  it('runs every write for a one-off nudge inside one transaction', async () => {
    const { db, log } = makeFakeDb('none');
    const result = await completeNudge(db, 'nudge-1');

    expect(result.copy).toBeNull();
    expect(log[0]).toBe('BEGIN');
    expect(log.at(-1)).toBe('COMMIT');
    expect(log.filter((entry) => entry.startsWith('NO-TX'))).toEqual([]);
    expect(log.some((entry) => entry.includes('UPDATE settings'))).toBe(true);
  });

  it('runs every write for a recurring nudge (including the copy) inside one transaction', async () => {
    const { db, log } = makeFakeDb('daily');
    const result = await completeNudge(db, 'nudge-1');

    expect(result.copy?.id).toBe('copy-id');
    expect(log.some((entry) => entry.includes('INSERT INTO nudges'))).toBe(true);
    expect(log.filter((entry) => entry.startsWith('NO-TX'))).toEqual([]);
    expect(log.at(-1)).toBe('COMMIT');
  });

  it('rolls back the completed-count increment when the nudge update fails', async () => {
    const { db, log } = makeFakeDb('none', 'UPDATE nudges');

    await expect(completeNudge(db, 'nudge-1')).rejects.toThrow('disk I/O error');
    expect(log.some((entry) => entry.includes('UPDATE settings'))).toBe(true);
    expect(log.at(-1)).toBe('ROLLBACK');
  });
});

describe('uncompleteNudge', () => {
  it('runs every write for a one-off nudge inside one transaction', async () => {
    const { db, log } = makeFakeDb('none', undefined, Date.now());
    const result = await uncompleteNudge(db, 'nudge-1');

    expect(result.kind).toBe('reverted');
    expect(log[0]).toBe('BEGIN');
    expect(log.at(-1)).toBe('COMMIT');
    expect(log.filter((entry) => entry.startsWith('NO-TX'))).toEqual([]);
    expect(log.some((entry) => entry.includes('UPDATE settings'))).toBe(true);
  });

  it('rolls back the completed-count decrement when the nudge update fails', async () => {
    const { db, log } = makeFakeDb('none', 'UPDATE nudges', Date.now());

    await expect(uncompleteNudge(db, 'nudge-1')).rejects.toThrow('disk I/O error');
    expect(log.some((entry) => entry.includes('UPDATE settings'))).toBe(true);
    expect(log.at(-1)).toBe('ROLLBACK');
  });
});
