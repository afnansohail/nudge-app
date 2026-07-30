import type { ListColorKey } from '@/theme/tokens';
import type { ListIconKey } from '@/constants/list-icons';

export type RecurrenceType = 'none' | 'daily' | 'weekly' | 'monthly' | 'every_n_days';

export type RecurrenceParams = {
  weekdays?: number[]; // 0=Sun..6=Sat, used when recurrenceType === 'weekly'
  dayOfMonth?: number; // 1-31, used when recurrenceType === 'monthly'
  intervalDays?: number; // used when recurrenceType === 'every_n_days'
};

export type ThemePreference = 'system' | 'light' | 'dark';

export type NudgeList = {
  id: string;
  name: string;
  icon: ListIconKey;
  color: ListColorKey;
  sortOrder: number;
  isDefault: boolean;
  createdAt: number;
};

export type Nudge = {
  id: string;
  listId: string;
  title: string;
  note: string | null;
  dueAt: number | null;
  recurrenceType: RecurrenceType;
  recurrenceParams: RecurrenceParams | null;
  nextOccurrenceAt: number | null;
  completedAt: number | null;
  lastCompletedAt: number | null;
  snoozedUntil: number | null;
  sourceNudgeId: string | null;
  rollbackLastCompletedAt: number | null;
  sortOrder: number | null;
  createdAt: number;
  updatedAt: number;
};

export type AppSettings = {
  themePreference: ThemePreference;
  completedCount: number;
  hideCompletedSection: boolean;
  defaultNudgeTime: string;
};
