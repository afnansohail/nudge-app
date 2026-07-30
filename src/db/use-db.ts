import { useSQLiteContext, type SQLiteDatabase } from 'expo-sqlite';
import { getSerializedDb } from '@/db/serialized-db';

export function useDb(): SQLiteDatabase {
  return getSerializedDb(useSQLiteContext());
}
