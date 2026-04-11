import { create } from 'zustand';

interface AppSettingsStore {
  animatedBackground: boolean;
  backgroundIntensity: number;
  greenTileFeedback: boolean;
  hapticFeedback: boolean;
  setAnimatedBackground: (v: boolean) => void;
  setBackgroundIntensity: (v: number) => void;
  setGreenTileFeedback: (v: boolean) => void;
  setHapticFeedback: (v: boolean) => void;
}

export const useAppSettings = create<AppSettingsStore>((set) => ({
  animatedBackground: false,
  backgroundIntensity: 1,
  greenTileFeedback: true,
  hapticFeedback: true,
  setAnimatedBackground: (v) => set({ animatedBackground: v }),
  setBackgroundIntensity: (v) => set({ backgroundIntensity: v }),
  setGreenTileFeedback: (v) => set({ greenTileFeedback: v }),
  setHapticFeedback: (v) => set({ hapticFeedback: v }),
}));
