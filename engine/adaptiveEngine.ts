import type { GridSize, Mutation } from './sequenceGenerator';
import { ENGINE_CONFIG_DEFAULTS, type EngineConfig } from './engineConfig';
import { log } from '../lib/devLog';

export interface LeverSettings {
  sequenceGrowth: number;         // elements added per round (negative = shrink, 0 = hold, positive = grow)
  tempoRamp: number;              // ms delta applied to currentFlashDuration each round (negative: faster, positive: slower)
  mutationRate: number;           // 0.0 – 0.60 chance of mutation this round
  gridSize: GridSize;
  flashGapDelta: number;          // ms delta applied to inter-cell gap each round (negative = tighter, positive = more breathing room)
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
  leverHistory: LeverSettings[];  // snapshot of levers active at the start of each round
  consecutiveMutationSurvives: number;
  consecutiveFailedMutations: number;
  consecutiveZpdRounds: number;  // how many rounds in a row we've been in the hold-steady zone
  intensity: number;             // 0.0–1.0 snapshot of how hard the engine is pushing
  currentFlashDuration: number;  // ms — accumulates tempo deltas each round
  currentFlashGap: number;       // ms — accumulates gap deltas each round
  config: EngineConfig;          // tuning config snapshot for this session
}

const DEFAULT_LEVERS: LeverSettings = {
  sequenceGrowth: 1,
  tempoRamp: -10,
  mutationRate: 0,
  gridSize: 3,
  flashGapDelta: 0,
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

  // Seed initial levers via linear interpolation from player profile.
  // This produces a smooth starting difficulty curve instead of binary splits.

  // sequenceGrowth: wmCapacity 3→1, 5→1, 7→2, 9+→3
  const growthFromWm = Math.max(1, Math.min(3, Math.round((p.wmCapacity - 3) / 2)));

  // tempoRamp: baselineRt 200ms→-30 (aggressive), 350ms→-20, 500ms→-10 (gentle)
  const rtNorm = Math.max(0, Math.min(1, (p.baselineRt - 200) / 300)); // 0=fast, 1=slow
  const tempoFromRt = config.accelTempoRamp + rtNorm * (config.defaultTempoRamp - config.accelTempoRamp);

  // mutationRate: flexRating 0→0, 0.5→0.1, 1.0→0.25
  const mutationFromFlex = Math.min(0.25, p.flexRating * 0.25);

  // flashGapDelta: faster players start with tighter gaps
  const gapFromRt = rtNorm > 0.5 ? 0 : -5;

  // Initial flash duration: slightly faster for experienced players
  const flashFromProfile = config.initialFlashDuration - (1 - rtNorm) * 50;

  const levers: LeverSettings = {
    sequenceGrowth: growthFromWm,
    tempoRamp: Math.round(tempoFromRt),
    mutationRate: Math.round(mutationFromFlex * 100) / 100,
    gridSize: 3,
    flashGapDelta: gapFromRt,
  };

  log.engine('initEngine — profile seeded levers', {
    wmCapacity: p.wmCapacity,
    baselineRt: p.baselineRt,
    flexRating: p.flexRating,
    seededGrowth: levers.sequenceGrowth,
    seededTempo: levers.tempoRamp,
    seededMutation: levers.mutationRate,
    flashDuration: Math.round(flashFromProfile),
  });

  return {
    levers,
    roundHistory: [],
    leverHistory: [],
    consecutiveMutationSurvives: 0,
    consecutiveFailedMutations: 0,
    consecutiveZpdRounds: 0,
    intensity: 0,
    currentFlashDuration: Math.round(flashFromProfile),
    currentFlashGap: config.initialFlashGap,
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
  const leverHistory = [...state.leverHistory, { ...state.levers }];
  let levers = { ...state.levers };
  let { consecutiveMutationSurvives, consecutiveFailedMutations, consecutiveZpdRounds } = state;
  let branch = 'none';

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
    // Calibration warm-up: use early round data to seed levers for faster ramp-up.
    // Round 0 measures raw RT; round 1 adjusts levers based on that measurement.
    if (currentRound === 1 && history.length >= 1) {
      const calibrationRt = history[0].avgRt;
      const calibrationAcc = history[0].total === 0 ? 1 : history[0].correct / history[0].total;
      if (calibrationRt < cfg.rtFastThreshold && calibrationAcc >= cfg.overwhelmThreshold) {
        branch = 'warmup-calibrate-fast';
        levers.sequenceGrowth = 2;
        levers.tempoRamp = cfg.pushTempoRamp;
        levers.mutationRate = 0.1;
      } else if (calibrationAcc >= cfg.overwhelmThreshold) {
        branch = 'warmup-calibrate-ok';
        levers.sequenceGrowth = 1;
        levers.tempoRamp = cfg.warmupTempoRamp * 2;
      } else {
        branch = 'warmup-calibrate-slow';
        levers.sequenceGrowth = 1;
        levers.tempoRamp = cfg.warmupTempoRamp;
      }
    } else {
      branch = 'warmup';
      levers.sequenceGrowth = 1;
      levers.tempoRamp = cfg.warmupTempoRamp;
    }
  } else {
    const accuracy = rollingAccuracy(history, 3);
    const avgRt = rollingAvgRt(history, 3);

    if (accuracy > cfg.zpdUpper && avgRt < cfg.rtFastThreshold) {
      branch = 'accel-all';
      levers.sequenceGrowth = Math.min(3, cfg.accelGrowth);
      levers.tempoRamp = cfg.accelTempoRamp;
      levers.flashGapDelta = -15;
      levers.mutationRate = clampMutationRate(levers.mutationRate + 0.15);
    } else if (accuracy > cfg.zpdUpper && avgRt > cfg.rtSlowThreshold) {
      branch = 'push-tempo';
      levers.sequenceGrowth = 1;
      levers.tempoRamp = cfg.pushTempoRamp;
      levers.flashGapDelta = -10;
    } else if (accuracy > cfg.zpdUpper) {
      branch = 'steady-push';
      levers.sequenceGrowth = 1;
      levers.tempoRamp = cfg.steadyPushTempoRamp;
      levers.flashGapDelta = -8;
      levers.mutationRate = clampMutationRate(levers.mutationRate + 0.08);
    } else if (accuracy >= cfg.overwhelmThreshold && accuracy <= cfg.zpdUpper) {
      // Check if this is a post-recovery ramp-up: last round was perfect but short.
      // If the player just aced a trivially short sequence, push growth instead of holding.
      const lastRound = roundPerf;
      const lastAcc = lastRound.total === 0 ? 1 : lastRound.correct / lastRound.total;
      const isPostRecovery = lastAcc >= 0.95 && lastRound.total <= 3;

      if (isPostRecovery) {
        branch = 'zpd-recovery-ramp';
        levers.sequenceGrowth = 1;
        levers.tempoRamp = cfg.steadyPushTempoRamp;
        levers.flashGapDelta = -5;
      } else {
        branch = 'zpd-hold';
        consecutiveZpdRounds += 1;
        if (consecutiveZpdRounds >= cfg.plateauBreakThreshold) {
          branch = 'zpd-plateau-break';
          const nudgeAxis = consecutiveZpdRounds % 3;
          if (nudgeAxis === 0) {
            levers.mutationRate = clampMutationRate(levers.mutationRate + 0.1);
          } else if (nudgeAxis === 1) {
            levers.tempoRamp = -10;
            levers.flashGapDelta = -5;
          } else {
            levers.sequenceGrowth = 1;
          }
        } else {
          levers.sequenceGrowth = 0;
          levers.tempoRamp = 0;
          levers.flashGapDelta = 0;
        }
      }
    } else if (accuracy < cfg.overwhelmThreshold) {
      // Check if the player is recovering: last round was perfect at a short sequence.
      // If so, the low rolling accuracy is just the failed round dragging the window —
      // don't keep easing, ramp back up instead.
      const lastAcc = roundPerf.total === 0 ? 1 : roundPerf.correct / roundPerf.total;
      const isRecovering = lastAcc >= 0.95 && roundPerf.total <= 3;

      if (isRecovering) {
        branch = 'overwhelm-recovery';
        // Player is acing easy rounds — push back toward their level
        levers.sequenceGrowth = 1;
        levers.tempoRamp = cfg.steadyPushTempoRamp;
        levers.flashGapDelta = -5;
        // Don't touch mutationRate — let it recover naturally
      } else {
        branch = 'overwhelm';
        levers.sequenceGrowth = accuracy < cfg.overwhelmThreshold - 0.15 ? -2 : -1;
        levers.tempoRamp = cfg.easeTempoRamp;
        levers.flashGapDelta = 20;
        levers.mutationRate = clampMutationRate(levers.mutationRate - 0.15);
      }
    }

    // Reset plateau counter when leaving ZPD zone
    if (accuracy > cfg.zpdUpper || accuracy < cfg.overwhelmThreshold) {
      consecutiveZpdRounds = 0;
    }

    // Mutation flexibility adjustments
    if (consecutiveFailedMutations >= 1 && roundPerf.mutationSurvived === false) {
      levers.mutationRate = clampMutationRate(levers.mutationRate - 0.15);
    }
    if (consecutiveMutationSurvives >= 3) {
      levers.mutationRate = clampMutationRate(levers.mutationRate + 0.1);
    }
  }

  // Grid expansion — requires 3 consecutive strong rounds with non-trivial sequences.
  // Minimum sequence length of 3 prevents trivially easy recovery rounds from gaming the check.
  const last3 = history.slice(-3);
  const allStrong =
    last3.length === 3 &&
    last3.every((r) => {
      const acc = r.total === 0 ? 1 : r.correct / r.total;
      return acc > cfg.gridExpandAccuracy && r.total >= 3;
    });

  if (currentRound >= cfg.gridExpand3to4Round && levers.gridSize === 3 && allStrong) {
    levers.gridSize = 4;
    log.engine('grid expanded 3→4', { round: currentRound });
  }
  if (currentRound >= cfg.gridExpand4to5Round && levers.gridSize === 4 && allStrong) {
    levers.gridSize = 5;
    log.engine('grid expanded 4→5', { round: currentRound });
  }

  // Accumulate tempo: apply this round's ramp delta to the running flash duration
  const newFlashDuration = Math.min(
    cfg.flashCeiling,
    Math.max(cfg.flashFloor, state.currentFlashDuration + levers.tempoRamp)
  );

  // Accumulate flash gap: tighter gaps = faster pacing, wider = more breathing room
  const newFlashGap = Math.min(
    cfg.flashGapCeiling,
    Math.max(cfg.flashGapFloor, state.currentFlashGap + levers.flashGapDelta)
  );

  // Compute intensity (0–1) — comprehensive difficulty snapshot.
  // Factors: flash speed, flash gap tightness, mutation rate, grid size, sequence load.
  const maxCells = levers.gridSize * levers.gridSize;
  const lastSeqLength = history.length > 0 ? history[history.length - 1].total : 2;
  const seqLoad = Math.min(1, (lastSeqLength - 2) / (maxCells - 2 || 1)); // 2 cells = 0, full grid = 1
  const tempoIntensity = (cfg.flashCeiling - newFlashDuration) / (cfg.flashCeiling - cfg.flashFloor);
  const gapIntensity = (cfg.flashGapCeiling - newFlashGap) / (cfg.flashGapCeiling - cfg.flashGapFloor);
  const gridIntensity = (levers.gridSize - 3) / 2; // 3×3 = 0, 5×5 = 1
  const mutIntensity = levers.mutationRate / 0.6;

  const intensityScore =
    tempoIntensity * 0.25 +
    seqLoad * 0.25 +
    mutIntensity * 0.20 +
    gridIntensity * 0.15 +
    gapIntensity * 0.15;

  log.engine(`R${currentRound} → ${branch}`, {
    accuracy: Math.round(rollingAccuracy(history, 3) * 100),
    avgRt: Math.round(rollingAvgRt(history, 3)),
    growth: levers.sequenceGrowth,
    tempo: levers.tempoRamp,
    flash: Math.round(newFlashDuration),
    gap: Math.round(newFlashGap),
    mutRate: Math.round(levers.mutationRate * 100),
    grid: levers.gridSize,
    intensity: Math.round(intensityScore * 100),
    zpdStreak: consecutiveZpdRounds,
  });

  return {
    levers,
    roundHistory: history,
    leverHistory,
    consecutiveMutationSurvives,
    consecutiveFailedMutations,
    consecutiveZpdRounds,
    intensity: Math.min(1, intensityScore),
    currentFlashDuration: newFlashDuration,
    currentFlashGap: newFlashGap,
    config: state.config,
  };
}

/**
 * Decides whether to introduce a mutation this round and which type.
 * At low mutation rates, only simple mutations are used.
 * At higher rates (>0.25), advanced mutations (colorSwitch, parity, double) enter the pool.
 * Prefers simpler mutations when player is struggling.
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

  // At higher mutation rates, introduce advanced mutations
  const useAdvanced = levers.mutationRate > 0.25;
  const roll = Math.random();

  if (useAdvanced) {
    // 6-way pool: poison, mirror, reverse, colorSwitch, parity, double
    if (roll < 0.15) return 'poison';
    if (roll < 0.30) return 'mirror';
    if (roll < 0.45) return 'reverse';
    if (roll < 0.60) return 'colorSwitch';
    if (roll < 0.80) return 'parity';
    return 'double';
  }

  // Standard 3-way pool at lower rates
  if (roll < 0.33) return 'poison';
  if (roll < 0.66) return 'mirror';
  return 'reverse';
}
