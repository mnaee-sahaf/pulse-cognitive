import {
  generateSequence,
  generatePoisonCell,
  getExpectedRecallSequence,
  type GridSize,
  type Mutation,
} from './sequenceGenerator';
import {
  initEngine,
  updateEngine,
  selectMutation,
  type EngineState,
  type PlayerProfile,
  type RoundPerformance,
} from './adaptiveEngine';
import { ENGINE_CONFIG_DEFAULTS, type EngineConfig } from './engineConfig';

/** Each companion trains a different cognitive mode. */
export type GameMode = 'arc' | 'tide' | 'ember' | 'halt';
import { calcRoundScore, calcCognitiveScores, type CognitiveScores } from './scoring';

export type GamePhase = 'idle' | 'watch' | 'recall' | 'feedback' | 'ended';

/** HALT mode trial types */
export type HaltTrialType = 'go' | 'nogo' | 'stop';

export interface RoundState {
  round: number;
  displaySequence: number[];
  expectedSequence: number[];
  mutation: Mutation;
  poisonCell: number | null;
  flashDuration: number; // ms per cell illumination
  flashGap: number;      // ms between cell flashes
  gridSize: GridSize;
  // HALT mode fields
  trialType?: HaltTrialType;
  stopSignalDelay?: number;
  responseWindow?: number;
}

export interface TapResult {
  cellIndex: number;
  rt: number;
  correct: boolean;
  isPoisonTap: boolean;
}

export interface SessionSummary {
  totalScore: number;
  roundsCompleted: number;
  maxSequenceLength: number;
  allRts: number[];
  avgRt: number;
  bestRt: number;
  accuracy: number;
  mutationsFaced: string[];
  mutationsSurvived: number;
  engineIntensity: number;
  cognitiveScores: CognitiveScores;
  bestStreak: number;
  // HALT mode metrics
  haltCommissionErrors: number;
  haltOmissionErrors: number;
  haltSsrt: number;       // estimated stop-signal reaction time (ms)
  haltDPrime: number;      // signal detection d' (discriminability)
}

export interface GameState {
  phase: GamePhase;
  round: RoundState | null;
  recallProgress: number[];   // taps so far this recall phase
  tapResults: TapResult[];    // results for current round
  totalScore: number;
  sessionRts: number[];
  sessionCorrect: number;
  sessionTotal: number;
  mutationsFaced: string[];
  mutationsSurvived: number;
  engine: EngineState;
  roundCount: number;
  summary: SessionSummary | null;
  currentFlashIndex: number;  // which cell is currently illuminated (-1 = none)
  lives: number;              // remaining lives (legacy — hidden in v1)
  sessionDuration: number;    // total session length in ms (default 60000)
  sessionStartedAt: number;   // Date.now() when session began
  gameMode: GameMode;
  emberHits: number;          // Ember mode: cells intercepted in current watch sequence
  perfectStreak: number;      // consecutive perfect rounds (no wrong taps) — resets on life loss
  // HALT mode tracking
  haltTrialCount: number;
  haltCommissionErrors: number;  // tapped on NoGo/Stop trials
  haltOmissionErrors: number;    // missed Go trials
  haltCorrectGos: number;
  haltCorrectStops: number;
  haltSsd: number;               // current stop-signal delay (staircase, ms)
  haltGoRts: number[];           // RTs for correct Go trials (for SSRT estimation)
}

// Flash gap is now adaptive — sourced from engine state, not a constant

export function createInitialGameState(
  profile: PlayerProfile | null,
  config: EngineConfig = ENGINE_CONFIG_DEFAULTS,
  startingLives = 3,
  gameMode: GameMode = 'arc'
): GameState {
  return {
    phase: 'idle',
    round: null,
    recallProgress: [],
    tapResults: [],
    totalScore: 0,
    sessionRts: [],
    sessionCorrect: 0,
    sessionTotal: 0,
    mutationsFaced: [],
    mutationsSurvived: 0,
    engine: initEngine(profile, config),
    roundCount: 0,
    summary: null,
    currentFlashIndex: -1,
    lives: startingLives,
    sessionDuration: 60000,
    sessionStartedAt: 0,
    gameMode,
    emberHits: 0,
    perfectStreak: 0,
    haltTrialCount: 0,
    haltCommissionErrors: 0,
    haltOmissionErrors: 0,
    haltCorrectGos: 0,
    haltCorrectStops: 0,
    haltSsd: 250,
    haltGoRts: [],
  };
}

/**
 * Selects trial type for HALT mode based on adaptive probabilities.
 * Default ratio: ~70% Go, ~20% NoGo, ~10% Stop.
 */
function selectHaltTrialType(mutationRate: number): HaltTrialType {
  const nogoRate = 0.15 + mutationRate * 0.25;
  const stopRate = 0.05 + mutationRate * 0.10;
  const roll = Math.random();
  if (roll < stopRate) return 'stop';
  if (roll < stopRate + nogoRate) return 'nogo';
  return 'go';
}

