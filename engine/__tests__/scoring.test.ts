import {
  streakMultiplier,
  calcRoundScore,
  calcRtDistribution,
  calcPulseIndex,
  calcCognitiveScores,
  type RoundScoreInput,
  type CognitiveScores,
} from '../scoring';

// ── streakMultiplier ──

describe('streakMultiplier', () => {
  it('returns 1.0 for streak < 2', () => {
    expect(streakMultiplier(0)).toBe(1.0);
    expect(streakMultiplier(1)).toBe(1.0);
  });

  it('returns 1.2 for streak 2', () => {
    expect(streakMultiplier(2)).toBe(1.2);
  });

  it('returns 1.4 for streak 3–4', () => {
    expect(streakMultiplier(3)).toBe(1.4);
    expect(streakMultiplier(4)).toBe(1.4);
  });

  it('returns 1.6 for streak 5–7', () => {
    expect(streakMultiplier(5)).toBe(1.6);
    expect(streakMultiplier(7)).toBe(1.6);
  });

  it('caps at 1.8 for streak 8+', () => {
    expect(streakMultiplier(8)).toBe(1.8);
    expect(streakMultiplier(100)).toBe(1.8);
  });
});

// ── calcRoundScore ──

describe('calcRoundScore', () => {
  const baseInput: RoundScoreInput = {
    sequenceLength: 4,
    tapRts: [300, 350, 400, 250],
    mutationActive: false,
    engineIntensity: 0,
    perfectStreak: 0,
  };

  it('computes base points from sequence length × 10', () => {
    const noSpeedInput: RoundScoreInput = {
      ...baseInput,
      tapRts: [500, 500, 500, 500], // no speed bonus (500 - 500 = 0)
    };
    // basePoints = 4 * 10 = 40, speedBonus = 0, multipliers all 1.0
    expect(calcRoundScore(noSpeedInput)).toBe(40);
  });

  it('adds speed bonus for fast taps (500 - rt)', () => {
    // basePoints = 40, speedBonus = (200 + 150 + 100 + 250) = 700
    // total = (40 + 700) * 1.0 * 1.0 * 1.0 = 740
    expect(calcRoundScore(baseInput)).toBe(740);
  });

  it('applies 1.5x mutation multiplier', () => {
    const withMutation: RoundScoreInput = {
      ...baseInput,
      tapRts: [500, 500, 500, 500],
      mutationActive: true,
    };
    // 40 * 1.5 = 60
    expect(calcRoundScore(withMutation)).toBe(60);
  });

  it('applies difficulty multiplier from engine intensity', () => {
    const withIntensity: RoundScoreInput = {
      ...baseInput,
      tapRts: [500, 500, 500, 500],
      engineIntensity: 1.0,
    };
    // 40 * 1.0 * (1.0 + 1.0 * 0.5) = 40 * 1.5 = 60
    expect(calcRoundScore(withIntensity)).toBe(60);
  });

  it('applies streak combo multiplier', () => {
    const withStreak: RoundScoreInput = {
      ...baseInput,
      tapRts: [500, 500, 500, 500],
      perfectStreak: 8,
    };
    // 40 * 1.0 * 1.0 * 1.8 = 72
    expect(calcRoundScore(withStreak)).toBe(72);
  });

  it('stacks all multipliers', () => {
    const full: RoundScoreInput = {
      sequenceLength: 4,
      tapRts: [500, 500, 500, 500],
      mutationActive: true,
      engineIntensity: 1.0,
      perfectStreak: 8,
    };
    // 40 * 1.5 * 1.5 * 1.8 = 162
    expect(calcRoundScore(full)).toBe(162);
  });

  it('clamps speed bonus at 0 for slow taps (rt >= 500)', () => {
    const slow: RoundScoreInput = {
      ...baseInput,
      tapRts: [600, 700, 800, 900],
    };
    // speedBonus = 0 for all, basePoints = 40
    expect(calcRoundScore(slow)).toBe(40);
  });
});

// ── calcRtDistribution ──

describe('calcRtDistribution', () => {
  it('returns zeros for fewer than 3 RTs', () => {
    expect(calcRtDistribution([])).toEqual({
      meanRt: 0, sdRt: 0, coefficientOfVariation: 0, skewness: 0,
    });
    expect(calcRtDistribution([300, 400])).toEqual({
      meanRt: 0, sdRt: 0, coefficientOfVariation: 0, skewness: 0,
    });
  });

  it('computes correct mean for uniform values', () => {
    const result = calcRtDistribution([300, 300, 300]);
    expect(result.meanRt).toBe(300);
    expect(result.sdRt).toBe(0);
    expect(result.coefficientOfVariation).toBe(0);
  });

  it('computes SD and CV for varied RTs', () => {
    const result = calcRtDistribution([200, 400, 300]);
    expect(result.meanRt).toBe(300);
    expect(result.sdRt).toBe(100);
    // CV = 100 / 300 ≈ 0.333
    expect(result.coefficientOfVariation).toBeCloseTo(0.333, 2);
  });

  it('detects positive skewness (occasional slow responses)', () => {
    // Mostly fast, one slow outlier → positive skew
    const result = calcRtDistribution([200, 200, 200, 200, 200, 800]);
    expect(result.skewness).toBeGreaterThan(0);
  });
});

