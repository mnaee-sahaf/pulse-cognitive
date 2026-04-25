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

/** RT distribution metrics for trend analysis */
export interface RtDistributionMetrics {
  meanRt: number;
  sdRt: number;
  coefficientOfVariation: number;  // IIV — sdRt / meanRt (lower = more consistent)
  skewness: number;                // positive skew = occasional slow responses
}

/**
 * Computes RT distribution metrics from a session's reaction times.
 * IIV (intraindividual variability) is the strongest predictor of
 * cognitive decline per Jutten et al. (2023) and Bielak et al. (2017).
 */
export function calcRtDistribution(allRts: number[]): RtDistributionMetrics {
  if (allRts.length < 3) {
    return { meanRt: 0, sdRt: 0, coefficientOfVariation: 0, skewness: 0 };
  }

  const n = allRts.length;
  const mean = allRts.reduce((a, b) => a + b, 0) / n;

  const variance = allRts.reduce((sum, rt) => sum + (rt - mean) ** 2, 0) / (n - 1);
  const sd = Math.sqrt(variance);
  const cv = mean > 0 ? sd / mean : 0;

  // Fisher-Pearson skewness coefficient
  const m3 = allRts.reduce((sum, rt) => sum + ((rt - mean) / sd) ** 3, 0) / n;
  const skewness = sd > 0 ? m3 : 0;

  return {
    meanRt: Math.round(mean),
    sdRt: Math.round(sd),
    coefficientOfVariation: Math.round(cv * 1000) / 1000,
    skewness: Math.round(skewness * 100) / 100,
  };
}

/**
 * Computes the Pulse Index — a single composite cognitive score (0–100)
 * weighted by evidence-supported importance of each dimension.
 */
export function calcPulseIndex(scores: CognitiveScores): number {
  return Math.round(
    scores.rtScore * 0.25 +       // Processing Speed — strongest transfer evidence
    scores.wmScore * 0.20 +        // Working Memory — strongest predictor of intelligence
    scores.flexScore * 0.15 +      // Cognitive Flexibility — critical for adaptive behavior
    scores.decisionScore * 0.15 +  // Decision Efficiency — DDM support
    scores.impulseScore * 0.15 +   // Impulse Control — high clinical relevance
    10                              // 10% reserved for future Spatial Reasoning dimension
  );
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
