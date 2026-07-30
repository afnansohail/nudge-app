import type { SQLiteDatabase } from 'expo-sqlite';

// expo-sqlite does not serialize concurrent async calls against the same
// connection: per its own docs, overlapping write queries can "abort with
// `database is locked` error" (see SQLiteDatabase.withExclusiveTransactionAsync).
// This queues every *Async call on a given db instance so callers from
// different components/listeners (e.g. an AppState-triggered catch-up write
// racing a notification-response write) never run concurrently.
const serialized = new WeakMap<SQLiteDatabase, SQLiteDatabase>();

export function getSerializedDb(db: SQLiteDatabase): SQLiteDatabase {
  const existing = serialized.get(db);
  if (existing) return existing;

  let queue: Promise<unknown> = Promise.resolve();

  const proxy = new Proxy(db, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== 'function' || !prop.toString().endsWith('Async')) {
        return typeof value === 'function' ? value.bind(target) : value;
      }
      return (...args: unknown[]) => {
        const result = queue.then(() => value.apply(target, args));
        queue = result.then(
          () => undefined,
          () => undefined
        );
        return result;
      };
    },
  });

  serialized.set(db, proxy);
  return proxy;
}
