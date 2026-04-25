/**
 * Wave system — visible difficulty escalation within a run.
 *
 * Each session is divided into named waves with hard cuts. Wave entry is
 * a *moment* (banner + sound + haptic) — that's the dopamine ratchet that
 * v1 lacked.
 *
 * Wave is computed from current round count + (in late waves) random boss
 * spice. Pure function: given roundCount, returns the active wave with
 * everything the game loop needs to render and the engine needs to know
 * which difficulty modifiers are active.
 */

export type WaveName = 'Warmup' | 'Building' | 'Peak' | 'Storm' | 'Surge' | 'Boss';

export interface WaveDefinition {
  index: number;             // 1-indexed wave number
  name: WaveName;
  /** Inclusive lower bound (1-indexed round). */
  startRound: number;
  /** Inclusive upper bound. Infinity for the endless boss wave. */
  endRound: number;
  /** Whether mutations can fire during this wave. */
  mutationsEnabled: boolean;
  /** Multiplier applied to round score during this wave. */
  scoreMultiplier: number;
  /** Player-facing tagline used on wave-entry banner. */
  tagline: string;
}

/**
 * Wave schedule. Boundaries are tunable; encoded here so they can be
 * adjusted without touching game-loop code.
 */
export const WAVES: WaveDefinition[] = [
  {
    index: 1,
    name: 'Warmup',
    startRound: 1,
    endRound: 5,
    mutationsEnabled: false,
    scoreMultiplier: 1.0,
    tagline: 'Find your rhythm.',
  },
  {
    index: 2,
    name: 'Building',
    startRound: 6,
    endRound: 10,
    mutationsEnabled: false,
    scoreMultiplier: 1.2,
    tagline: 'Engine reading you.',
  },
  {
    index: 3,
    name: 'Peak',
    startRound: 11,
    endRound: 15,
    mutationsEnabled: false,
    scoreMultiplier: 1.5,
    tagline: 'Top of your range.',
  },
  {
    index: 4,
    name: 'Storm',
    startRound: 16,
    endRound: 25,
    mutationsEnabled: true,
    scoreMultiplier: 2.0,
    tagline: 'Mutations unlocked.',
  },
  {
    index: 5,
    name: 'Surge',
    startRound: 26,
    endRound: 35,
    mutationsEnabled: true,
    scoreMultiplier: 3.0,
    tagline: 'No mercy.',
  },
  {
    index: 6,
    name: 'Boss',
    startRound: 36,
    endRound: Number.POSITIVE_INFINITY,
    mutationsEnabled: true,
    scoreMultiplier: 5.0,
    tagline: 'You are deep in the unknown.',
  },
];

/**
 * Returns the active wave for a given round number (1-indexed).
 * roundCount=0 returns Warmup (the player hasn't started the first round
 * but should see the Warmup banner).
 */
export function currentWave(roundCount: number): WaveDefinition {
  const round = Math.max(1, roundCount);
  for (const wave of WAVES) {
    if (round >= wave.startRound && round <= wave.endRound) {
      return wave;
    }
  }
  // Fallback — should never trigger because the last wave is endless.
  return WAVES[WAVES.length - 1];
}

/**
 * Returns true if the round number is the first round of a new wave
 * (i.e. wave just changed). Used to fire entry banner + sound + haptic.
 */
export function isWaveEntry(roundCount: number): boolean {
  if (roundCount < 1) return false;
  return WAVES.some((w) => w.startRound === roundCount);
}

/**
 * Returns true if the round is a "boss round" — special harder gauntlet.
 * Within the Boss wave, every 5th round (40, 45, 50, ...) is a boss
 * round with all mutations active and an extra score multiplier.
 *
 * Tuneable: change `bossInterval` to control frequency.
 */
export function isBossRound(roundCount: number, bossInterval = 5): boolean {
  const wave = currentWave(roundCount);
  if (wave.name !== 'Boss') return false;
  const offsetIntoBoss = roundCount - wave.startRound;
  return offsetIntoBoss > 0 && offsetIntoBoss % bossInterval === 0;
}

/**
 * Compute the score for a round, accounting for wave multiplier,
 * boss bonus, and combo multiplier. Pure.
 */
export function computeRoundScore(
  baseScore: number,
  roundCount: number,
  comboMultiplier: number
): number {
  const wave = currentWave(roundCount);
  const bossBonus = isBossRound(roundCount) ? 2.0 : 1.0;
  return Math.round(baseScore * wave.scoreMultiplier * bossBonus * comboMultiplier);
}

/**
 * Returns the highest wave reached given the highest round completed
 * during a run.
 */
export function highestWaveReached(highestRound: number): WaveDefinition {
  return currentWave(highestRound);
}
