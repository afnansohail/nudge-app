import { create } from 'zustand';
import type { SQLiteDatabase } from 'expo-sqlite';
import type { AppSettings, ThemePreference } from '@/lib/types';
import * as settingsDb from '@/db/settings';

type SettingsState = {
  settings: AppSettings;
  loaded: boolean;
  load: (db: SQLiteDatabase) => Promise<void>;
  setThemePreference: (db: SQLiteDatabase, pref: ThemePreference) => Promise<void>;
  setHideCompletedSection: (db: SQLiteDatabase, hide: boolean) => Promise<void>;
  setDefaultNudgeTime: (db: SQLiteDatabase, time: string) => Promise<void>;
  reset: () => void;
};

const DEFAULT_SETTINGS: AppSettings = {
  themePreference: 'system',
  completedCount: 0,
  hideCompletedSection: false,
  defaultNudgeTime: '09:00',
};

export const useSettingsStore = create<SettingsState>((set) => ({
  settings: DEFAULT_SETTINGS,
  loaded: false,
  load: async (db) => {
    const settings = await settingsDb.getSettings(db);
    set({ settings, loaded: true });
  },
  reset: () => set({ settings: DEFAULT_SETTINGS, loaded: false }),
  setThemePreference: async (db, pref) => {
    await settingsDb.updateThemePreference(db, pref);
    set((state) => ({ settings: { ...state.settings, themePreference: pref } }));
  },
  setHideCompletedSection: async (db, hide) => {
    await settingsDb.updateHideCompletedSection(db, hide);
    set((state) => ({ settings: { ...state.settings, hideCompletedSection: hide } }));
  },
  setDefaultNudgeTime: async (db, time) => {
    await settingsDb.updateDefaultNudgeTime(db, time);
    set((state) => ({ settings: { ...state.settings, defaultNudgeTime: time } }));
  },
}));
