import { create } from 'zustand';
import {
  createInitialGameState,
  buildRound,
  processTap,
  completeRound,
  buildSummary,
  applyFailedRound,
  type GameState,
  type GameMode,
  type TapResult,
} from '../engine/gameStateMachine';
import type { PlayerProfile } from '../engine/adaptiveEngine';
import { ENGINE_CONFIG_DEFAULTS, type EngineConfig } from '../engine/engineConfig';

interface GameStore extends GameState {
  // Actions
  startSession: (profile: PlayerProfile | null, config?: EngineConfig, lives?: number, gameMode?: GameMode) => void;
  startWatch: () => void;
  setFlashIndex: (index: number) => void;
  startRecall: (watchEndTime: number) => void;
  handleTap: (cellIndex: number, tapTime: number) => void;
  handleWatchTap: (cellIndex: number, rt: number) => void;
  finishEmberSequence: () => void;
  loseLife: () => void;
  advanceRound: () => void;
  resetSession: () => void;
  _watchEndTime: number;
}

export const useGameStore = create<GameStore>((set, get) => ({
  ...createInitialGameState(null),
  _watchEndTime: 0,

  startSession: (profile, config = ENGINE_CONFIG_DEFAULTS, lives = 3, gameMode = 'arc') => {
    const initial = createInitialGameState(profile, config, lives, gameMode);
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
      get().loseLife();
    } else {
      set(nextState as Partial<GameStore>);
    }
  },

  handleWatchTap: (cellIndex, rt) => {
    const state = get();
    if (state.gameMode !== 'ember' || state.phase !== 'watch' || !state.round) return;

    if (cellIndex === state.round.poisonCell) {
      get().loseLife();
      return;
    }
    // Hit validation (correct cell, within grace window) is done in game.tsx
    // before this is called — just record the hit here.
    const hit: TapResult = { cellIndex, rt, correct: true, isPoisonTap: false };
    set({
      tapResults: [...state.tapResults, hit],
      sessionRts: [...state.sessionRts, rt],
      emberHits: state.emberHits + 1,
    });
  },

  finishEmberSequence: () => {
    const state = get();
    if (!state.round) return;
    const total = state.round.displaySequence.length;
    const allHit = state.emberHits >= total;

    if (allHit) {
      // All intercepted — advanceRound (feedback phase) handles scoring via tapResults
      set({ phase: 'feedback' });
    } else {
      // Missed some — add miss totals for accuracy tracking, then lose a life
      const missCount = total - state.emberHits;
      set({ sessionTotal: state.sessionTotal + missCount });
      get().loseLife();
    }
  },

  loseLife: () => {
    const state = get();
    if (state.lives > 1) {
      // Record the failed round so the engine learns from it (mutationSurvived: false,
      // reduced accuracy) before building the recovery round.
      const { engine: failedEngine } = applyFailedRound(state);
      // Suppress sequence growth for this recovery round only.
      const recoveryEngine = {
        ...failedEngine,
        levers: { ...failedEngine.levers, sequenceGrowth: 0 },
      };
      const rebuiltState: GameState = {
        ...state,
        roundCount: state.roundCount + 1,  // ensure round.round changes so watch effect retriggers
        engine: recoveryEngine,
        emberHits: 0,
      };
      const newRound = buildRound(rebuiltState);
      set({
        engine: failedEngine,  // persist adaptive levers without the sequenceGrowth: 0 override
        lives: state.lives - 1,
        roundCount: rebuiltState.roundCount,
        recallProgress: [],
        tapResults: [],
        phase: 'watch',
        round: newRound,
        emberHits: 0,
        perfectStreak: 0,
      });
    } else {
      set({ phase: 'ended', lives: 0, summary: buildSummary(state) });
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
      roundCount: merged.roundCount,
      currentFlashIndex: -1,
      emberHits: 0,
    });
  },

  resetSession: () => {
    set({ ...createInitialGameState(null), _watchEndTime: 0 });
  },
}));
