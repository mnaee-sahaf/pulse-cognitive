import type { GridSize, Mutation } from './sequenceGenerator';

export interface LeverSettings {
  sequenceGrowth: 1 | 2 | 3;    // elements added per round
  tempoRamp: number;             // ms reduction per round (negative: faster)
  mutationRate: number;          // 0.0 – 0.60 chance of mutation this round
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
  intensity: number; // 0.0–1.0 snapshot of how hard the engine is pushing
}

const DEFAULT_LEVERS: LeverSettings = {
  sequenceGrowth: 1,
  tempoRamp: -20,
  mutationRate: 0,
  gridSize: 3,
};

const DEFAULT_PROFILE: PlayerProfile = {
  baselineRt: 450,
  wmCapacity: 4,
  flexRating: 0.5,
  speedAccuracyThreshold: 350,
};

export function initEngine(profile: PlayerProfile | null): EngineState {
  const p = profile ?? DEFAULT_PROFILE;

  // Seed initial levers from player profile
  const levers: LeverSettings = {
    sequenceGrowth: p.wmCapacity >= 6 ? 2 : 1,
    tempoRamp: p.baselineRt < 350 ? -30 : -20,
    mutationRate: p.flexRating > 0.6 ? 0.2 : 0,
    gridSize: 3,
  };

  return {
    levers,
    roundHistory: [],
    consecutiveMutationSurvives: 0,
    consecutiveFailedMutations: 0,
    intensity: 0,
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

  // Don't adjust aggressively in the first 2 rounds
  if (currentRound >= 2) {
    const accuracy = rollingAccuracy(history, 3);
    const avgRt = rollingAvgRt(history, 3);

    if (accuracy > 0.9 && avgRt < 350) {
      // Player is well below ceiling — accelerate all axes
      levers.sequenceGrowth = 2;
      levers.tempoRamp = -40;
      levers.mutationRate = clampMutationRate(levers.mutationRate + 0.15);
    } else if (accuracy > 0.9 && avgRt > 450) {
      // Memory fine, speed slow — push RT only
      levers.sequenceGrowth = 1;
      levers.tempoRamp = -35;
    } else if (accuracy >= 0.7 && accuracy <= 0.9 && avgRt < 400) {
      // Target ZPD — don't adjust
    } else if (accuracy < 0.7) {
      // Overwhelmed — ease back
      levers.sequenceGrowth = 1;
      levers.tempoRamp = -15;
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

  // Grid expansion — engine-triggered, not fixed round
  if (currentRound >= 4 && levers.gridSize === 3) {
    const accuracy = rollingAccuracy(history, 3);
    if (accuracy > 0.88) levers.gridSize = 4;
  }
  if (currentRound >= 8 && levers.gridSize === 4) {
    const accuracy = rollingAccuracy(history, 3);
    if (accuracy > 0.88) levers.gridSize = 5;
  }

  // Compute intensity (0–1) — how hard the engine is pushing
  const intensityScore =
    ((levers.sequenceGrowth - 1) / 2) * 0.3 +
    (Math.abs(levers.tempoRamp) / 50) * 0.4 +
    (levers.mutationRate / 0.6) * 0.3;

  return {
    levers,
    roundHistory: history,
    consecutiveMutationSurvives,
    consecutiveFailedMutations,
    intensity: Math.min(1, intensityScore),
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
