import {
  createInitialGameState,
  buildRound,
  processTap,
  processHaltTap,
  processHaltTimeout,
  completeRound,
  applyFailedRound,
  buildSummary,
  type GameState,
} from '../gameStateMachine';
import { ENGINE_CONFIG_DEFAULTS } from '../engineConfig';
import type { PlayerProfile } from '../adaptiveEngine';

// ── Helpers ──

// Default to a calibrated profile so the engine runs in normal-adaptive mode.
// Tests that explicitly need calibration mode pass `null` instead.
const calibratedDefault: PlayerProfile = {
  baselineRt: 450,
  wmCapacity: 4,
  flexRating: 0.5,
  speedAccuracyThreshold: 350,
  calibrated: true,
};

function freshState(mode: 'arc' | 'tide' | 'ember' | 'halt' = 'arc'): GameState {
  return createInitialGameState(calibratedDefault, ENGINE_CONFIG_DEFAULTS, 3, mode);
}

function stateWithRound(mode: 'arc' | 'tide' | 'ember' | 'halt' = 'arc'): GameState {
  const state = freshState(mode);
  const round = buildRound(state);
  return { ...state, round, phase: 'recall' };
}

// ── createInitialGameState ──

describe('createInitialGameState', () => {
  it('starts in idle phase with no round', () => {
    const state = freshState();
    expect(state.phase).toBe('idle');
    expect(state.round).toBeNull();
  });

  it('initializes with correct lives', () => {
    const state = createInitialGameState(null, ENGINE_CONFIG_DEFAULTS, 5);
    expect(state.lives).toBe(5);
  });

  it('initializes with requested game mode', () => {
    expect(freshState('halt').gameMode).toBe('halt');
    expect(freshState('tide').gameMode).toBe('tide');
    expect(freshState('ember').gameMode).toBe('ember');
  });

  it('starts with zero scores and counters', () => {
    const state = freshState();
    expect(state.totalScore).toBe(0);
    expect(state.sessionRts).toHaveLength(0);
    expect(state.sessionCorrect).toBe(0);
    expect(state.sessionTotal).toBe(0);
    expect(state.roundCount).toBe(0);
    expect(state.perfectStreak).toBe(0);
  });

  it('initializes HALT-specific fields', () => {
    const state = freshState('halt');
    expect(state.haltTrialCount).toBe(0);
    expect(state.haltCommissionErrors).toBe(0);
    expect(state.haltOmissionErrors).toBe(0);
    expect(state.haltSsd).toBe(250);
  });
});

// ── buildRound ──

describe('buildRound', () => {
  it('generates a round with valid sequence', () => {
    const state = freshState();
    const round = buildRound(state);
    expect(round.round).toBe(1);
    expect(round.displaySequence.length).toBeGreaterThanOrEqual(2);
    expect(round.gridSize).toBe(3);
    expect(round.flashDuration).toBeGreaterThan(0);
  });

  it('generates HALT trial with single cell', () => {
    const state = freshState('halt');
    const round = buildRound(state);
    expect(round.displaySequence).toHaveLength(1);
    expect(['go', 'nogo', 'stop']).toContain(round.trialType);
    expect(round.responseWindow).toBeGreaterThan(0);
  });

  it('HALT go trial expects the target cell', () => {
    // Force go trial by mocking random
    const spy = jest.spyOn(Math, 'random').mockReturnValue(0.99); // high roll → go
    const state = freshState('halt');
    const round = buildRound(state);
    if (round.trialType === 'go') {
      expect(round.expectedSequence).toEqual(round.displaySequence);
    }
    spy.mockRestore();
  });

  it('HALT nogo/stop trial expects empty sequence', () => {
    const spy = jest.spyOn(Math, 'random').mockReturnValue(0.01); // low roll → stop
    const state = freshState('halt');
    const round = buildRound(state);
    if (round.trialType === 'stop' || round.trialType === 'nogo') {
      expect(round.expectedSequence).toHaveLength(0);
    }
    spy.mockRestore();
  });

  it('tide mode reverses expected sequence', () => {
    // Use a deterministic sequence by building with known state
    const state = freshState('tide');
    const round = buildRound(state);
    // The expected sequence should be the reverse of the display sequence
    // (after any mutation is applied, then reversed)
    if (round.mutation === 'none' || round.mutation === 'poison') {
      expect(round.expectedSequence).toEqual([...round.displaySequence].reverse());
    }
  });

  it('sets poison cell only for poison mutation', () => {
    const state = freshState();
    // Run multiple times to check both cases
    for (let i = 0; i < 20; i++) {
      const round = buildRound(state);
      if (round.mutation === 'poison') {
        expect(round.poisonCell).not.toBeNull();
        expect(round.displaySequence).not.toContain(round.poisonCell);
      } else {
        expect(round.poisonCell).toBeNull();
      }
    }
  });
});