/** Builds the next round state from engine settings. */
export function buildRound(state: GameState): RoundState {
  const { levers } = state.engine;

  // HALT mode: each "round" is a single rapid trial
  if (state.gameMode === 'halt') {
    const gridSize = levers.gridSize;
    const totalCells = gridSize * gridSize;
    const targetCell = Math.floor(Math.random() * totalCells);
    const trialType = selectHaltTrialType(levers.mutationRate);

    return {
      round: state.roundCount + 1,
      displaySequence: [targetCell],
      expectedSequence: trialType === 'go' ? [targetCell] : [],
      mutation: 'none',
      poisonCell: null,
      flashDuration: state.engine.currentFlashDuration,
      flashGap: 150,
      gridSize,
      trialType,
      stopSignalDelay: trialType === 'stop' ? state.haltSsd : undefined,
      responseWindow: Math.max(800, state.engine.currentFlashDuration + 400),
    };
  }
  // Start at length 1 so round 1 adds sequenceGrowth (1) → first sequence is 2 cells.
  // Negative sequenceGrowth shrinks the sequence (floor of 2 to stay playable).
  const prevLength = state.round?.displaySequence.length ?? 1;
  const rawLength = prevLength + levers.sequenceGrowth;
  const newLength = Math.max(2, Math.min(rawLength, levers.gridSize * levers.gridSize));

  const displaySequence = generateSequence(newLength, levers.gridSize);

  // Ember only uses poison (mirror/reverse apply to recall order, which Ember doesn't have)
  const mutation = state.gameMode === 'ember'
    ? (Math.random() < levers.mutationRate * 0.6 ? 'poison' : 'none') as Mutation
    : selectMutation(levers, state.engine.consecutiveFailedMutations);

  const expectedSequence = getExpectedRecallSequence(displaySequence, mutation, levers.gridSize);
  const poisonCell = mutation === 'poison'
    ? generatePoisonCell(displaySequence, levers.gridSize)
    : null;

  // Tide recalls in reverse — watch forward, recall backward
  const finalExpectedSequence = state.gameMode === 'tide'
    ? [...expectedSequence].reverse()
    : expectedSequence;

  return {
    round: state.roundCount + 1,
    displaySequence,
    expectedSequence: finalExpectedSequence,
    mutation,
    poisonCell,
    flashDuration: state.engine.currentFlashDuration,
    flashGap: state.engine.currentFlashGap,
    gridSize: levers.gridSize,
  };
}

/**
 * Processes a tap during the recall phase.
 * Returns updated partial GameState and whether the session should end.
 */
export function processTap(
  state: GameState,
  cellIndex: number,
  tapTime: number,     // performance.now() at tap
  watchEndTime: number // performance.now() when watch phase ended
): { nextState: Partial<GameState>; sessionEnded: boolean } {
  if (!state.round || state.phase !== 'recall') {
    return { nextState: {}, sessionEnded: false };
  }

  // RT is inter-tap: tap 1 measured from watch end, taps 2+ measured from the
  // previous tap. We sum the round's RTs (held in tapResults — reset every
  // completeRound) instead of leaning on sessionRts ordering.
  const cumulativeRtThisRound = state.tapResults.reduce((s, t) => s + t.rt, 0);
  const lastTapTime = watchEndTime + cumulativeRtThisRound;
  const computedRt = Math.max(50, tapTime - lastTapTime);

  const tapIndex = state.recallProgress.length;
  const expectedCell = state.round.expectedSequence[tapIndex];
  const isPoisonTap = cellIndex === state.round.poisonCell;
  const correct = !isPoisonTap && cellIndex === expectedCell;

  const tapResult: TapResult = {
    cellIndex,
    rt: computedRt,
    correct,
    isPoisonTap,
  };

  const newTapResults = [...state.tapResults, tapResult];
  const newRts = [...state.sessionRts, computedRt];

  if (!correct || isPoisonTap) {
    // Session ends on wrong tap or poison tap
    const summary = buildSummary({
      ...state,
      tapResults: newTapResults,
      sessionRts: newRts,
      sessionTotal: state.sessionTotal + 1,
    });
    return {
      nextState: {
        phase: 'ended',
        tapResults: newTapResults,
        sessionRts: newRts,
        sessionTotal: state.sessionTotal + 1,
        summary,
      },
      sessionEnded: true,
    };
  }

  const newProgress = [...state.recallProgress, cellIndex];

  // Round complete if all expected taps received
  if (newProgress.length === state.round.expectedSequence.length) {
    return {
      nextState: {
        phase: 'feedback',
        recallProgress: newProgress,
        tapResults: newTapResults,
        sessionRts: newRts,
        sessionCorrect: state.sessionCorrect + newTapResults.length,
        sessionTotal: state.sessionTotal + newTapResults.length,
      },
      sessionEnded: false,
    };
  }

  return {
    nextState: {
      recallProgress: newProgress,
      tapResults: newTapResults,
      sessionRts: newRts,
    },
    sessionEnded: false,
  };
}

