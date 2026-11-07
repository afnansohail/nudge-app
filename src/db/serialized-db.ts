import type { SQLiteDatabase } from 'expo-sqlite';

// expo-sqlite does not serialize concurrent async calls against the same
// connection: per its own docs, overlapping write queries can "abort with
// `database is locked` error" (see SQLiteDatabase.withExclusiveTransactionAsync).
// This queues every *Async call on a given db instance so callers from
// different components/listeners (e.g. an AppState-triggered catch-up write
// racing a notification-response write) never run concurrently.
const serialized = new WeakMap<SQLiteDatabase, SQLiteDatabase>();

type QueueEntry = {
  raw: SQLiteDatabase;
  enqueue: <T>(work: () => Promise<T>) => Promise<T>;
};
const queues = new WeakMap<SQLiteDatabase, QueueEntry>();

export function getSerializedDb(db: SQLiteDatabase): SQLiteDatabase {
  const existing = serialized.get(db);
  if (existing) return existing;

  let queue: Promise<unknown> = Promise.resolve();
  const enqueue = <T>(work: () => Promise<T>): Promise<T> => {
    const result = queue.then(work);
    queue = result.then(
      () => undefined,
      () => undefined
    );
    return result;
  };

  const proxy = new Proxy(db, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== 'function' || !prop.toString().endsWith('Async')) {
        return typeof value === 'function' ? value.bind(target) : value;
      }
      return (...args: unknown[]) => enqueue(() => value.apply(target, args));
    },
  });

  serialized.set(db, proxy);
  queues.set(proxy, { raw: db, enqueue });
  return proxy;
}

// Runs `task` in one SQLite transaction: all its writes commit together, or
// none do. The whole transaction is a single item in the serialized queue, so
// no other caller's query can run inside it.
//
// IMPORTANT: inside `task`, use only the `txDb` argument. A call on the
// serialized db from inside `task` waits for the transaction to end, and the
// transaction waits for that call, so it deadlocks.
export async function runInTransaction<T>(
  db: SQLiteDatabase,
  task: (txDb: SQLiteDatabase) => Promise<T>
): Promise<T> {
  const entry = queues.get(db);
  const raw = entry?.raw ?? db;
  const run = async () => {
    let result!: T;
    await raw.withTransactionAsync(async () => {
      result = await task(raw);
    });
    return result;
  };
  return entry ? entry.enqueue(run) : run();
}
