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
export type GameMode = 'arc' | 'tide' | 'ember';
import { calcRoundScore, calcCognitiveScores, type CognitiveScores } from './scoring';

export type GamePhase = 'idle' | 'watch' | 'recall' | 'feedback' | 'ended';

export interface RoundState {
  round: number;
  displaySequence: number[];
  expectedSequence: number[];
  mutation: Mutation;
  poisonCell: number | null;
  flashDuration: number; // ms per cell illumination
  flashGap: number;      // ms between cell flashes
  gridSize: GridSize;
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
  lives: number;              // remaining lives (session ends at 0)
  gameMode: GameMode;
  emberHits: number;          // Ember mode: cells intercepted in current watch sequence
}

const INITIAL_FLASH_GAP = 250; // ms between cells

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
    gameMode,
    emberHits: 0,
  };
}

/** Builds the next round state from engine settings. */
export function buildRound(state: GameState): RoundState {
  const { levers } = state.engine;
  // Start at length 1 so round 1 adds sequenceGrowth (1) → first sequence is 2 cells
  const prevLength = state.round?.displaySequence.length ?? 1;
  const newLength = Math.min(prevLength + levers.sequenceGrowth, levers.gridSize * levers.gridSize);

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
    flashGap: INITIAL_FLASH_GAP,
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

  // RT is time since the watch phase ended for the first tap;
  // subsequent taps measured from the previous tap's absolute time.
  const lastTapTime = state.tapResults.length > 0
    ? watchEndTime + state.sessionRts.slice(-state.tapResults.length).reduce((a, b) => a + b, 0)
    : watchEndTime;
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

  const roundScore = calcRoundScore({
    sequenceLength: state.round.displaySequence.length,
    tapRts: state.tapResults.map((t) => t.rt),
    mutationActive: state.round.mutation !== 'none',
    engineIntensity: state.engine.intensity,
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
  const avgRtValue = avgRt;
  const peakTempoAccuracy = accuracy;

  const cognitiveScores = calcCognitiveScores(
    allRts,
    maxSeq,
    state.mutationsFaced.length,
    state.mutationsSurvived,
    peakTempoAccuracy
  );

  return {
    totalScore: state.totalScore,
    roundsCompleted: state.roundCount,
    maxSequenceLength: maxSeq,
    allRts,
    avgRt: avgRtValue,
    bestRt,
    accuracy,
    mutationsFaced: state.mutationsFaced,
    mutationsSurvived: state.mutationsSurvived,
    engineIntensity: state.engine.intensity,
    cognitiveScores,
  };
}