/**
 * Processes a HALT mode tap during the watch phase.
 */
export function processHaltTap(
  state: GameState,
  cellIndex: number,
  rt: number
): { nextState: Partial<GameState>; isError: boolean } {
  if (!state.round || state.gameMode !== 'halt') {
    return { nextState: {}, isError: false };
  }

  const { trialType } = state.round;
  const targetCell = state.round.displaySequence[0];
  const tappedTarget = cellIndex === targetCell;

  if (trialType === 'go' && tappedTarget) {
    return {
      nextState: {
        sessionCorrect: state.sessionCorrect + 1,
        sessionTotal: state.sessionTotal + 1,
        sessionRts: [...state.sessionRts, rt],
        haltCorrectGos: state.haltCorrectGos + 1,
        haltGoRts: [...state.haltGoRts, rt],
        haltTrialCount: state.haltTrialCount + 1,
      },
      isError: false,
    };
  }

  if (trialType === 'nogo' || trialType === 'stop') {
    return {
      nextState: {
        sessionTotal: state.sessionTotal + 1,
        sessionRts: [...state.sessionRts, rt],
        haltCommissionErrors: state.haltCommissionErrors + 1,
        haltTrialCount: state.haltTrialCount + 1,
        haltSsd: trialType === 'stop'
          ? Math.max(50, state.haltSsd - 50)
          : state.haltSsd,
      },
      isError: true,
    };
  }

  // Go trial but tapped wrong cell
  return {
    nextState: {
      sessionTotal: state.sessionTotal + 1,
      haltTrialCount: state.haltTrialCount + 1,
    },
    isError: true,
  };
}

/**
 * Called when a HALT trial times out without a tap.
 * Go trials: omission error. NoGo/Stop trials: correct withhold.
 */
export function processHaltTimeout(
  state: GameState
): { nextState: Partial<GameState>; isError: boolean } {
  if (!state.round || state.gameMode !== 'halt') {
    return { nextState: {}, isError: false };
  }

  const { trialType } = state.round;

  if (trialType === 'go') {
    return {
      nextState: {
        sessionTotal: state.sessionTotal + 1,
        haltOmissionErrors: state.haltOmissionErrors + 1,
        haltTrialCount: state.haltTrialCount + 1,
      },
      isError: true,
    };
  }

  return {
    nextState: {
      sessionCorrect: state.sessionCorrect + 1,
      sessionTotal: state.sessionTotal + 1,
      haltCorrectStops: trialType === 'stop' ? state.haltCorrectStops + 1 : state.haltCorrectStops,
      haltTrialCount: state.haltTrialCount + 1,
      haltSsd: trialType === 'stop'
        ? Math.min(500, state.haltSsd + 50)
        : state.haltSsd,
    },
    isError: false,
  };
}

/**
 * Called when a round completes successfully. Updates the engine and preps next round.
 */
export function completeRound(state: GameState): Partial<GameState> {
  if (!state.round) return {};

  const roundCorrect = state.tapResults.filter((t) => t.correct).length;
  const roundTotal = state.tapResults.length;
  const roundAvgRt = state.tapResults.length > 0
    ? state.tapResults.reduce((s, t) => s + t.rt, 0) / state.tapResults.length
    : 500;

  const mutationSurvived = state.round.mutation !== 'none' ? true : null;

  const roundPerf: RoundPerformance = {
    correct: roundCorrect,
    total: roundTotal,
    avgRt: roundAvgRt,
    mutationSurvived,
  };

  const newPerfectStreak = state.perfectStreak + 1;

  const roundScore = calcRoundScore({
    sequenceLength: state.round.displaySequence.length,
    tapRts: state.tapResults.map((t) => t.rt),
    mutationActive: state.round.mutation !== 'none',
    engineIntensity: state.engine.intensity,
    perfectStreak: newPerfectStreak,
  });

  const newEngine = updateEngine(state.engine, roundPerf, state.roundCount);

  const newMutationsFaced = state.round.mutation !== 'none'
    ? [...state.mutationsFaced, state.round.mutation]
    : state.mutationsFaced;
  const newMutationsSurvived = mutationSurvived ? state.mutationsSurvived + 1 : state.mutationsSurvived;

  return {
    engine: newEngine,
    totalScore: state.totalScore + roundScore,
    mutationsFaced: newMutationsFaced,
    mutationsSurvived: newMutationsSurvived,
    roundCount: state.roundCount + 1,
    perfectStreak: newPerfectStreak,
    tapResults: [],
    recallProgress: [],
  };
}

