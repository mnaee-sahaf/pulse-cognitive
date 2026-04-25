import { create } from 'zustand';
import {
  createInitialGameState,
  buildRound,
  processTap,
  completeRound,
  buildSummary,
  applyFailedRound,
  processHaltTap,
  processHaltTimeout,
  type GameState,
  type GameMode,
  type TapResult,
} from '../engine/gameStateMachine';
import { updateEngine } from '../engine/adaptiveEngine';
import type { PlayerProfile } from '../engine/adaptiveEngine';
import { ENGINE_CONFIG_DEFAULTS, HALT_ENGINE_OVERRIDES, type EngineConfig } from '../engine/engineConfig';
import { calcRoundScore } from '../engine/scoring';
import { log } from '../lib/devLog';

interface GameStore extends GameState {
  // Actions
  startSession: (profile: PlayerProfile | null, config?: EngineConfig, lives?: number, gameMode?: GameMode) => void;
  startWatch: () => void;
  setFlashIndex: (index: number) => void;
  startRecall: (watchEndTime: number) => void;
  handleTap: (cellIndex: number, tapTime: number) => void;
  handleWatchTap: (cellIndex: number, rt: number) => void;
  handleHaltTap: (cellIndex: number, rt: number) => void;
  handleHaltTimeout: () => void;
  advanceHaltTrial: () => void;
  finishEmberSequence: () => void;
  recoverFromError: () => void;
  advanceRound: () => void;
  endSession: () => void;
  tickTimer: () => number;
  resetSession: () => void;
  _watchEndTime: number;
  _haltLastCheckpointCorrect: number;
  _haltLastCheckpointTotal: number;
  haltLastTrialCorrect: boolean;
}

