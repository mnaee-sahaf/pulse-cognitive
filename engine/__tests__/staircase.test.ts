import {
  createStaircase,
  applyResponse,
  targetCorrectRate,
  type StaircaseConfig,
} from '../staircase';

const baseConfig: StaircaseConfig = {
  initialTheta: 10,
  initialStep: 4,
  stepFloor: 1,
  stepShrinkFactor: 0.7,
  thetaMin: 0,
  thetaMax: 30,
  upRule: 3,
};

describe('createStaircase', () => {
  it('initializes from config', () => {
    const s = createStaircase(baseConfig);
    expect(s.theta).toBe(10);
    expect(s.step).toBe(4);
    expect(s.consecutiveCorrect).toBe(0);
    expect(s.reversals).toBe(0);
    expect(s.lastDirection).toBeNull();
    expect(s.totalResponses).toBe(0);
  });
});

describe('applyResponse — basic mechanics', () => {
  it('counts correct responses without changing theta until upRule', () => {
    let s = createStaircase(baseConfig);
    s = applyResponse(s, true, baseConfig);
    expect(s.theta).toBe(10);
    expect(s.consecutiveCorrect).toBe(1);
    s = applyResponse(s, true, baseConfig);
    expect(s.theta).toBe(10);
    expect(s.consecutiveCorrect).toBe(2);
  });

  it('steps theta up after upRule (3) consecutive correct', () => {
    let s = createStaircase(baseConfig);
    s = applyResponse(s, true, baseConfig);
    s = applyResponse(s, true, baseConfig);
    s = applyResponse(s, true, baseConfig);
    expect(s.theta).toBe(14);
    expect(s.consecutiveCorrect).toBe(0);
    expect(s.lastDirection).toBe('up');
  });

  it('steps theta down immediately on a single incorrect', () => {
    let s = createStaircase(baseConfig);
    s = applyResponse(s, false, baseConfig);
    expect(s.theta).toBe(6);
    expect(s.consecutiveCorrect).toBe(0);
    expect(s.lastDirection).toBe('down');
  });

  it('resets consecutiveCorrect on incorrect', () => {
    let s = createStaircase(baseConfig);
    s = applyResponse(s, true, baseConfig);
    s = applyResponse(s, true, baseConfig);
    s = applyResponse(s, false, baseConfig);
    expect(s.consecutiveCorrect).toBe(0);
  });

  it('clamps theta to [thetaMin, thetaMax]', () => {
    let s = createStaircase({ ...baseConfig, initialTheta: 0 });
    s = applyResponse(s, false, { ...baseConfig, initialTheta: 0 });
    expect(s.theta).toBe(0);

    let t = createStaircase({ ...baseConfig, initialTheta: 30 });
    t = applyResponse(t, true, baseConfig);
    t = applyResponse(t, true, baseConfig);
    t = applyResponse(t, true, baseConfig);
    expect(t.theta).toBe(30);
  });
});

describe('applyResponse — reversals and step shrinking', () => {
  it('counts a reversal when direction changes', () => {
    let s = createStaircase(baseConfig);
    // Three correct → step up. lastDirection='up'.
    s = applyResponse(s, true, baseConfig);
    s = applyResponse(s, true, baseConfig);
    s = applyResponse(s, true, baseConfig);
    expect(s.reversals).toBe(0);
    // One incorrect → step down. Reversal up→down.
    s = applyResponse(s, false, baseConfig);
    expect(s.reversals).toBe(1);
  });

  it('shrinks step by stepShrinkFactor on each reversal', () => {
    let s = createStaircase(baseConfig);
    // up reversal
    s = applyResponse(s, true, baseConfig);
    s = applyResponse(s, true, baseConfig);
    s = applyResponse(s, true, baseConfig);
    expect(s.step).toBe(4); // first direction, no reversal yet
    // down reversal #1: step should shrink to 4*0.7 = 2.8
    s = applyResponse(s, false, baseConfig);
    expect(s.step).toBeCloseTo(2.8);
    // up reversal #2: step shrinks again to 2.8*0.7 = 1.96
    s = applyResponse(s, true, baseConfig);
    s = applyResponse(s, true, baseConfig);
    s = applyResponse(s, true, baseConfig);
    expect(s.step).toBeCloseTo(1.96);
  });

  it('floors step at stepFloor', () => {
    const tightConfig = { ...baseConfig, stepFloor: 2 };
    let s = createStaircase(tightConfig);
    // Drive many reversals to hit the floor
    for (let i = 0; i < 50; i++) {
      s = applyResponse(s, i % 2 === 0, tightConfig);
    }
    expect(s.step).toBeGreaterThanOrEqual(2);
  });
});