/**
 * Builds a failed RoundPerformance and updates the engine for a life-lost round.
 * Ensures mutationSurvived === false reaches updateEngine when a mutation was active,
 * so mutation-rate dampening and consecutiveFailedMutations tracking work correctly.
 */
export function applyFailedRound(state: GameState): { engine: EngineState } {
  if (!state.round) return { engine: state.engine };
  const roundCorrect = state.tapResults.filter((t) => t.correct).length;
  const roundTotal = state.round.expectedSequence.length;
  const roundAvgRt =
    state.tapResults.length > 0
      ? state.tapResults.reduce((s, t) => s + t.rt, 0) / state.tapResults.length
      : 500;
  const mutationSurvived = state.round.mutation !== 'none' ? false : null;

  const roundPerf: RoundPerformance = {
    correct: roundCorrect,
    total: roundTotal,
    avgRt: roundAvgRt,
    mutationSurvived,
  };
  return { engine: updateEngine(state.engine, roundPerf, state.roundCount) };
}

/**
 * Estimates Stop-Signal Reaction Time using the integration method.
 */
function estimateSsrt(goRts: number[], ssd: number, correctStops: number, totalStopTrials: number): number {
  if (goRts.length === 0 || totalStopTrials === 0) return 0;
  const failedStopRate = Math.max(0.05, Math.min(0.95, 1 - correctStops / totalStopTrials));
  const sorted = [...goRts].sort((a, b) => a - b);
  const nthIdx = Math.min(sorted.length - 1, Math.floor(failedStopRate * sorted.length));
  return Math.max(0, sorted[nthIdx] - ssd);
}

/**
 * Computes signal detection d' (d-prime) for HALT mode.
 */
function computeDPrime(hitRate: number, falseAlarmRate: number): number {
  const hr = Math.max(0.01, Math.min(0.99, hitRate));
  const far = Math.max(0.01, Math.min(0.99, falseAlarmRate));
  const zScore = (p: number) => {
    const t = Math.sqrt(-2 * Math.log(p < 0.5 ? p : 1 - p));
    const c0 = 2.515517, c1 = 0.802853, c2 = 0.010328;
    const d1 = 1.432788, d2 = 0.189269, d3 = 0.001308;
    const z = t - (c0 + c1 * t + c2 * t * t) / (1 + d1 * t + d2 * t * t + d3 * t * t * t);
    return p < 0.5 ? -z : z;
  };
  return zScore(hr) - zScore(far);
}

export function buildSummary(state: GameState): SessionSummary {
  const allRts = state.sessionRts;
  const avgRt = allRts.length > 0
    ? allRts.reduce((a, b) => a + b, 0) / allRts.length
    : 0;
  const bestRt = allRts.length > 0 ? Math.min(...allRts) : 0;
  const accuracy = state.sessionTotal > 0
    ? state.sessionCorrect / state.sessionTotal
    : 0;

  const maxSeq = state.round?.displaySequence.length ?? 2;
  const peakTempoAccuracy = accuracy;

  // HALT-specific metrics
  const totalNoGoStop = state.haltTrialCount - state.haltCorrectGos - state.haltOmissionErrors;
  const hitRate = state.haltTrialCount > 0
    ? state.haltCorrectGos / Math.max(1, state.haltCorrectGos + state.haltOmissionErrors)
    : 1;
  const falseAlarmRate = totalNoGoStop > 0
    ? state.haltCommissionErrors / Math.max(1, totalNoGoStop)
    : 0;
  const totalStopTrials = state.haltCorrectStops + state.haltCommissionErrors;
  const ssrt = estimateSsrt(state.haltGoRts, state.haltSsd, state.haltCorrectStops, totalStopTrials);
  const dPrime = computeDPrime(hitRate, falseAlarmRate);

  const haltMetrics = state.gameMode === 'halt'
    ? { ssrt, dPrime, commissionErrors: state.haltCommissionErrors, totalTrials: state.haltTrialCount }
    : undefined;

  const cognitiveScores = calcCognitiveScores(
    allRts,
    maxSeq,
    state.mutationsFaced.length,
    state.mutationsSurvived,
    peakTempoAccuracy,
    haltMetrics
  );

  return {
    totalScore: state.totalScore,
    roundsCompleted: state.roundCount,
    maxSequenceLength: maxSeq,
    allRts,
    avgRt,
    bestRt,
    accuracy,
    mutationsFaced: state.mutationsFaced,
    mutationsSurvived: state.mutationsSurvived,
    engineIntensity: state.engine.intensity,
    cognitiveScores,
    bestStreak: state.perfectStreak,
    haltCommissionErrors: state.haltCommissionErrors,
    haltOmissionErrors: state.haltOmissionErrors,
    haltSsrt: ssrt,
    haltDPrime: dPrime,
  };
}