// ── processTap ──

describe('processTap', () => {
  it('records correct tap and advances progress', () => {
    const state = stateWithRound();
    const expectedCell = state.round!.expectedSequence[0];
    const { nextState, sessionEnded } = processTap(state, expectedCell, 1100, 1000);

    expect(sessionEnded).toBe(false);
    expect(nextState.recallProgress).toHaveLength(1);
    expect(nextState.tapResults).toHaveLength(1);
    expect(nextState.tapResults![0].correct).toBe(true);
  });

  it('ends session on wrong tap', () => {
    const state = stateWithRound();
    // Tap a cell that's NOT expected
    const wrongCell = (state.round!.expectedSequence[0] + 1) % 9;
    // Make sure it's not a poison cell either
    const cellToTap = wrongCell === state.round!.poisonCell
      ? (wrongCell + 1) % 9
      : wrongCell;

    const { nextState, sessionEnded } = processTap(state, cellToTap, 1100, 1000);

    if (cellToTap !== state.round!.expectedSequence[0]) {
      expect(sessionEnded).toBe(true);
      expect(nextState.phase).toBe('ended');
      expect(nextState.summary).toBeDefined();
    }
  });

  it('ends session on poison tap', () => {
    // Create a state with guaranteed poison cell
    const state = stateWithRound();
    if (state.round!.poisonCell !== null) {
      const { sessionEnded, nextState } = processTap(
        state, state.round!.poisonCell, 1100, 1000
      );
      expect(sessionEnded).toBe(true);
      expect(nextState.tapResults![0].isPoisonTap).toBe(true);
    }
  });

  it('transitions to feedback when all taps correct', () => {
    let state = stateWithRound();
    // Ensure no poison mutation for predictable test
    state = {
      ...state,
      round: { ...state.round!, mutation: 'none', poisonCell: null },
    };

    let current = state;
    for (let i = 0; i < state.round!.expectedSequence.length; i++) {
      const cell = state.round!.expectedSequence[i];
      const { nextState, sessionEnded } = processTap(current, cell, 1000 + i * 100, 1000);

      if (i === state.round!.expectedSequence.length - 1) {
        expect(nextState.phase).toBe('feedback');
        expect(sessionEnded).toBe(false);
      }

      current = { ...current, ...nextState };
    }
  });

  it('does nothing when not in recall phase', () => {
    const state = freshState();
    const { nextState, sessionEnded } = processTap(state, 0, 100, 0);
    expect(nextState).toEqual({});
    expect(sessionEnded).toBe(false);
  });

  it('computes RT from watch end time', () => {
    const state = stateWithRound();
    const expectedCell = state.round!.expectedSequence[0];
    const { nextState } = processTap(state, expectedCell, 1300, 1000);
    // RT = tapTime - watchEndTime = 300ms
    expect(nextState.tapResults![0].rt).toBe(300);
  });

  // Regression: multi-tap RT must be inter-tap (not cumulative-from-watch-end).
  // Previously suspected of being broken; this test pins the correct behavior.
  it('computes per-tap RT as inter-tap interval for taps 2, 3, and 4', () => {
    let state = stateWithRound();
    state = { ...state, round: { ...state.round!, mutation: 'none', poisonCell: null } };
    const watchEndTime = 1000;
    // Tap times spaced 200, 180, 220, 250 ms after the prior anchor
    const tapTimes = [1200, 1380, 1600, 1850];
    const expectedRts = [200, 180, 220, 250];

    let current = state;
    for (let i = 0; i < Math.min(tapTimes.length, current.round!.expectedSequence.length); i++) {
      const cell = current.round!.expectedSequence[i];
      const { nextState } = processTap(current, cell, tapTimes[i], watchEndTime);
      const taps = nextState.tapResults!;
      expect(taps[i].rt).toBe(expectedRts[i]);
      current = { ...current, ...nextState } as GameState;
    }
  });

  it('multi-tap RT remains correct across consecutive rounds (no cross-round leakage)', () => {
    // Round 1: 3 expected taps with watchEndTime=1000, tapTimes 1200, 1400, 1600 → RTs 200,200,200
    let state = stateWithRound();
    state = { ...state, round: { ...state.round!, mutation: 'none', poisonCell: null } };
    let current = state;
    [1200, 1400, 1600].forEach((tapTime, i) => {
      if (i >= current.round!.expectedSequence.length) return;
      const cell = current.round!.expectedSequence[i];
      const { nextState } = processTap(current, cell, tapTime, 1000);
      current = { ...current, ...nextState } as GameState;
    });
    // Simulate completeRound clearing tapResults (sessionRts persists), and a fresh recall phase.
    const afterRound1 = { ...current, tapResults: [], recallProgress: [], phase: 'recall' as const };

    // Round 2: new watchEndTime=5000, tapTimes 5300, 5500. RTs should be 300, 200 — independent of round 1.
    const round2State = { ...afterRound1, round: { ...afterRound1.round!, mutation: 'none' as const, poisonCell: null } };
    const { nextState: r2t1 } = processTap(round2State, round2State.round!.expectedSequence[0], 5300, 5000);
    expect(r2t1.tapResults![0].rt).toBe(300);
    const r2afterT1 = { ...round2State, ...r2t1 } as GameState;
    if (r2afterT1.round!.expectedSequence.length > 1) {
      const { nextState: r2t2 } = processTap(r2afterT1, r2afterT1.round!.expectedSequence[1], 5500, 5000);
      expect(r2t2.tapResults![1].rt).toBe(200);
    }
  });
});

