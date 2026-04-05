import {
  initEngine,
  updateEngine,
  selectMutation,
  type PlayerProfile,
  type EngineState,
  type RoundPerformance,
} from '../adaptiveEngine';
import { ENGINE_CONFIG_DEFAULTS } from '../engineConfig';

// ── Helpers ──

function makePerf(overrides: Partial<RoundPerformance> = {}): RoundPerformance {
  return {
    correct: 4,
    total: 4,
    avgRt: 300,
    mutationSurvived: null,
    ...overrides,
  };
}

const fastProfile: PlayerProfile = {
  baselineRt: 220,
  wmCapacity: 8,
  flexRating: 0.9,
  speedAccuracyThreshold: 300,
};

const slowProfile: PlayerProfile = {
  baselineRt: 480,
  wmCapacity: 4,
  flexRating: 0.2,
  speedAccuracyThreshold: 400,
};

// ── initEngine ──

describe('initEngine', () => {
  it('uses default profile when null', () => {
    const state = initEngine(null);
    expect(state.levers.gridSize).toBe(3);
    expect(state.roundHistory).toHaveLength(0);
    expect(state.intensity).toBe(0);
  });

  it('seeds faster tempo for fast players', () => {
    const fast = initEngine(fastProfile);
    const slow = initEngine(slowProfile);
    // Faster player gets more aggressive tempo ramp (more negative)
    expect(fast.levers.tempoRamp).toBeLessThan(slow.levers.tempoRamp);
  });

  it('seeds higher sequence growth for high WM capacity', () => {
    const fast = initEngine(fastProfile);
    const slow = initEngine(slowProfile);
    expect(fast.levers.sequenceGrowth).toBeGreaterThanOrEqual(slow.levers.sequenceGrowth);
  });

  it('seeds higher mutation rate for high flex rating', () => {
    const fast = initEngine(fastProfile);
    const slow = initEngine(slowProfile);
    expect(fast.levers.mutationRate).toBeGreaterThan(slow.levers.mutationRate);
  });

  it('starts with initial flash duration from config', () => {
    const state = initEngine(null);
    // Should be close to initialFlashDuration (600), adjusted by profile
    expect(state.currentFlashDuration).toBeGreaterThan(500);
    expect(state.currentFlashDuration).toBeLessThanOrEqual(600);
  });

  it('uses custom config when provided', () => {
    const config = { ...ENGINE_CONFIG_DEFAULTS, warmupRounds: 5 };
    const state = initEngine(null, config);
    expect(state.config.warmupRounds).toBe(5);
  });
});

// ── updateEngine — warmup branch ──

describe('updateEngine — warmup', () => {
  it('applies gentle warmup settings during round 0', () => {
    const state = initEngine(null);
    const updated = updateEngine(state, makePerf(), 0);
    expect(updated.levers.sequenceGrowth).toBe(1);
    expect(updated.levers.tempoRamp).toBe(ENGINE_CONFIG_DEFAULTS.warmupTempoRamp);
  });

  it('calibrates on round 1 based on round 0 performance', () => {
    let state = initEngine(null);
    // Simulate round 0 with fast RT and perfect accuracy
    state = updateEngine(state, makePerf({ avgRt: 280, correct: 4, total: 4 }), 0);
    // Round 1 calibration
    const updated = updateEngine(state, makePerf({ avgRt: 280 }), 1);
    // Fast calibration: should get aggressive settings
    expect(updated.levers.sequenceGrowth).toBe(2);
    expect(updated.levers.mutationRate).toBe(0.1);
  });
});

// ── updateEngine — post-warmup branches ──

