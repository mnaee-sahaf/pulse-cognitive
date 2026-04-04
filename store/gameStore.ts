import { create } from 'zustand';
import {
  createInitialGameState,
  buildRound,
  processTap,
  completeRound,
  type GameState,
} from '../engine/gameStateMachine';
import type { PlayerProfile } from '../engine/adaptiveEngine';
import { ENGINE_CONFIG_DEFAULTS, type EngineConfig } from '../engine/engineConfig';

interface GameStore extends GameState {
  // Actions
  startSession: (profile: PlayerProfile | null, config?: EngineConfig) => void;
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

  startSession: (profile, config = ENGINE_CONFIG_DEFAULTS) => {
    const initial = createInitialGameState(profile, config);
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
    const { nextState, sessionEnded } = processTap(state, cellIndex, tapTime, state._watchEndTime);

    if (sessionEnded && state.lives > 1) {
      // Life lost — rebuild round at the same sequence length (sequenceGrowth = 0)
      const rebuiltState: GameState = {
        ...state,
        engine: { ...state.engine, levers: { ...state.engine.levers, sequenceGrowth: 0 } },
      };
      const newRound = buildRound(rebuiltState);
      set({
        lives: state.lives - 1,
        recallProgress: [],
        tapResults: [],
        phase: 'watch',
        round: newRound,
      });
    } else {
      set(nextState as Partial<GameStore>);
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
