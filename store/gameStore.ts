import { create } from 'zustand';
import {
  createInitialGameState,
  buildRound,
  processTap,
  completeRound,
  type GameState,
} from '../engine/gameStateMachine';
import type { PlayerProfile } from '../engine/adaptiveEngine';

interface GameStore extends GameState {
  // Actions
  startSession: (profile: PlayerProfile | null) => void;
  startWatch: () => void;
  setFlashIndex: (index: number) => void;
  startRecall: (watchEndTime: number) => void;
  handleTap: (cellIndex: number, tapTime: number) => void;
  advanceRound: () => void;
  resetSession: () => void;
  _watchEndTime: number;
}

export const useGameStore = create<GameStore>((set, get) => ({
  ...createInitialGameState(null),
  _watchEndTime: 0,

  startSession: (profile) => {
    const initial = createInitialGameState(profile);
    const firstRound = buildRound(initial);
    set({
      ...initial,
      phase: 'watch',
      round: firstRound,
      roundCount: 1,
    });
  },

  startWatch: () => {
    const state = get();
    if (state.phase === 'idle') return;
    set({ phase: 'watch', currentFlashIndex: -1 });
  },

  setFlashIndex: (index) => {
    set({ currentFlashIndex: index });
  },

  startRecall: (watchEndTime) => {
    set({ phase: 'recall', currentFlashIndex: -1, _watchEndTime: watchEndTime });
  },

  handleTap: (cellIndex, tapTime) => {
    const state = get();
    const watchEndTime = state._watchEndTime;
    const { nextState, sessionEnded } = processTap(state, cellIndex, tapTime, watchEndTime);
    set(nextState as Partial<GameStore>);

    if (!sessionEnded && nextState.phase === 'feedback') {
      // Auto-advance after brief feedback delay (handled in UI)
    }
  },

  advanceRound: () => {
    const state = get();
    if (state.phase !== 'feedback') return;

    const updates = completeRound(state);
    const merged = { ...state, ...updates };
    const nextRound = buildRound(merged as GameState);

    set({
      ...(updates as Partial<GameStore>),
      phase: 'watch',
      round: nextRound,
      roundCount: merged.roundCount + 1,
      currentFlashIndex: -1,
    });
  },

  resetSession: () => {
    set({ ...createInitialGameState(null), _watchEndTime: 0 });
  },
}));
