import type { SQLiteDatabase } from 'expo-sqlite';
import type { AppSettings, ThemePreference } from '@/lib/types';

type SettingsRow = {
  theme_preference: ThemePreference;
  completed_count: number;
  hide_completed_section: number;
  default_nudge_time: string;
  show_summary_cards: number;
};

export async function getSettings(db: SQLiteDatabase): Promise<AppSettings> {
  const row = await db.getFirstAsync<SettingsRow>(
    'SELECT theme_preference, completed_count, hide_completed_section, default_nudge_time, show_summary_cards FROM settings WHERE id = 1'
  );
  return {
    themePreference: row?.theme_preference ?? 'system',
    completedCount: row?.completed_count ?? 0,
    hideCompletedSection: row?.hide_completed_section === 1,
    defaultNudgeTime: row?.default_nudge_time ?? '09:00',
    showSummaryCards: row?.show_summary_cards !== 0,
  };
}

export async function updateThemePreference(
  db: SQLiteDatabase,
  pref: ThemePreference
): Promise<void> {
  await db.runAsync('UPDATE settings SET theme_preference = ? WHERE id = 1', [pref]);
}

export async function updateHideCompletedSection(
  db: SQLiteDatabase,
  hide: boolean
): Promise<void> {
  await db.runAsync('UPDATE settings SET hide_completed_section = ? WHERE id = 1', [hide ? 1 : 0]);
}

export async function updateDefaultNudgeTime(db: SQLiteDatabase, time: string): Promise<void> {
  await db.runAsync('UPDATE settings SET default_nudge_time = ? WHERE id = 1', [time]);
}

export async function updateShowSummaryCards(db: SQLiteDatabase, show: boolean): Promise<void> {
  await db.runAsync('UPDATE settings SET show_summary_cards = ? WHERE id = 1', [show ? 1 : 0]);
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