// ── calcPulseIndex ──

describe('calcPulseIndex', () => {
  it('returns weighted composite + 10 reserve', () => {
    const perfect: CognitiveScores = {
      rtScore: 100, wmScore: 100, flexScore: 100,
      decisionScore: 100, impulseScore: 100,
    };
    // 25 + 20 + 15 + 15 + 15 + 10 = 100
    expect(calcPulseIndex(perfect)).toBe(100);
  });

  it('returns 10 for all-zero scores (reserve only)', () => {
    const zero: CognitiveScores = {
      rtScore: 0, wmScore: 0, flexScore: 0,
      decisionScore: 0, impulseScore: 0,
    };
    expect(calcPulseIndex(zero)).toBe(10);
  });

  it('correctly weights individual dimensions', () => {
    // Only rtScore = 100, rest = 0 → 25 + 10 = 35
    const rtOnly: CognitiveScores = {
      rtScore: 100, wmScore: 0, flexScore: 0,
      decisionScore: 0, impulseScore: 0,
    };
    expect(calcPulseIndex(rtOnly)).toBe(35);
  });
});

// ── calcCognitiveScores ──

describe('calcCognitiveScores', () => {
  it('maps 200ms avg RT to rtScore 100', () => {
    const scores = calcCognitiveScores([200], 5, 0, 0, 0.8);
    expect(scores.rtScore).toBe(100);
  });

  it('maps 800ms avg RT to rtScore 0', () => {
    const scores = calcCognitiveScores([800], 5, 0, 0, 0.8);
    expect(scores.rtScore).toBe(0);
  });

  it('clamps rtScore between 0 and 100', () => {
    const fast = calcCognitiveScores([100], 5, 0, 0, 0.8);
    expect(fast.rtScore).toBeLessThanOrEqual(100);
    const slow = calcCognitiveScores([1000], 5, 0, 0, 0.8);
    expect(slow.rtScore).toBeGreaterThanOrEqual(0);
  });

  it('maps sequence length 3 to wmScore 0, 12 to 100', () => {
    const low = calcCognitiveScores([400], 3, 0, 0, 0.8);
    expect(low.wmScore).toBe(0);
    const high = calcCognitiveScores([400], 12, 0, 0, 0.8);
    expect(high.wmScore).toBe(100);
  });

  it('computes flexScore from mutation survival rate', () => {
    const scores = calcCognitiveScores([400], 5, 10, 8, 0.8);
    expect(scores.flexScore).toBe(80); // 8/10 * 100
  });

  it('defaults flexScore to 50 when no mutations faced', () => {
    const scores = calcCognitiveScores([400], 5, 0, 0, 0.8);
    expect(scores.flexScore).toBe(50);
  });

  it('computes decisionScore from accuracy at peak tempo', () => {
    const scores = calcCognitiveScores([400], 5, 0, 0, 0.75);
    expect(scores.decisionScore).toBe(75);
  });

  it('defaults impulseScore to 50 without HALT metrics', () => {
    const scores = calcCognitiveScores([400], 5, 0, 0, 0.8);
    expect(scores.impulseScore).toBe(50);
  });

  it('computes impulseScore from HALT metrics', () => {
    const scores = calcCognitiveScores([400], 5, 0, 0, 0.8, {
      ssrt: 200,
      dPrime: 3.0,
      commissionErrors: 1,
      totalTrials: 20,
    });
    // Should be higher than default 50 with good HALT performance
    expect(scores.impulseScore).toBeGreaterThan(50);
  });

  it('penalizes impulseScore for high commission error rate', () => {
    const good = calcCognitiveScores([400], 5, 0, 0, 0.8, {
      ssrt: 200, dPrime: 3.0, commissionErrors: 1, totalTrials: 20,
    });
    const bad = calcCognitiveScores([400], 5, 0, 0, 0.8, {
      ssrt: 200, dPrime: 3.0, commissionErrors: 10, totalTrials: 20,
    });
    expect(good.impulseScore).toBeGreaterThan(bad.impulseScore);
  });
});
