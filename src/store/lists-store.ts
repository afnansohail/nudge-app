import { create } from 'zustand';
import type { SQLiteDatabase } from 'expo-sqlite';
import type { NudgeList } from '@/lib/types';
import type { ListColorKey } from '@/theme/tokens';
import type { ListIconKey } from '@/constants/list-icons';
import * as listsDb from '@/db/lists';
import * as nudgesDb from '@/db/nudges';
import { cancelNudgeNotification } from '@/lib/notifications';
import { useNudgesStore } from '@/store/nudges-store';

type ListsState = {
  lists: NudgeList[];
  loaded: boolean;
  load: (db: SQLiteDatabase) => Promise<void>;
  create: (
    db: SQLiteDatabase,
    input: { name: string; icon: ListIconKey; color: ListColorKey }
  ) => Promise<NudgeList>;
  update: (
    db: SQLiteDatabase,
    id: string,
    patch: Partial<Pick<NudgeList, 'name' | 'icon' | 'color' | 'sortOrder'>>
  ) => Promise<void>;
  remove: (db: SQLiteDatabase, id: string) => Promise<void>;
  appendImported: (lists: NudgeList[]) => void;
  reset: () => void;
};

export const useListsStore = create<ListsState>((set, get) => ({
  lists: [],
  loaded: false,
  load: async (db) => {
    const lists = await listsDb.getAllLists(db);
    set({ lists, loaded: true });
  },
  reset: () => set({ lists: [], loaded: false }),
  create: async (db, input) => {
    const list = await listsDb.createList(db, input);
    set({ lists: [...get().lists, list] });
    return list;
  },
  update: async (db, id, patch) => {
    await listsDb.updateList(db, id, patch);
    set({ lists: get().lists.map((l) => (l.id === id ? { ...l, ...patch } : l)) });
  },
  remove: async (db, id) => {
    const nudgesToCancel = useNudgesStore.getState().nudges.filter((n) => n.listId === id);
    await Promise.all(nudgesToCancel.map((n) => cancelNudgeNotification(n)));
    await nudgesDb.deleteNudgesForList(db, id);
    await listsDb.deleteList(db, id);
    useNudgesStore.setState((s) => ({ nudges: s.nudges.filter((n) => n.listId !== id) }));
    set({ lists: get().lists.filter((l) => l.id !== id) });
  },
  appendImported: (lists) => set({ lists: [...get().lists, ...lists] }),
}));