describe('updateEngine — adaptive branches', () => {
  function engineWithHistory(
    history: RoundPerformance[],
    overrides: Partial<EngineState> = {}
  ): EngineState {
    const base = initEngine(null);
    return {
      ...base,
      roundHistory: history,
      leverHistory: history.map(() => ({ ...base.levers })),
      ...overrides,
    };
  }

  it('accel-all: high accuracy + fast RT → aggressive push', () => {
    const history = [
      makePerf({ correct: 5, total: 5, avgRt: 280 }),
      makePerf({ correct: 5, total: 5, avgRt: 290 }),
      makePerf({ correct: 5, total: 5, avgRt: 300 }),
    ];
    const state = engineWithHistory(history);
    const updated = updateEngine(state, makePerf({ correct: 5, total: 5, avgRt: 280 }), 3);
    expect(updated.levers.sequenceGrowth).toBe(2); // accelGrowth
    expect(updated.levers.tempoRamp).toBe(ENGINE_CONFIG_DEFAULTS.accelTempoRamp);
  });

  it('push-tempo: high accuracy + slow RT → tempo push only', () => {
    const history = [
      makePerf({ correct: 5, total: 5, avgRt: 460 }),
      makePerf({ correct: 5, total: 5, avgRt: 470 }),
      makePerf({ correct: 5, total: 5, avgRt: 480 }),
    ];
    const state = engineWithHistory(history);
    const updated = updateEngine(state, makePerf({ correct: 5, total: 5, avgRt: 480 }), 3);
    expect(updated.levers.sequenceGrowth).toBe(1);
    expect(updated.levers.tempoRamp).toBe(ENGINE_CONFIG_DEFAULTS.pushTempoRamp);
  });

  it('overwhelm: low accuracy → eases back', () => {
    const history = [
      makePerf({ correct: 2, total: 5, avgRt: 400 }),
      makePerf({ correct: 3, total: 5, avgRt: 400 }),
      makePerf({ correct: 2, total: 5, avgRt: 400 }),
    ];
    const state = engineWithHistory(history);
    const updated = updateEngine(state, makePerf({ correct: 2, total: 5, avgRt: 400 }), 3);
    expect(updated.levers.sequenceGrowth).toBeLessThan(0);
    expect(updated.levers.tempoRamp).toBe(ENGINE_CONFIG_DEFAULTS.easeTempoRamp);
  });

  it('zpd-hold: accuracy in ZPD zone → holds steady', () => {
    // Accuracy between overwhelmThreshold (0.8) and zpdUpper (0.9)
    // Need 85% accuracy: 4.25/5 → use 17/20 over 3 rounds
    const history = [
      makePerf({ correct: 6, total: 7, avgRt: 380 }), // ~85.7%
      makePerf({ correct: 6, total: 7, avgRt: 380 }),
      makePerf({ correct: 6, total: 7, avgRt: 380 }),
    ];
    const state = engineWithHistory(history);
    const updated = updateEngine(
      state,
      makePerf({ correct: 6, total: 7, avgRt: 380 }),
      3
    );
    expect(updated.levers.sequenceGrowth).toBe(0);
    expect(updated.levers.tempoRamp).toBe(0);
    expect(updated.consecutiveZpdRounds).toBe(1);
  });
});

// ── updateEngine — grid expansion ──

describe('updateEngine — grid expansion', () => {
  it('expands 3→4 after 3 strong rounds at/after round 6', () => {
    const cfg = ENGINE_CONFIG_DEFAULTS;
    const history: RoundPerformance[] = [];
    // Build up 5 rounds of history
    for (let i = 0; i < 5; i++) {
      history.push(makePerf({ correct: 4, total: 4, avgRt: 300 }));
    }
    const base = initEngine(null);
    const state: EngineState = {
      ...base,
      roundHistory: history,
      leverHistory: history.map(() => ({ ...base.levers })),
      levers: { ...base.levers, gridSize: 3 },
    };

    // Round 6 with 3 consecutive strong rounds (rounds 4, 5, 6 in history)
    const updated = updateEngine(
      state,
      makePerf({ correct: 4, total: 4, avgRt: 300 }),
      6
    );
    expect(updated.levers.gridSize).toBe(4);
  });

  it('does not expand if accuracy is below threshold', () => {
    const history: RoundPerformance[] = [];
    for (let i = 0; i < 5; i++) {
      history.push(makePerf({ correct: 3, total: 4, avgRt: 300 })); // 75% < 88%
    }
    const base = initEngine(null);
    const state: EngineState = {
      ...base,
      roundHistory: history,
      leverHistory: history.map(() => ({ ...base.levers })),
    };

    const updated = updateEngine(
      state,
      makePerf({ correct: 3, total: 4, avgRt: 300 }),
      6
    );
    expect(updated.levers.gridSize).toBe(3);
  });
});

// ── updateEngine — flash duration accumulation ──

