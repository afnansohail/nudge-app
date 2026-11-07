import { describe, it, expect } from 'vitest';
import type { SQLiteDatabase } from 'expo-sqlite';
import { getSerializedDb, runInTransaction } from '@/db/serialized-db';

function makeFakeDb() {
  let inFlight = 0;
  let maxConcurrent = 0;
  const order: string[] = [];

  const runAsync = async (label: string) => {
    inFlight += 1;
    maxConcurrent = Math.max(maxConcurrent, inFlight);
    await new Promise((resolve) => setTimeout(resolve, 5));
    order.push(label);
    inFlight -= 1;
  };

  const db = { runAsync } as unknown as SQLiteDatabase;
  return { db, order, getMaxConcurrent: () => maxConcurrent };
}

describe('getSerializedDb', () => {
  it('runs overlapping *Async calls one at a time, in call order', async () => {
    const { db, order, getMaxConcurrent } = makeFakeDb();
    const serialized = getSerializedDb(db);

    await Promise.all([
      serialized.runAsync('first'),
      serialized.runAsync('second'),
      serialized.runAsync('third'),
    ]);

    expect(getMaxConcurrent()).toBe(1);
    expect(order).toEqual(['first', 'second', 'third']);
  });

  it('returns the same proxy for the same db instance', () => {
    const { db } = makeFakeDb();
    expect(getSerializedDb(db)).toBe(getSerializedDb(db));
  });

  it('continues serializing later calls after an earlier one rejects', async () => {
    const db = {
      runAsync: async (sql: string) => {
        if (sql === 'fail') throw new Error('boom');
        return 'ok';
      },
    } as unknown as SQLiteDatabase;
    const serialized = getSerializedDb(db);

    await expect(serialized.runAsync('fail')).rejects.toThrow('boom');
    await expect(serialized.runAsync('succeed')).resolves.toBe('ok');
  });
});

function makeFakeTxnDb() {
  const log: string[] = [];
  const db = {
    runAsync: async (sql: string) => {
      await new Promise((resolve) => setTimeout(resolve, 2));
      log.push(sql);
      if (sql === 'fail') throw new Error('boom');
    },
    withTransactionAsync: async (task: () => Promise<void>) => {
      log.push('BEGIN');
      try {
        await task();
        log.push('COMMIT');
      } catch (error) {
        log.push('ROLLBACK');
        throw error;
      }
    },
  } as unknown as SQLiteDatabase;
  return { db, log };
}

describe('runInTransaction', () => {
  it('runs the task in a transaction on the raw db without deadlocking the queue', async () => {
    const { db, log } = makeFakeTxnDb();
    const serialized = getSerializedDb(db);

    const result = await runInTransaction(serialized, async (txDb) => {
      expect(txDb).toBe(db);
      await txDb.runAsync('a');
      await txDb.runAsync('b');
      return 42;
    });

    expect(result).toBe(42);
    expect(log).toEqual(['BEGIN', 'a', 'b', 'COMMIT']);
  });

  it('keeps other queued calls out of the open transaction', async () => {
    const { db, log } = makeFakeTxnDb();
    const serialized = getSerializedDb(db);

    await Promise.all([
      runInTransaction(serialized, async (txDb) => {
        await txDb.runAsync('a');
        await txDb.runAsync('b');
      }),
      serialized.runAsync('outside'),
    ]);

    expect(log).toEqual(['BEGIN', 'a', 'b', 'COMMIT', 'outside']);
  });

  it('rolls back, rethrows, and keeps the queue working after a failure', async () => {
    const { db, log } = makeFakeTxnDb();
    const serialized = getSerializedDb(db);

    await expect(
      runInTransaction(serialized, async (txDb) => {
        await txDb.runAsync('a');
        await txDb.runAsync('fail');
      })
    ).rejects.toThrow('boom');
    await serialized.runAsync('after');

    expect(log).toEqual(['BEGIN', 'a', 'fail', 'ROLLBACK', 'after']);
  });

  it('works on a db that is not serialized', async () => {
    const { db, log } = makeFakeTxnDb();
    await runInTransaction(db, async (txDb) => {
      await txDb.runAsync('a');
    });
    expect(log).toEqual(['BEGIN', 'a', 'COMMIT']);
  });
});