// ── processHaltTap ──

describe('processHaltTap', () => {
  it('records correct go tap', () => {
    const state = stateWithRound('halt');
    // Force go trial
    const goState = {
      ...state,
      round: { ...state.round!, trialType: 'go' as const },
    };
    const targetCell = goState.round!.displaySequence[0];
    const { nextState, isError } = processHaltTap(goState, targetCell, 250);

    expect(isError).toBe(false);
    expect(nextState.haltCorrectGos).toBe(1);
    expect(nextState.haltGoRts).toContain(250);
  });

  it('records commission error on nogo tap', () => {
    const state = stateWithRound('halt');
    const nogoState = {
      ...state,
      round: { ...state.round!, trialType: 'nogo' as const },
    };
    const targetCell = nogoState.round!.displaySequence[0];
    const { nextState, isError } = processHaltTap(nogoState, targetCell, 250);

    expect(isError).toBe(true);
    expect(nextState.haltCommissionErrors).toBe(1);
  });

  it('decreases SSD on stop trial commission error', () => {
    const state = stateWithRound('halt');
    const stopState = {
      ...state,
      round: { ...state.round!, trialType: 'stop' as const },
    };
    const targetCell = stopState.round!.displaySequence[0];
    const { nextState } = processHaltTap(stopState, targetCell, 250);

    expect(nextState.haltSsd).toBe(state.haltSsd - 50);
  });

  it('does nothing for non-halt mode', () => {
    const state = stateWithRound('arc');
    const { nextState, isError } = processHaltTap(state, 0, 250);
    expect(nextState).toEqual({});
    expect(isError).toBe(false);
  });
});

// ── processHaltTimeout ──

describe('processHaltTimeout', () => {
  it('records omission error on go trial timeout', () => {
    const state = stateWithRound('halt');
    const goState = {
      ...state,
      round: { ...state.round!, trialType: 'go' as const },
    };
    const { nextState, isError } = processHaltTimeout(goState);

    expect(isError).toBe(true);
    expect(nextState.haltOmissionErrors).toBe(1);
  });

  it('records correct withhold on nogo timeout', () => {
    const state = stateWithRound('halt');
    const nogoState = {
      ...state,
      round: { ...state.round!, trialType: 'nogo' as const },
    };
    const { nextState, isError } = processHaltTimeout(nogoState);

    expect(isError).toBe(false);
    expect(nextState.sessionCorrect).toBe(1);
  });

  it('increases SSD on successful stop withhold', () => {
    const state = stateWithRound('halt');
    const stopState = {
      ...state,
      round: { ...state.round!, trialType: 'stop' as const },
    };
    const { nextState } = processHaltTimeout(stopState);

    expect(nextState.haltSsd).toBe(state.haltSsd + 50);
    expect(nextState.haltCorrectStops).toBe(1);
  });
});

// ── completeRound ──