describe('updateEngine — tempo accumulation', () => {
  it('decreases flash duration with negative tempoRamp', () => {
    const state = initEngine(null);
    const updated = updateEngine(state, makePerf({ correct: 5, total: 5, avgRt: 280 }), 3);
    expect(updated.currentFlashDuration).toBeLessThan(state.currentFlashDuration);
  });

  it('clamps flash duration to floor', () => {
    const base = initEngine(null);
    const state: EngineState = {
      ...base,
      currentFlashDuration: ENGINE_CONFIG_DEFAULTS.flashFloor + 5,
    };
    const updated = updateEngine(state, makePerf({ correct: 5, total: 5, avgRt: 280 }), 3);
    expect(updated.currentFlashDuration).toBeGreaterThanOrEqual(ENGINE_CONFIG_DEFAULTS.flashFloor);
  });

  it('clamps flash duration to ceiling', () => {
    const base = initEngine(null);
    const state: EngineState = {
      ...base,
      currentFlashDuration: ENGINE_CONFIG_DEFAULTS.flashCeiling - 5,
    };
    // Overwhelm branch applies positive tempoRamp
    const updated = updateEngine(
      state,
      makePerf({ correct: 1, total: 5, avgRt: 400 }),
      3
    );
    expect(updated.currentFlashDuration).toBeLessThanOrEqual(ENGINE_CONFIG_DEFAULTS.flashCeiling);
  });
});

// ── updateEngine — mutation streak tracking ──

describe('updateEngine — mutation streaks', () => {
  it('increments consecutiveMutationSurvives on survival', () => {
    const state = initEngine(null);
    const updated = updateEngine(
      state,
      makePerf({ mutationSurvived: true }),
      0
    );
    expect(updated.consecutiveMutationSurvives).toBe(1);
    expect(updated.consecutiveFailedMutations).toBe(0);
  });

  it('increments consecutiveFailedMutations on failure', () => {
    const state = initEngine(null);
    const updated = updateEngine(
      state,
      makePerf({ mutationSurvived: false }),
      0
    );
    expect(updated.consecutiveFailedMutations).toBe(1);
    expect(updated.consecutiveMutationSurvives).toBe(0);
  });
});

// ── selectMutation ──

describe('selectMutation', () => {
  it('returns "none" when mutationRate is 0', () => {
    const result = selectMutation({ ...initEngine(null).levers, mutationRate: 0 }, 0);
    expect(result).toBe('none');
  });

  it('returns "poison" when player is struggling', () => {
    // Mock Math.random to always trigger mutation
    const spy = jest.spyOn(Math, 'random').mockReturnValue(0.01);
    const result = selectMutation(
      { ...initEngine(null).levers, mutationRate: 1.0 },
      1 // consecutiveFailedMutations > 0
    );
    expect(result).toBe('poison');
    spy.mockRestore();
  });

  it('selects from standard pool at low mutation rates', () => {
    const spy = jest.spyOn(Math, 'random');
    // First call: trigger mutation (< mutationRate)
    // Second call: select type
    spy.mockReturnValueOnce(0.01).mockReturnValueOnce(0.5);
    const result = selectMutation(
      { ...initEngine(null).levers, mutationRate: 0.2 },
      0
    );
    expect(['poison', 'mirror', 'reverse']).toContain(result);
    spy.mockRestore();
  });

  it('includes advanced mutations at high rates', () => {
    const spy = jest.spyOn(Math, 'random');
    spy.mockReturnValueOnce(0.01).mockReturnValueOnce(0.75);
    const result = selectMutation(
      { ...initEngine(null).levers, mutationRate: 0.5 },
      0
    );
    expect(['poison', 'mirror', 'reverse', 'colorSwitch', 'parity', 'double']).toContain(result);
    spy.mockRestore();
  });
});

// ── updateEngine — intensity computation ──

describe('updateEngine — intensity', () => {
  it('intensity stays between 0 and 1', () => {
    const state = initEngine(null);
    for (let round = 0; round < 20; round++) {
      const updated = updateEngine(state, makePerf({ correct: 5, total: 5, avgRt: 250 }), round);
      expect(updated.intensity).toBeGreaterThanOrEqual(0);
      expect(updated.intensity).toBeLessThanOrEqual(1);
    }
  });
});
