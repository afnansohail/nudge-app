import { create } from 'zustand';

type AppResetState = {
  generation: number;
  bump: () => void;
};

export const useAppResetStore = create<AppResetState>((set) => ({
  generation: 0,
  bump: () => set((s) => ({ generation: s.generation + 1 })),
}));