export const useGameStore = create<GameStore>((set, get) => ({
  ...createInitialGameState(null),
  _watchEndTime: 0,
  _haltLastCheckpointCorrect: 0,
  _haltLastCheckpointTotal: 0,
  haltLastTrialCorrect: false,

  startSession: (profile, config = ENGINE_CONFIG_DEFAULTS, lives = 3, gameMode = 'arc') => {
    log.store('startSession', { gameMode, lives, hasProfile: !!profile });
    const effectiveConfig = gameMode === 'halt'
      ? { ...config, ...HALT_ENGINE_OVERRIDES }
      : config;
    const initial = createInitialGameState(profile, effectiveConfig, lives, gameMode);
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
      sessionStartedAt: Date.now(),
      _haltLastCheckpointCorrect: 0,
      _haltLastCheckpointTotal: 0,
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
    if (sessionEnded) {
      log.tap('wrong tap → recover', { cellIndex });
      set(nextState as Partial<GameStore>);
      get().recoverFromError();
    } else {
      set(nextState as Partial<GameStore>);
    }
  },

  handleWatchTap: (cellIndex, rt) => {
    const state = get();
    if (state.gameMode !== 'ember' || state.phase !== 'watch' || !state.round) return;

    if (cellIndex === state.round.poisonCell) {
      log.tap('ember poison tap → recover', { cellIndex });
      get().recoverFromError();
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

  handleHaltTap: (cellIndex, rt) => {
    const state = get();
    if (state.gameMode !== 'halt' || state.phase !== 'watch' || !state.round) return;

    const { nextState, isError } = processHaltTap(state, cellIndex, rt);
    log.tap(`halt ${state.round.trialType} tap`, { cellIndex, rt: Math.round(rt), isError });

    const score = !isError ? calcRoundScore({
      sequenceLength: 1,
      tapRts: [rt],
      mutationActive: false,
      engineIntensity: state.engine.intensity,
      perfectStreak: state.perfectStreak,
    }) : 0;

    set({
      ...nextState,
      phase: 'feedback',
      haltLastTrialCorrect: !isError,
      totalScore: state.totalScore + score,
      perfectStreak: !isError ? state.perfectStreak + 1 : 0,
    } as Partial<GameStore>);
  },

  handleHaltTimeout: () => {
    const state = get();
    if (state.gameMode !== 'halt' || state.phase !== 'watch' || !state.round) return;

    const { nextState, isError } = processHaltTimeout(state);
    log.tap(`halt ${state.round.trialType} timeout`);

    const score = !isError ? 5 : 0;
    set({
      ...nextState,
      phase: 'feedback',
      haltLastTrialCorrect: !isError,
      totalScore: state.totalScore + score,
      perfectStreak: !isError ? state.perfectStreak + 1 : 0,
    } as Partial<GameStore>);
  },

  advanceHaltTrial: () => {
    const state = get();
    if (state.gameMode !== 'halt') return;

    let engine = state.engine;
    if (state.haltTrialCount > 0 && state.haltTrialCount % 5 === 0) {
      const windowCorrect = state.sessionCorrect - state._haltLastCheckpointCorrect;
      const windowTotal = state.sessionTotal - state._haltLastCheckpointTotal;

      const recentGoRts = state.haltGoRts.slice(-5);
      const windowAvgRt = recentGoRts.length > 0
        ? recentGoRts.reduce((s, v) => s + v, 0) / recentGoRts.length
        : 400;

      const roundPerf = {
        correct: windowCorrect,
        total: Math.max(1, windowTotal),
        avgRt: windowAvgRt,
        mutationSurvived: null as boolean | null,
      };
      engine = updateEngine(state.engine, roundPerf, state.roundCount);
    }

    const didCheckpoint = state.haltTrialCount > 0 && state.haltTrialCount % 5 === 0;

    const nextState: GameState = {
      ...state,
      engine,
      roundCount: state.roundCount + 1,
    };
    const nextRound = buildRound(nextState);

    log.phase(`halt trial ${state.haltTrialCount} → next`, {
      trialType: nextRound.trialType,
      flash: nextRound.flashDuration,
      ssd: state.haltSsd,
    });

    set({
      engine,
      phase: 'watch',
      round: nextRound,
      roundCount: state.roundCount + 1,
      currentFlashIndex: -1,
      tapResults: [],
      recallProgress: [],
      ...(didCheckpoint ? {
        _haltLastCheckpointCorrect: state.sessionCorrect,
        _haltLastCheckpointTotal: state.sessionTotal,
      } : {}),
    } as Partial<GameStore>);
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
      log.phase('ember sequence missed → recover', { hits, total, missCount });
      set({
        sessionCorrect: state.sessionCorrect + hits,
        sessionTotal: state.sessionTotal + total,
      });
      get().recoverFromError();
    }
  },

  recoverFromError: () => {
    const state = get();
    log.phase('recoverFromError', { round: state.roundCount });

    const { engine: failedEngine } = applyFailedRound(state);
    const flashRecoveryMax = Math.min(failedEngine.config.flashCeiling, 700);
    const recoveryEngine = {
      ...failedEngine,
      levers: {
        ...failedEngine.levers,
        sequenceGrowth: -2,
        mutationRate: 0,
      },
      currentFlashDuration: Math.min(
        flashRecoveryMax,
        failedEngine.currentFlashDuration + 60
      ),
      currentFlashGap: Math.min(
        failedEngine.config.flashGapCeiling,
        failedEngine.currentFlashGap + 30
      ),
    };
    const rebuiltState: GameState = {
      ...state,
      roundCount: state.roundCount + 1,
      engine: recoveryEngine,
      emberHits: 0,
    };
    const newRound = buildRound(rebuiltState);
    set({
      engine: {
        ...failedEngine,
        currentFlashDuration: recoveryEngine.currentFlashDuration,
        currentFlashGap: recoveryEngine.currentFlashGap,
      },
      roundCount: rebuiltState.roundCount,
      recallProgress: [],
      tapResults: [],
      phase: 'watch',
      round: newRound,
      emberHits: 0,
      perfectStreak: 0,
    });
  },

  advanceRound: () => {
    const state = get();
    if (state.phase !== 'feedback') return;

    // HALT mode uses its own trial advancement
    if (state.gameMode === 'halt') {
      get().advanceHaltTrial();
      return;
    }

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

  endSession: () => {
    const state = get();
    if (state.phase === 'ended' || state.phase === 'idle') return;
    const summary = buildSummary(state);
    log.phase('session timer ended', {
      rounds: summary.roundsCompleted,
      score: summary.totalScore,
      accuracy: Math.round(summary.accuracy * 100),
      avgRt: Math.round(summary.avgRt),
      intensity: Math.round(summary.engineIntensity * 100),
    });
    set({ phase: 'ended', summary });
  },

  tickTimer: () => {
    const state = get();
    if (state.phase === 'ended' || state.phase === 'idle' || state.sessionStartedAt === 0) {
      return state.sessionDuration;
    }
    const elapsed = Date.now() - state.sessionStartedAt;
    const remaining = Math.max(0, state.sessionDuration - elapsed);
    if (remaining <= 0) {
      get().endSession();
    }
    return remaining;
  },

  resetSession: () => {
    set({ ...createInitialGameState(null), _watchEndTime: 0, _haltLastCheckpointCorrect: 0, _haltLastCheckpointTotal: 0 });
  },
}));
