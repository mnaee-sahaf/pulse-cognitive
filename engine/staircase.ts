/**
 * 3-down-1-up adaptive staircase procedure.
 *
 * Levitt 1971 — Transformed up-down methods in psychoacoustics.
 * J. Acoust. Soc. Am. 49(2), 467-477. The 3-down-1-up procedure converges to
 * the difficulty θ where P(correct) ≈ 0.7937 (= 0.5^(1/3)).
 *
 * Why 79.4%? It's the operating point that maximizes information gain per
 * trial for binary classification (cf. Wilson et al. 2019 — The Eighty Five
 * Percent Rule for optimal learning). It also keeps the player at the edge
 * of their ability — too easy means no learning, too hard means quitting.
 *
 * This module is pure: no side effects, no I/O. Same input → same output.
 */

export interface StaircaseConfig {
  /** Starting difficulty θ. */
  initialTheta: number;
  /** Initial step size. Shrinks on reversals. */
  initialStep: number;
  /** Minimum step size. Step won't shrink below this. */
  stepFloor: number;
  /**
   * Multiplier applied to step on each reversal (every direction change).
   * Levitt 1971 suggests 0.5–0.7. We default to 0.7 for slightly slower
   * convergence with more stable threshold estimates.
   */
  stepShrinkFactor: number;
  /** Hard lower bound on θ. */
  thetaMin: number;
  /** Hard upper bound on θ. */
  thetaMax: number;
  /**
   * "N" in the N-down-1-up rule. 3 → converges at 79.4%. 2 → 70.7%. 1 → 50%.
   */
  upRule: number;
}

export interface StaircaseState {
  /** Current difficulty target. */
  theta: number;
  /** Current step size. Monotonically decreases via shrinkFactor. */
  step: number;
  /** Number of consecutive correct responses since last incorrect. */
  consecutiveCorrect: number;
  /** Total reversals (direction changes) seen so far. */
  reversals: number;
  /** Direction of the last θ change, used to detect reversals. */
  lastDirection: 'up' | 'down' | null;
  /** Total responses processed (for diagnostics). */
  totalResponses: number;
}

export const DEFAULT_STAIRCASE_CONFIG: Omit<
  StaircaseConfig,
  'initialTheta' | 'thetaMin' | 'thetaMax'
> = {
  initialStep: 4,
  stepFloor: 1,
  stepShrinkFactor: 0.7,
  upRule: 3,
};

export function createStaircase(config: StaircaseConfig): StaircaseState {
  return {
    theta: config.initialTheta,
    step: config.initialStep,
    consecutiveCorrect: 0,
    reversals: 0,
    lastDirection: null,
    totalResponses: 0,
  };
}

/**
 * Apply a single response to the staircase.
 * Returns the updated state (immutable; original is untouched).
 *
 * - Correct response: counter += 1; if it reaches `upRule`, θ goes up by `step`
 *   and counter resets.
 * - Incorrect response: θ goes down by `step` immediately; counter resets.
 *
 * Reversals (direction changes) shrink the step size, allowing fine-grained
 * threshold estimation as the staircase settles.
 */
export function applyResponse(
  state: StaircaseState,
  correct: boolean,
  config: StaircaseConfig
): StaircaseState {
  const totalResponses = state.totalResponses + 1;

  if (correct) {
    const consecutiveCorrect = state.consecutiveCorrect + 1;
    if (consecutiveCorrect < config.upRule) {
      return { ...state, consecutiveCorrect, totalResponses };
    }
    // Step up.
    return applyDirectionChange(
      { ...state, consecutiveCorrect: 0, totalResponses },
      'up',
      config
    );
  }

  // Incorrect: step down immediately.
  return applyDirectionChange(
    { ...state, consecutiveCorrect: 0, totalResponses },
    'down',
    config
  );
}

function applyDirectionChange(
  state: StaircaseState,
  direction: 'up' | 'down',
  config: StaircaseConfig
): StaircaseState {
  const isReversal =
    state.lastDirection !== null && state.lastDirection !== direction;

  // Step shrinks on every reversal (Levitt 1971 §III.A).
  let nextStep = state.step;
  let nextReversals = state.reversals;
  if (isReversal) {
    nextReversals += 1;
    nextStep = Math.max(
      config.stepFloor,
      state.step * config.stepShrinkFactor
    );
  }

  const delta = direction === 'up' ? state.step : -state.step;
  const nextTheta = clamp(state.theta + delta, config.thetaMin, config.thetaMax);

  return {
    ...state,
    theta: nextTheta,
    step: nextStep,
    reversals: nextReversals,
    lastDirection: direction,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Returns an estimate of the threshold from a converged staircase.
 * Standard practice: average of θ across the last K reversals (default 6),
 * which smooths out the residual oscillation around the true threshold.
 *
 * In production we track reversal θ values explicitly; for now this is a
 * simple post-session estimate from the current state. Use only after the
 * staircase has had time to converge (~10+ reversals).
 */
export function thresholdEstimate(state: StaircaseState): number {
  return state.theta;
}

/**
 * Theoretical convergence point (probability of correct response at
 * asymptotic θ) for an N-down-1-up procedure. For N=3, this is 0.7937.
 */
export function targetCorrectRate(upRule: number): number {
  return Math.pow(0.5, 1 / upRule);
}
