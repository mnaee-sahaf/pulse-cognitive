import { create } from 'zustand';

interface AppSettingsStore {
  animatedBackground: boolean;
  backgroundIntensity: number;
  setAnimatedBackground: (v: boolean) => void;
  setBackgroundIntensity: (v: number) => void;
}

export const useAppSettings = create<AppSettingsStore>((set) => ({
  animatedBackground: false,
  backgroundIntensity: 1,
  setAnimatedBackground: (v) => set({ animatedBackground: v }),
  setBackgroundIntensity: (v) => set({ backgroundIntensity: v }),
}));