describe('targetCorrectRate', () => {
  it('returns 0.7937 for upRule=3', () => {
    expect(targetCorrectRate(3)).toBeCloseTo(0.7937, 3);
  });
  it('returns 0.7071 for upRule=2', () => {
    expect(targetCorrectRate(2)).toBeCloseTo(0.7071, 3);
  });
  it('returns 0.5 for upRule=1', () => {
    expect(targetCorrectRate(1)).toBeCloseTo(0.5, 3);
  });
});

describe('convergence simulation — 3-down-1-up', () => {
  /**
   * Logistic psychometric: P(correct | θ, ability A, slope s) = 1 / (1 + exp(-(A - θ)/s))
   * For ability A=20, slope s=1, the staircase should converge so that
   * P(correct) ≈ 0.7937 at θ_final, which gives:
   *   (A - θ)/s = log(0.7937 / 0.2063) ≈ 1.346
   *   θ_final ≈ A - 1.346 ≈ 18.654
   */
  it('converges to ~18.65 for ability=20, slope=1, upRule=3 over 600 trials', () => {
    const config: StaircaseConfig = {
      initialTheta: 14,
      initialStep: 2,
      stepFloor: 0.25,
      stepShrinkFactor: 0.7,
      thetaMin: 0,
      thetaMax: 30,
      upRule: 3,
    };
    const ability = 20;
    const slope = 1;

    // Deterministic-ish simulation using a seeded LCG so the test is reproducible.
    let seed = 42;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 2 ** 32;
      return seed / 2 ** 32;
    };

    let s = createStaircase(config);
    const thetaHistory: number[] = [];
    for (let i = 0; i < 600; i++) {
      const pCorrect = 1 / (1 + Math.exp(-(ability - s.theta) / slope));
      const correct = rand() < pCorrect;
      s = applyResponse(s, correct, config);
      thetaHistory.push(s.theta);
    }

    // Average θ over the last 200 trials should be near the asymptotic threshold.
    const tail = thetaHistory.slice(-200);
    const meanTail = tail.reduce((a, b) => a + b, 0) / tail.length;
    expect(meanTail).toBeGreaterThan(18.0);
    expect(meanTail).toBeLessThan(19.5);
  });

  it('observed correct rate at converged θ is approximately 79.4%', () => {
    const config: StaircaseConfig = {
      initialTheta: 14,
      initialStep: 2,
      stepFloor: 0.25,
      stepShrinkFactor: 0.7,
      thetaMin: 0,
      thetaMax: 30,
      upRule: 3,
    };
    const ability = 20;
    const slope = 1;

    let seed = 17;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) % 2 ** 32;
      return seed / 2 ** 32;
    };

    let s = createStaircase(config);
    let correctCountTail = 0;
    let trialsTail = 0;
    for (let i = 0; i < 800; i++) {
      const pCorrect = 1 / (1 + Math.exp(-(ability - s.theta) / slope));
      const correct = rand() < pCorrect;
      // Only count after burn-in (300 trials) so we measure post-convergence behavior.
      if (i >= 300) {
        if (correct) correctCountTail += 1;
        trialsTail += 1;
      }
      s = applyResponse(s, correct, config);
    }
    const observedRate = correctCountTail / trialsTail;
    // Theoretical 79.4%; allow ±5% for finite-sample noise.
    expect(observedRate).toBeGreaterThan(0.745);
    expect(observedRate).toBeLessThan(0.85);
  });
});
