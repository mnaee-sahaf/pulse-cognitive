import { create } from 'zustand';

interface AppSettingsStore {
  animatedBackground: boolean;
  setAnimatedBackground: (v: boolean) => void;
}

export const useAppSettings = create<AppSettingsStore>((set) => ({
  animatedBackground: false,
  setAnimatedBackground: (v) => set({ animatedBackground: v }),
}));
