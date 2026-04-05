export interface RoundScoreInput {
  sequenceLength: number;
  tapRts: number[];          // per-tap reaction times in ms
  mutationActive: boolean;
  engineIntensity: number;   // 0.0 – 1.0
  perfectStreak: number;     // consecutive perfect rounds (0 = no streak)
}

/** Combo multiplier based on consecutive perfect rounds. */
export function streakMultiplier(streak: number): number {
  if (streak < 2) return 1.0;
  if (streak < 3) return 1.2;
  if (streak < 5) return 1.4;
  if (streak < 8) return 1.6;
  return 1.8; // 8+ streak
}

export function calcRoundScore(input: RoundScoreInput): number {
  const basePoints = input.sequenceLength * 10;

  const speedBonus = input.tapRts.reduce((sum, rt) => {
    return sum + Math.max(0, 500 - rt);
  }, 0);

  const mutationMultiplier = input.mutationActive ? 1.5 : 1.0;
  const difficultyMultiplier = 1.0 + input.engineIntensity * 0.5;
  const combo = streakMultiplier(input.perfectStreak);

  return Math.round(
    (basePoints + speedBonus) * mutationMultiplier * difficultyMultiplier * combo
  );
}

export interface CognitiveScores {
  rtScore: number;       // 0–100 processing speed
  wmScore: number;       // 0–100 working memory
  flexScore: number;     // 0–100 cognitive flexibility
  decisionScore: number; // 0–100 decision efficiency
  impulseScore: number;  // 0–100 impulse control (HALT mode)
}

/** HALT mode data passed into cognitive scoring */
export interface HaltMetrics {
  ssrt: number;
  dPrime: number;
  commissionErrors: number;
  totalTrials: number;
}

/**
 * Derives 0–100 scores for each cognitive dimension from session data.
 */
export function calcCognitiveScores(
  allRts: number[],
  maxSequenceReached: number,
  mutationsFaced: number,
  mutationsSurvived: number,
  accuracyAtPeakTempo: number, // 0.0–1.0
  haltMetrics?: HaltMetrics
): CognitiveScores {
  // RT score: 200ms = 100, 800ms = 0
  const avgRt = allRts.length > 0
    ? allRts.reduce((a, b) => a + b, 0) / allRts.length
    : 500;
  const rtScore = Math.max(0, Math.min(100, Math.round(((800 - avgRt) / 600) * 100)));

  // WM score: sequence of 3 = 0, sequence of 12 = 100
  const wmScore = Math.max(0, Math.min(100, Math.round(((maxSequenceReached - 3) / 9) * 100)));

  // Flex score: mutation survival rate
  const flexScore = mutationsFaced === 0
    ? 50 // neutral if no mutations
    : Math.round((mutationsSurvived / mutationsFaced) * 100);

  // Decision score: accuracy at peak tempo
  const decisionScore = Math.round(accuracyAtPeakTempo * 100);

  // Impulse control score: based on SSRT and d-prime (HALT mode only)
  let impulseScore = 50; // neutral default for non-HALT modes
  if (haltMetrics && haltMetrics.totalTrials > 0) {
    const ssrtScore = Math.max(0, Math.min(100, Math.round(((400 - haltMetrics.ssrt) / 300) * 100)));
    const dPrimeScore = Math.max(0, Math.min(100, Math.round((haltMetrics.dPrime / 4) * 100)));
    const errorRate = haltMetrics.commissionErrors / haltMetrics.totalTrials;
    const errorPenalty = Math.max(0, 1 - errorRate * 2);
    impulseScore = Math.round((ssrtScore * 0.5 + dPrimeScore * 0.3) * errorPenalty + dPrimeScore * 0.2);
  }

  return { rtScore, wmScore, flexScore, decisionScore, impulseScore };
}
