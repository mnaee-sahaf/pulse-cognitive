import type { GridSize, Mutation } from './sequenceGenerator';
import { ENGINE_CONFIG_DEFAULTS, type EngineConfig } from './engineConfig';

export interface LeverSettings {
  sequenceGrowth: 0 | 1 | 2 | 3; // elements added per round (0 = hold at current length)
  tempoRamp: number;              // ms delta applied to currentFlashDuration each round (negative: faster, positive: slower)
  mutationRate: number;           // 0.0 – 0.60 chance of mutation this round
  gridSize: GridSize;
}

export interface RoundPerformance {
  correct: number;
  total: number;
  avgRt: number;
  mutationSurvived: boolean | null; // null = no mutation this round
}

export interface PlayerProfile {
  baselineRt: number;           // rolling avg first-tap RT across last 10 sessions
  wmCapacity: number;           // avg max sequence length before failure last 10 sessions
  flexRating: number;           // mutation survival rate last 10 sessions (0.0–1.0)
  speedAccuracyThreshold: number; // RT at which accuracy drops below 80%
}

export interface EngineState {
  levers: LeverSettings;
  roundHistory: RoundPerformance[];
  consecutiveMutationSurvives: number;
  consecutiveFailedMutations: number;
  intensity: number;             // 0.0–1.0 snapshot of how hard the engine is pushing
  currentFlashDuration: number;  // ms — accumulates tempo deltas each round
  config: EngineConfig;          // tuning config snapshot for this session
}

const DEFAULT_LEVERS: LeverSettings = {
  sequenceGrowth: 1,
  tempoRamp: -10,
  mutationRate: 0,
  gridSize: 3,
};

const DEFAULT_PROFILE: PlayerProfile = {
  baselineRt: 450,
  wmCapacity: 4,
  flexRating: 0.5,
  speedAccuracyThreshold: 350,
};

export function initEngine(
  profile: PlayerProfile | null,
  config: EngineConfig = ENGINE_CONFIG_DEFAULTS
): EngineState {
  const p = profile ?? DEFAULT_PROFILE;

  // Seed initial levers from player profile
  const levers: LeverSettings = {
    sequenceGrowth: p.wmCapacity >= 6 ? 2 : 1,
    tempoRamp: p.baselineRt < 350 ? config.pushTempoRamp : config.defaultTempoRamp,
    mutationRate: p.flexRating > 0.6 ? 0.2 : 0,
    gridSize: 3,
  };

  return {
    levers,
    roundHistory: [],
    consecutiveMutationSurvives: 0,
    consecutiveFailedMutations: 0,
    intensity: 0,
    currentFlashDuration: config.initialFlashDuration,
    config,
  };
}

/** Rolling accuracy over last N rounds (or all if fewer available). */
function rollingAccuracy(history: RoundPerformance[], n: number): number {
  const slice = history.slice(-n);
  if (slice.length === 0) return 1;
  const correct = slice.reduce((s, r) => s + r.correct, 0);
  const total = slice.reduce((s, r) => s + r.total, 0);
  return total === 0 ? 1 : correct / total;
}

/** Rolling average RT over last N rounds. */
function rollingAvgRt(history: RoundPerformance[], n: number): number {
  const slice = history.slice(-n);
  if (slice.length === 0) return 500;
  return slice.reduce((s, r) => s + r.avgRt, 0) / slice.length;
}

function clampMutationRate(rate: number): number {
  return Math.min(0.6, Math.max(0, rate));
}

/**
 * Called after each round. Updates engine state and returns new lever settings
 * for the next round.
 */
