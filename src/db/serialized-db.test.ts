import { describe, it, expect } from 'vitest';
import type { SQLiteDatabase } from 'expo-sqlite';
import { getSerializedDb } from '@/db/serialized-db';

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
      runAsync: async (shouldFail: boolean) => {
        if (shouldFail) throw new Error('boom');
        return 'ok';
      },
    } as unknown as SQLiteDatabase;
    const serialized = getSerializedDb(db);

    await expect(serialized.runAsync(true)).rejects.toThrow('boom');
    await expect(serialized.runAsync(false)).resolves.toBe('ok');
  });
});
