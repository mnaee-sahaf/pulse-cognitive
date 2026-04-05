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
import { log } from '../lib/devLog';

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
    log.store('startSession', { gameMode, lives, hasProfile: !!profile });
    const initial = createInitialGameState(profile, config, lives, gameMode);
    const firstRound = buildRound(initial);
    log.phase('session started → watch', {
      seqLen: firstRound.displaySequence.length,
      flash: firstRound.flashDuration,
      grid: firstRound.gridSize,
      mutation: firstRound.mutation,
    });
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
      log.tap('wrong tap → loseLife', { cellIndex, lives: state.lives });
      get().loseLife();
    } else if (sessionEnded) {
      log.tap('wrong tap → session ended (last life)', { cellIndex });
      set(nextState as Partial<GameStore>);
    } else {
      set(nextState as Partial<GameStore>);
    }
  },

  handleWatchTap: (cellIndex, rt) => {
    const state = get();
    if (state.gameMode !== 'ember' || state.phase !== 'watch' || !state.round) return;

    if (cellIndex === state.round.poisonCell) {
      log.tap('ember poison tap → loseLife', { cellIndex, lives: state.lives });
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
    const hits = state.emberHits;
    const allHit = hits >= total;

    if (allHit) {
      log.phase('ember sequence complete → feedback', { hits, total });
      // Count all hits as correct for accuracy tracking
      set({
        phase: 'feedback',
        sessionCorrect: state.sessionCorrect + hits,
        sessionTotal: state.sessionTotal + total,
      });
    } else {
      const missCount = total - hits;
      log.phase('ember sequence missed → loseLife', { hits, total, missCount, lives: state.lives });
      // Count hits as correct, total sequence as attempted
      set({
        sessionCorrect: state.sessionCorrect + hits,
        sessionTotal: state.sessionTotal + total,
      });
      get().loseLife();
    }
  },

  loseLife: () => {
    const state = get();
    log.phase(`loseLife — ${state.lives - 1} remaining`, { lives: state.lives, round: state.roundCount });
    if (state.lives > 1) {
      // Record the failed round so the engine learns from it (mutationSurvived: false,
      // reduced accuracy) before building the recovery round.
      const { engine: failedEngine } = applyFailedRound(state);
      // Recovery: shrink sequence by 2, slow flash by 60ms, widen gap by 30ms,
      // and disable mutations. This gives real cognitive relief, not just a retry
      // at the same difficulty with a different sequence.
      const recoveryEngine = {
        ...failedEngine,
        levers: {
          ...failedEngine.levers,
          sequenceGrowth: -2,
          mutationRate: 0,
        },
        currentFlashDuration: Math.min(
          failedEngine.config.flashCeiling,
          failedEngine.currentFlashDuration + 60
        ),
        currentFlashGap: Math.min(
          failedEngine.config.flashGapCeiling,
          failedEngine.currentFlashGap + 30
        ),
      };
      const rebuiltState: GameState = {
        ...state,
        roundCount: state.roundCount + 1,  // ensure round.round changes so watch effect retriggers
        engine: recoveryEngine,
        emberHits: 0,
      };
      const newRound = buildRound(rebuiltState);
      set({
        engine: {
          ...failedEngine,
          // Persist the slowed flash/gap so the next adaptive round starts from the
          // recovery baseline, not the pre-failure difficulty
          currentFlashDuration: recoveryEngine.currentFlashDuration,
          currentFlashGap: recoveryEngine.currentFlashGap,
        },
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
      const summary = buildSummary(state);
      log.phase('session ended', {
        rounds: summary.roundsCompleted,
        score: summary.totalScore,
        accuracy: Math.round(summary.accuracy * 100),
        avgRt: Math.round(summary.avgRt),
        intensity: Math.round(summary.engineIntensity * 100),
        maxSeq: summary.maxSequenceLength,
      });
      set({ phase: 'ended', lives: 0, summary });
    }
  },

  advanceRound: () => {
    const state = get();
    if (state.phase !== 'feedback') return;

    const updates = completeRound(state);
    const merged = { ...state, ...updates };
    const nextRound = buildRound(merged as GameState);

    log.phase(`R${merged.roundCount} → watch`, {
      seqLen: nextRound.displaySequence.length,
      flash: nextRound.flashDuration,
      gap: nextRound.flashGap,
      grid: nextRound.gridSize,
      mutation: nextRound.mutation,
      score: merged.totalScore,
      streak: (merged as GameState).perfectStreak,
    });

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