export function updateEngine(
  state: EngineState,
  roundPerf: RoundPerformance,
  currentRound: number
): EngineState {
  const history = [...state.roundHistory, roundPerf];
  let levers = { ...state.levers };
  let { consecutiveMutationSurvives, consecutiveFailedMutations } = state;

  // Track mutation streaks
  if (roundPerf.mutationSurvived === true) {
    consecutiveMutationSurvives += 1;
    consecutiveFailedMutations = 0;
  } else if (roundPerf.mutationSurvived === false) {
    consecutiveFailedMutations += 1;
    consecutiveMutationSurvives = 0;
  }

  const cfg = state.config;

  if (currentRound < cfg.warmupRounds) {
    // Warm-up phase: fixed gentle escalation, no adaptation
    levers.sequenceGrowth = 1;
    levers.tempoRamp = cfg.warmupTempoRamp;
  } else {
    const accuracy = rollingAccuracy(history, 3);
    const avgRt = rollingAvgRt(history, 3);

    if (accuracy > cfg.zpdUpper && avgRt < cfg.rtFastThreshold) {
      // Player is well below ceiling — accelerate all axes
      levers.sequenceGrowth = Math.min(3, cfg.accelGrowth) as 0 | 1 | 2 | 3;
      levers.tempoRamp = cfg.accelTempoRamp;
      levers.mutationRate = clampMutationRate(levers.mutationRate + 0.15);
    } else if (accuracy > cfg.zpdUpper && avgRt > cfg.rtSlowThreshold) {
      // Memory fine, speed lagging — push tempo only
      levers.sequenceGrowth = 1;
      levers.tempoRamp = cfg.pushTempoRamp;
    } else if (accuracy >= cfg.overwhelmThreshold && accuracy <= cfg.zpdUpper) {
      // Target ZPD — hold steady, don't grow sequence
      levers.sequenceGrowth = 0;
      levers.tempoRamp = 0;
    } else if (accuracy < cfg.overwhelmThreshold) {
      // Overwhelmed — ease back and slow down
      levers.sequenceGrowth = 1;
      levers.tempoRamp = cfg.easeTempoRamp;
      levers.mutationRate = clampMutationRate(levers.mutationRate - 0.15);
    }

    // Mutation flexibility adjustments
    if (consecutiveFailedMutations >= 1 && roundPerf.mutationSurvived === false) {
      levers.mutationRate = clampMutationRate(levers.mutationRate - 0.15);
    }
    if (consecutiveMutationSurvives >= 3) {
      levers.mutationRate = clampMutationRate(levers.mutationRate + 0.1);
    }
  }

  // Grid expansion — requires 3 consecutive rounds above threshold, not just one check
  const last3Accuracies = history.slice(-3).map((r) =>
    r.total === 0 ? 1 : r.correct / r.total
  );
  const allStrong =
    last3Accuracies.length === 3 &&
    last3Accuracies.every((a) => a > cfg.gridExpandAccuracy);

  if (currentRound >= cfg.gridExpand3to4Round && levers.gridSize === 3 && allStrong) {
    levers.gridSize = 4;
  }
  if (currentRound >= cfg.gridExpand4to5Round && levers.gridSize === 4 && allStrong) {
    levers.gridSize = 5;
  }

  // Accumulate tempo: apply this round's ramp delta to the running flash duration
  const newFlashDuration = Math.min(
    cfg.flashCeiling,
    Math.max(cfg.flashFloor, state.currentFlashDuration + levers.tempoRamp)
  );

  // Compute intensity (0–1) — how hard the engine is pushing
  const intensityScore =
    ((levers.sequenceGrowth - 1) / 2) * 0.3 +
    ((800 - newFlashDuration) / 500) * 0.4 +
    (levers.mutationRate / 0.6) * 0.3;

  return {
    levers,
    roundHistory: history,
    consecutiveMutationSurvives,
    consecutiveFailedMutations,
    intensity: Math.min(1, intensityScore),
    currentFlashDuration: newFlashDuration,
    config: state.config,
  };
}

/**
 * Decides whether to introduce a mutation this round and which type.
 * Prefers simpler mutations (Poison) when player is struggling.
 */
export function selectMutation(
  levers: LeverSettings,
  consecutiveFailedMutations: number
): Mutation {
  if (Math.random() > levers.mutationRate) return 'none';

  // Prefer simpler mutations when player is struggling
  if (consecutiveFailedMutations > 0) {
    return 'poison';
  }

  const roll = Math.random();
  if (roll < 0.33) return 'poison';
  if (roll < 0.66) return 'mirror';
  return 'reverse';
}
