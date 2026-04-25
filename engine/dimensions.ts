/**
 * Five independent cognitive dimensions, each with its own staircase config
 * and norm table reference.
 *
 * Each dimension owns:
 * - its own 3-down-1-up staircase (engine/staircase.ts)
 * - a population norm table for percentile reporting (engine/norms.ts)
 * - the game-side lever it controls (sequence length, flash duration, etc.)
 *
 * v1's "single shared engine drifting four levers loosely" is replaced by
 * five tight psychophysical loops each forcing the player to operate at
 * their personal threshold (~79.4% accuracy).
 *
 * This module is pure: declarations + lookup helpers, no I/O.
 */

import type { StaircaseConfig } from './staircase';
import {
  RT_NORMS,
  WM_SPAN_NORMS,
  SSRT_NORMS,
  PROCESSING_SPEED_NORMS,
  type NormTable,
} from './norms';

export type DimensionId =
  | 'workingMemory'
  | 'processingSpeed'
  | 'inhibition'
  | 'flexibility'
  | 'sustainedAttention';

export interface DimensionDefinition {
  id: DimensionId;
  /** Player-facing label. */
  label: string;
  /** Short label for chips/badges. */
  shortLabel: string;
  /** What lever this dimension controls in-game. */
  lever:
    | 'sequenceLength'
    | 'flashDuration'
    | 'stopSignalDelay'
    | 'mutationRate'
    | 'sessionDuration';
  /** Staircase config. θ is in lever-space units. */
  staircase: StaircaseConfig;
  /**
   * Population norm table for percentile lookup.
   * `null` for dimensions where no clean norm reference exists yet
   * (flexibility, sustained attention) — those will use within-user
   * trajectory comparisons only, not population percentiles.
   */
  norm: { table: NormTable; lowerIsBetter: boolean } | null;
  /**
   * Mapping from staircase θ to game lever. The game loop reads this when
   * generating each round.
   */
  thetaToLeverValue: (theta: number) => number;
}

/**
 * Working Memory — sequence length.
 * Higher θ = longer sequence = harder. θ in [3, 12] cells.
 */
export const WORKING_MEMORY: DimensionDefinition = {
  id: 'workingMemory',
  label: 'Working Memory',
  shortLabel: 'WM',
  lever: 'sequenceLength',
  staircase: {
    initialTheta: 4,
    initialStep: 1,
    stepFloor: 1,
    stepShrinkFactor: 1.0, // integer cells: don't shrink
    thetaMin: 3,
    thetaMax: 12,
    upRule: 3,
  },
  norm: { table: WM_SPAN_NORMS, lowerIsBetter: false },
  thetaToLeverValue: (theta) => Math.round(theta),
};

/**
 * Processing Speed — flash duration (ms).
 * Lower θ = faster flash = harder. θ in [200, 800] ms.
 */
export const PROCESSING_SPEED: DimensionDefinition = {
  id: 'processingSpeed',
  label: 'Processing Speed',
  shortLabel: 'SPEED',
  lever: 'flashDuration',
  staircase: {
    initialTheta: 600,
    initialStep: 60,
    stepFloor: 5,
    stepShrinkFactor: 0.7,
    thetaMin: 200,
    thetaMax: 800,
    upRule: 3,
  },
  norm: { table: PROCESSING_SPEED_NORMS, lowerIsBetter: true },
  // For speed, "step up" in the staircase = harder = lower flash duration.
  // We invert in the game-loop wiring (see engine/dimensions consumer).
  thetaToLeverValue: (theta) => Math.round(theta),
};

/**
 * Inhibition — stop-signal delay (ms) for HALT mode.
 * Higher θ = longer SSD = harder to inhibit. θ in [50, 500] ms.
 *
 * Note SSD ≠ SSRT. SSD is the delay we present; SSRT is what we estimate
 * from response patterns. The staircase tracks SSD; SSRT is derived.
 */
export const INHIBITION: DimensionDefinition = {
  id: 'inhibition',
  label: 'Inhibition',
  shortLabel: 'STOP',
  lever: 'stopSignalDelay',
  staircase: {
    initialTheta: 250,
    initialStep: 50,
    stepFloor: 10,
    stepShrinkFactor: 0.7,
    thetaMin: 50,
    thetaMax: 500,
    upRule: 3,
  },
  // SSRT norms apply post-hoc to the *derived* SSRT value, not to SSD.
  // We attach the table here for percentile reporting on the result page.
  norm: { table: SSRT_NORMS, lowerIsBetter: true },
  thetaToLeverValue: (theta) => Math.round(theta),
};

/**
 * Cognitive Flexibility — mutation rate (probability).
 * Higher θ = more frequent rule changes = harder. θ in [0, 0.6].
 *
 * No clean published norm exists for "set-shifting under mutation".
 * Within-user trajectory only.
 */
export const FLEXIBILITY: DimensionDefinition = {
  id: 'flexibility',
  label: 'Flexibility',
  shortLabel: 'FLEX',
  lever: 'mutationRate',
  staircase: {
    initialTheta: 0,
    initialStep: 0.1,
    stepFloor: 0.02,
    stepShrinkFactor: 0.7,
    thetaMin: 0,
    thetaMax: 0.6,
    upRule: 3,
  },
  norm: null,
  thetaToLeverValue: (theta) => theta,
};

/**
 * Sustained Attention — vigilance over a long run (ms session length cap).
 * Higher θ = longer session = more demand on sustained attention.
 *
 * No clean public norm; within-user trajectory only.
 */
export const SUSTAINED_ATTENTION: DimensionDefinition = {
  id: 'sustainedAttention',
  label: 'Sustained Attention',
  shortLabel: 'FOCUS',
  lever: 'sessionDuration',
  staircase: {
    initialTheta: 60_000,
    initialStep: 15_000,
    stepFloor: 5_000,
    stepShrinkFactor: 0.7,
    thetaMin: 30_000,
    thetaMax: 300_000,
    upRule: 3,
  },
  norm: null,
  thetaToLeverValue: (theta) => Math.round(theta),
};

export const DIMENSIONS: Record<DimensionId, DimensionDefinition> = {
  workingMemory: WORKING_MEMORY,
  processingSpeed: PROCESSING_SPEED,
  inhibition: INHIBITION,
  flexibility: FLEXIBILITY,
  sustainedAttention: SUSTAINED_ATTENTION,
};

export const DIMENSION_IDS: DimensionId[] = [
  'workingMemory',
  'processingSpeed',
  'inhibition',
  'flexibility',
  'sustainedAttention',
];

/**
 * For game modes, declare which dimensions are primarily exercised.
 * This drives which staircases run during the session and which
 * percentiles surface on results.
 */
export const MODE_DIMENSIONS: Record<string, DimensionId[]> = {
  arc: ['workingMemory', 'processingSpeed', 'flexibility', 'sustainedAttention'],
  tide: ['workingMemory', 'flexibility', 'sustainedAttention'],
  ember: ['processingSpeed', 'sustainedAttention'],
  halt: ['inhibition', 'processingSpeed', 'sustainedAttention'],
};
