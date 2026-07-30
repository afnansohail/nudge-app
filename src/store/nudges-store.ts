import { create } from 'zustand';
import type { SQLiteDatabase } from 'expo-sqlite';
import type { Nudge, NudgeList } from '@/lib/types';
import * as nudgesDb from '@/db/nudges';
import { cancelNudgeNotification, scheduleNudgeNotification } from '@/lib/notifications';
import { catchUpOccurrence } from '@/lib/recurrence';

type NudgesState = {
  nudges: Nudge[];
  loaded: boolean;
  load: (db: SQLiteDatabase) => Promise<void>;
  create: (
    db: SQLiteDatabase,
    list: NudgeList,
    input: nudgesDb.CreateNudgeInput
  ) => Promise<Nudge>;
  update: (
    db: SQLiteDatabase,
    list: NudgeList,
    id: string,
    patch: nudgesDb.UpdateNudgeInput
  ) => Promise<void>;
  remove: (db: SQLiteDatabase, id: string) => Promise<void>;
  complete: (db: SQLiteDatabase, list: NudgeList, id: string) => Promise<void>;
  uncomplete: (db: SQLiteDatabase, list: NudgeList, id: string) => Promise<void>;
  snooze: (db: SQLiteDatabase, list: NudgeList, id: string, until: number) => Promise<void>;
  reorder: (db: SQLiteDatabase, orderedIds: string[]) => Promise<void>;
  catchUpLapsed: (db: SQLiteDatabase, lists: NudgeList[]) => Promise<void>;
  reset: () => void;
};

export const useNudgesStore = create<NudgesState>((set, get) => ({
  nudges: [],
  loaded: false,
  load: async (db) => {
    const nudges = await nudgesDb.getAllNudges(db);
    set({ nudges, loaded: true });
  },
  reset: () => set({ nudges: [], loaded: false }),
  create: async (db, list, input) => {
    const nudge = await nudgesDb.createNudge(db, input);
    await scheduleNudgeNotification(nudge, list);
    set({ nudges: [nudge, ...get().nudges] });
    return nudge;
  },
  update: async (db, list, id, patch) => {
    await nudgesDb.updateNudge(db, id, patch);
    const updated = get().nudges.map((n) =>
      n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n
    );
    set({ nudges: updated });
    const nudge = updated.find((n) => n.id === id);
    if (nudge) await scheduleNudgeNotification(nudge, list);
  },
  remove: async (db, id) => {
    const nudge = get().nudges.find((n) => n.id === id);
    if (nudge) await cancelNudgeNotification(nudge);
    await nudgesDb.deleteNudge(db, id);
    set({ nudges: get().nudges.filter((n) => n.id !== id) });
  },
  complete: async (db, list, id) => {
    const { nudge, copy } = await nudgesDb.completeNudge(db, id);
    const nudges = get().nudges.map((n) => (n.id === id ? nudge : n));
    set({ nudges: copy ? [copy, ...nudges] : nudges });
    await scheduleNudgeNotification(nudge, list);
  },
  uncomplete: async (db, list, id) => {
    const result = await nudgesDb.uncompleteNudge(db, id);
    if (result.kind === 'reverted') {
      set({ nudges: get().nudges.map((n) => (n.id === id ? result.nudge : n)) });
      await scheduleNudgeNotification(result.nudge, list);
      return;
    }
    const sourceNudge = result.sourceNudge;
    set({
      nudges: get()
        .nudges.filter((n) => n.id !== result.deletedId)
        .map((n) => (sourceNudge && n.id === sourceNudge.id ? sourceNudge : n)),
    });
    if (sourceNudge) await scheduleNudgeNotification(sourceNudge, list);
  },
  snooze: async (db, list, id, until) => {
    await nudgesDb.snoozeNudge(db, id, until);
    const updated = get().nudges.map((n) => (n.id === id ? { ...n, snoozedUntil: until } : n));
    set({ nudges: updated });
    const nudge = updated.find((n) => n.id === id);
    if (nudge) await scheduleNudgeNotification(nudge, list);
  },
  reorder: async (db, orderedIds) => {
    await nudgesDb.reorderNudges(db, orderedIds);
    const now = Date.now();
    const sortOrderById = new Map(orderedIds.map((id, index) => [id, index]));
    set({
      nudges: get().nudges.map((n) => {
        const sortOrder = sortOrderById.get(n.id);
        return sortOrder === undefined ? n : { ...n, sortOrder, updatedAt: now };
      }),
    });
  },
  catchUpLapsed: async (db, lists) => {
    const now = Date.now();
    const listById = new Map(lists.map((l) => [l.id, l]));
    const lapsed = get().nudges.filter(
      (n) =>
        n.completedAt === null &&
        n.recurrenceType !== 'none' &&
        n.nextOccurrenceAt !== null &&
        n.nextOccurrenceAt < now
    );
    if (lapsed.length === 0) return;

    const caughtUp = lapsed
      .map((n) => ({
        nudge: n,
        nextOccurrenceAt: catchUpOccurrence(n.nextOccurrenceAt as number, n.recurrenceType, n.recurrenceParams, now),
      }))
      .filter((entry) => entry.nextOccurrenceAt !== entry.nudge.nextOccurrenceAt);
    if (caughtUp.length === 0) return;

    await Promise.all(
      caughtUp.map((entry) =>
        nudgesDb.updateNudge(db, entry.nudge.id, {
          nextOccurrenceAt: entry.nextOccurrenceAt,
          snoozedUntil: null,
        })
      )
    );

    const byId = new Map(caughtUp.map((entry) => [entry.nudge.id, entry.nextOccurrenceAt]));
    const updatedNudges = get().nudges.map((n) => {
      const nextOccurrenceAt = byId.get(n.id);
      return nextOccurrenceAt === undefined ? n : { ...n, nextOccurrenceAt, snoozedUntil: null };
    });
    set({ nudges: updatedNudges });

    await Promise.all(
      caughtUp.map((entry) => {
        const updatedNudge = updatedNudges.find((n) => n.id === entry.nudge.id);
        const list = listById.get(entry.nudge.listId);
        return updatedNudge && list ? scheduleNudgeNotification(updatedNudge, list) : null;
      })
    );
  },
}));