describe('completeRound', () => {
  it('increments score and round count', () => {
    const state = stateWithRound();
    // Simulate successful taps
    const withTaps: GameState = {
      ...state,
      tapResults: state.round!.expectedSequence.map((cell, i) => ({
        cellIndex: cell,
        rt: 300 + i * 10,
        correct: true,
        isPoisonTap: false,
      })),
    };

    const updates = completeRound(withTaps);
    expect(updates.totalScore).toBeGreaterThan(0);
    expect(updates.roundCount).toBe(1);
    expect(updates.perfectStreak).toBe(1);
  });

  it('resets tapResults and recallProgress for next round', () => {
    const state = stateWithRound();
    const withTaps: GameState = {
      ...state,
      tapResults: [{ cellIndex: 0, rt: 300, correct: true, isPoisonTap: false }],
    };
    const updates = completeRound(withTaps);
    expect(updates.tapResults).toHaveLength(0);
    expect(updates.recallProgress).toHaveLength(0);
  });

  it('tracks mutation survival', () => {
    const state = stateWithRound();
    const withMutation: GameState = {
      ...state,
      round: { ...state.round!, mutation: 'mirror' },
      tapResults: [{ cellIndex: 0, rt: 300, correct: true, isPoisonTap: false }],
    };
    const updates = completeRound(withMutation);
    expect(updates.mutationsFaced).toContain('mirror');
    expect(updates.mutationsSurvived).toBe(1);
  });

  it('returns empty object if no round', () => {
    const state = freshState();
    expect(completeRound(state)).toEqual({});
  });
});

// ── applyFailedRound ──

describe('applyFailedRound', () => {
  it('updates engine with failed performance', () => {
    const state = stateWithRound();
    const withTaps: GameState = {
      ...state,
      tapResults: [{ cellIndex: 99, rt: 300, correct: false, isPoisonTap: false }],
    };
    const { engine } = applyFailedRound(withTaps);
    expect(engine.roundHistory).toHaveLength(1);
  });

  it('marks mutation as not survived when mutation was active', () => {
    const state = stateWithRound();
    const withMutation: GameState = {
      ...state,
      round: { ...state.round!, mutation: 'reverse' },
      tapResults: [{ cellIndex: 99, rt: 300, correct: false, isPoisonTap: false }],
    };
    const { engine } = applyFailedRound(withMutation);
    expect(engine.consecutiveFailedMutations).toBe(1);
  });

  it('returns existing engine if no round', () => {
    const state = freshState();
    const { engine } = applyFailedRound(state);
    expect(engine).toBe(state.engine);
  });
});

// ── buildSummary ──

describe('buildSummary', () => {
  it('computes summary from session state', () => {
    const state: GameState = {
      ...stateWithRound(),
      sessionRts: [250, 300, 350],
      sessionCorrect: 3,
      sessionTotal: 4,
      totalScore: 500,
      roundCount: 3,
      mutationsFaced: ['mirror', 'reverse'],
      mutationsSurvived: 1,
      perfectStreak: 2,
    };

    const summary = buildSummary(state);
    expect(summary.totalScore).toBe(500);
    expect(summary.roundsCompleted).toBe(3);
    expect(summary.avgRt).toBe(300);
    expect(summary.bestRt).toBe(250);
    expect(summary.accuracy).toBe(0.75);
    expect(summary.mutationsFaced).toHaveLength(2);
    expect(summary.mutationsSurvived).toBe(1);
    expect(summary.bestStreak).toBe(2);
    expect(summary.cognitiveScores).toBeDefined();
  });

  it('handles empty session', () => {
    const state = freshState();
    const withRound = { ...state, round: buildRound(state) };
    const summary = buildSummary(withRound);
    expect(summary.avgRt).toBe(0);
    expect(summary.bestRt).toBe(0);
    expect(summary.accuracy).toBe(0);
  });

  it('includes HALT metrics for halt mode', () => {
    const state: GameState = {
      ...stateWithRound('halt'),
      haltTrialCount: 20,
      haltCorrectGos: 12,
      haltOmissionErrors: 2,
      haltCommissionErrors: 3,
      haltCorrectStops: 3,
      haltGoRts: [250, 280, 300, 270, 290, 310, 260, 275, 295, 305, 265, 285],
      haltSsd: 200,
      sessionRts: [250, 280, 300],
      sessionCorrect: 15,
      sessionTotal: 20,
    };
    const summary = buildSummary(state);
    expect(summary.haltCommissionErrors).toBe(3);
    expect(summary.haltOmissionErrors).toBe(2);
    expect(summary.haltSsrt).toBeGreaterThanOrEqual(0);
    expect(summary.haltDPrime).toBeDefined();
  });
});
