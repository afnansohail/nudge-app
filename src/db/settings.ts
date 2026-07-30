import type { SQLiteDatabase } from 'expo-sqlite';
import type { AppSettings, ThemePreference } from '@/lib/types';

type SettingsRow = {
  theme_preference: ThemePreference;
  completed_count: number;
};

export async function getSettings(db: SQLiteDatabase): Promise<AppSettings> {
  const row = await db.getFirstAsync<SettingsRow>(
    'SELECT theme_preference, completed_count FROM settings WHERE id = 1'
  );
  return {
    themePreference: row?.theme_preference ?? 'system',
    completedCount: row?.completed_count ?? 0,
  };
}

export async function updateThemePreference(
  db: SQLiteDatabase,
  pref: ThemePreference
): Promise<void> {
  await db.runAsync('UPDATE settings SET theme_preference = ? WHERE id = 1', [pref]);
}

export async function incrementCompletedCount(db: SQLiteDatabase): Promise<number> {
  await db.runAsync('UPDATE settings SET completed_count = completed_count + 1 WHERE id = 1');
  const row = await db.getFirstAsync<{ completed_count: number }>(
    'SELECT completed_count FROM settings WHERE id = 1'
  );
  return row?.completed_count ?? 0;
}

export async function decrementCompletedCount(db: SQLiteDatabase): Promise<number> {
  await db.runAsync(
    'UPDATE settings SET completed_count = MAX(0, completed_count - 1) WHERE id = 1'
  );
  const row = await db.getFirstAsync<{ completed_count: number }>(
    'SELECT completed_count FROM settings WHERE id = 1'
  );
  return row?.completed_count ?? 0;
}
