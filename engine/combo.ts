/**
 * Combo state machine — the dopamine ratchet.
 *
 * Perfect rounds in a row build a combo. Each tier carries a louder visual
 * + score multiplier. Mistake breaks the combo loudly. The asymmetry —
 * small reward to climb, sharp loss to fall — is the point.
 *
 * Pure: takes (state, isPerfect) and returns the next state.
 */

export interface ComboTier {
  /** Combo count at which this tier activates. */
  threshold: number;
  /** Display label (e.g. 'On Fire'). */
  label: string;
  /** Score multiplier when this tier is active. */
  multiplier: number;
  /** Whether this tier grants a one-shot mutation shield. */
  shield: boolean;
}

export const COMBO_TIERS: ComboTier[] = [
  { threshold: 0, label: '', multiplier: 1.0, shield: false },
  { threshold: 2, label: 'Combo', multiplier: 1.0, shield: false },
  { threshold: 3, label: 'On Fire', multiplier: 1.5, shield: false },
  { threshold: 5, label: 'Untouchable', multiplier: 2.0, shield: true },
  { threshold: 10, label: 'Master', multiplier: 3.0, shield: false },
];

export interface ComboState {
  /** Number of consecutive perfect rounds. Resets on miss. */
  count: number;
  /** Highest tier ever reached this run. Doesn't reset on break. */
  peakLabel: string;
  /** Highest combo count this run. */
  peakCount: number;
  /** Whether the shield is currently available (not yet consumed this run). */
  shieldAvailable: boolean;
  /**
   * Whether the shield has *ever* been granted this run. Once true, it
   * stays true even after the shield is consumed — prevents re-grant on
   * climb-back-after-break.
   */
  shieldEverEarned: boolean;
  /** True for exactly one update cycle right after a combo breaks. */
  justBroke: boolean;
  /** True for one update when a tier is freshly activated this round. */
  justEntered: ComboTier | null;
}

export const INITIAL_COMBO: ComboState = {
  count: 0,
  peakLabel: '',
  peakCount: 0,
  shieldAvailable: false,
  shieldEverEarned: false,
  justBroke: false,
  justEntered: null,
};

/**
 * Advance combo by one round.
 * `isPerfect` = round completed without any wrong tap.
 */
export function applyCombo(
  state: ComboState,
  isPerfect: boolean
): ComboState {
  if (!isPerfect) {
    // Break — count resets, justBroke fires once.
    if (state.count > 0) {
      return {
        ...state,
        count: 0,
        justBroke: true,
        justEntered: null,
      };
    }
    return { ...state, justBroke: false, justEntered: null };
  }

  const nextCount = state.count + 1;
  const prevTier = activeTier(state.count);
  const nextTier = activeTier(nextCount);

  const justEntered =
    nextTier.threshold > prevTier.threshold ? nextTier : null;
  // Shield is earned only the first time the user crosses an Untouchable-
  // class tier this run. Once earned, shieldEverEarned latches true and
  // prevents re-grant — even after consume + climb-back.
  const earnsShield =
    justEntered?.shield === true && !state.shieldEverEarned;

  return {
    count: nextCount,
    peakLabel: nextTier.label || state.peakLabel,
    peakCount: Math.max(state.peakCount, nextCount),
    shieldAvailable: state.shieldAvailable || earnsShield,
    shieldEverEarned: state.shieldEverEarned || earnsShield,
    justBroke: false,
    justEntered,
  };
}

/**
 * Returns the active tier for a given combo count.
 * Highest threshold ≤ count wins.
 */
export function activeTier(count: number): ComboTier {
  let active = COMBO_TIERS[0];
  for (const tier of COMBO_TIERS) {
    if (count >= tier.threshold) active = tier;
  }
  return active;
}

/**
 * Score multiplier for the current combo state.
 */
export function comboMultiplier(state: ComboState): number {
  return activeTier(state.count).multiplier;
}

/**
 * Consume the one-shot shield. Returns the new state plus whether
 * a shield was available to consume. Called when a mutation round
 * would have failed.
 */
export function consumeShield(state: ComboState): {
  next: ComboState;
  consumed: boolean;
} {
  if (!state.shieldAvailable) {
    return { next: state, consumed: false };
  }
  return {
    next: { ...state, shieldAvailable: false },
    consumed: true,
  };
}
