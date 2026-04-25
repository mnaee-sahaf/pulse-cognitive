/**
 * gameStoreV2 — wave-driven endless cognitive run.
 *
 * Replaces v1's gameStore for the new game loop. Each session is an
 * endless run that escalates through visible waves. Per-dimension
 * adaptive staircases (Levitt 1971) drive difficulty so the player
 * is *forced* to operate at ~79.4% accuracy.
 *
 * Failure ends the run. Success builds combos. Wave transitions
 * trigger banners + engine voice. Persistence happens on results
 * mount, not in the store.
 */

import { create } from 'zustand';
import {
  generateSequence,
  generatePoisonCell,
  getExpectedRecallSequence,
  type Mutation,
  type GridSize,
} from '../engine/sequenceGenerator';
import {
  createStaircase,
  applyResponse,
  type StaircaseState,
} from '../engine/staircase';
import {
  DIMENSIONS,
  MODE_DIMENSIONS,
  type DimensionId,
} from '../engine/dimensions';
import {
  currentWave,
  isWaveEntry,
  isBossRound,
  computeRoundScore,
  type WaveDefinition,
} from '../engine/wave';
import {
  applyCombo,
  comboMultiplier,
  INITIAL_COMBO,
  type ComboState,
} from '../engine/combo';
import { log } from '../lib/devLog';

export type GameMode = 'arc' | 'tide' | 'ember' | 'halt';
export type Phase = 'idle' | 'wave-banner' | 'watching' | 'recalling' | 'feedback' | 'ended';

export interface RoundV2 {
  index: number;
  wave: WaveDefinition;
  sequenceLength: number;
  flashDuration: number;
  flashGap: number;
  gridSize: GridSize;
  displaySequence: number[];
  expectedSequence: number[];
  mutation: Mutation;
  poisonCell: number | null;
  isWaveEntry: boolean;
  isBoss: boolean;
}

export interface TapResultV2 {
  cellIndex: number;
  rt: number;
  correct: boolean;
}

export interface RunSummaryV2 {
  mode: GameMode;
  isDailyTrial: boolean;
  totalScore: number;
  highestRound: number;
  highestWave: WaveDefinition;
  peakCombo: string;
  peakComboCount: number;
  mutationsSurvived: number;
  mutationsFaced: number;
  finalThetas: Partial<Record<DimensionId, number>>;
  durationMs: number;
  endedAt: string;
}

interface GameStoreV2 {
  // Session config
  mode: GameMode;
  isDailyTrial: boolean;

  // Phase machine
  phase: Phase;
  roundCount: number;
  round: RoundV2 | null;

  // Per-dimension adaptive staircases (only the active ones for this mode)
  staircases: Partial<Record<DimensionId, StaircaseState>>;

  // In-round state
  recallProgress: number[];
  tapResults: TapResultV2[];
  flashIndex: number;
  watchEndTime: number;

  // Run-level state
  combo: ComboState;
  totalScore: number;
  mutationsFaced: number;
  mutationsSurvived: number;
  startedAt: number;
  summary: RunSummaryV2 | null;

  // UI feedback
  voiceMessage: string | null;

  // Actions
  startRun: (mode: GameMode, isDailyTrial: boolean) => void;
  setFlashIndex: (i: number) => void;
  startRecall: (watchEndTime: number) => void;
  handleTap: (cellIndex: number, tapTime: number) => void;
  advanceFromFeedback: () => void;
  setVoiceMessage: (msg: string | null) => void;
  resetRun: () => void;
}

const INITIAL_PHASE: Phase = 'idle';

function initialState(): Omit<GameStoreV2,
  'startRun' | 'setFlashIndex' | 'startRecall' | 'handleTap' |
  'advanceFromFeedback' | 'setVoiceMessage' | 'resetRun'
> {
  return {
    mode: 'arc',
    isDailyTrial: false,
    phase: INITIAL_PHASE,
    roundCount: 0,
    round: null,
    staircases: {},
    recallProgress: [],
    tapResults: [],
    flashIndex: -1,
    watchEndTime: 0,
    combo: INITIAL_COMBO,
    totalScore: 0,
    mutationsFaced: 0,
    mutationsSurvived: 0,
    startedAt: 0,
    summary: null,
    voiceMessage: null,
  };
}

export const useGameStoreV2 = create<GameStoreV2>((set, get) => ({
  ...initialState(),

  startRun: (mode, isDailyTrial) => {
    log.store('v2 startRun', { mode, isDailyTrial });

    const activeIds = MODE_DIMENSIONS[mode] ?? ['workingMemory', 'processingSpeed'];
    const staircases: Partial<Record<DimensionId, StaircaseState>> = {};
    for (const id of activeIds) {
      const dim = DIMENSIONS[id];
      if (dim) staircases[id] = createStaircase(dim.staircase);
    }

    const firstRound = buildRoundV2(1, mode, staircases);
    log.phase('v2 run started → wave-banner', {
      wave: firstRound.wave.name,
      seq: firstRound.sequenceLength,
      flash: firstRound.flashDuration,
      mutation: firstRound.mutation,
    });

    set({
      ...initialState(),
      mode,
      isDailyTrial,
      phase: 'wave-banner',
      roundCount: 1,
      round: firstRound,
      staircases,
      startedAt: Date.now(),
      voiceMessage: `Wave 1 — ${firstRound.wave.name}. ${firstRound.wave.tagline}`,
    });
  },

  setFlashIndex: (i) => set({ flashIndex: i }),

  startRecall: (watchEndTime) => {
    set({ phase: 'recalling', flashIndex: -1, watchEndTime });
  },

  handleTap: (cellIndex, tapTime) => {
    const state = get();
    if (!state.round || state.phase !== 'recalling') return;

    const cumulativeRt = state.tapResults.reduce((s, t) => s + t.rt, 0);
    const lastTapTime = state.watchEndTime + cumulativeRt;
    const computedRt = Math.max(50, tapTime - lastTapTime);

    const tapIndex = state.recallProgress.length;
    const expectedCell = state.round.expectedSequence[tapIndex];
    const isPoisonTap = cellIndex === state.round.poisonCell;
    const correct = !isPoisonTap && cellIndex === expectedCell;

    const tapResult: TapResultV2 = { cellIndex, rt: computedRt, correct };
    const newTapResults = [...state.tapResults, tapResult];

    if (!correct) {
      // Run ends. Apply staircase failure responses; combo breaks; build summary.
      log.tap('v2 wrong tap → run end', { cellIndex, rt: Math.round(computedRt) });
      finishRun(state, newTapResults, false, set);
      return;
    }

    const newProgress = [...state.recallProgress, cellIndex];
    if (newProgress.length === state.round.expectedSequence.length) {
      // Round complete (all correct).
      log.tap('v2 round complete', { round: state.roundCount, taps: newTapResults.length });
      handleRoundComplete(state, newTapResults, set);
      return;
    }

    set({
      tapResults: newTapResults,
      recallProgress: newProgress,
    });
  },

  advanceFromFeedback: () => {
    const state = get();
    if (state.phase !== 'feedback') return;
    const nextRoundIndex = state.roundCount + 1;
    const nextRound = buildRoundV2(nextRoundIndex, state.mode, state.staircases);

    let voice: string | null = null;
    if (nextRound.isWaveEntry) {
      voice = `Wave ${nextRound.wave.index} — ${nextRound.wave.name}. ${nextRound.wave.tagline}`;
    } else if (nextRound.isBoss) {
      voice = 'Boss round.';
    } else if (state.combo.justEntered?.label) {
      voice = state.combo.justEntered.label + '!';
    }

    log.phase(`v2 → round ${nextRoundIndex}`, {
      wave: nextRound.wave.name,
      isWaveEntry: nextRound.isWaveEntry,
      isBoss: nextRound.isBoss,
      mutation: nextRound.mutation,
    });

    set({
      roundCount: nextRoundIndex,
      round: nextRound,
      phase: nextRound.isWaveEntry ? 'wave-banner' : 'watching',
      tapResults: [],
      recallProgress: [],
      flashIndex: -1,
      voiceMessage: voice,
    });
  },

  setVoiceMessage: (msg) => set({ voiceMessage: msg }),

  resetRun: () => set(initialState()),
}));

// ── Pure helpers (could move to engine/ later) ─────────────────────────

function buildRoundV2(
  roundIndex: number,
  mode: GameMode,
  staircases: Partial<Record<DimensionId, StaircaseState>>
): RoundV2 {
  const wave = currentWave(roundIndex);
  const isEntry = isWaveEntry(roundIndex);
  const isBoss = isBossRound(roundIndex);

  // Read theta from staircases. Fall back to default initialTheta if a
  // dimension isn't active in this mode.
  const wmTheta = staircases.workingMemory?.theta ?? DIMENSIONS.workingMemory.staircase.initialTheta;
  const speedTheta = staircases.processingSpeed?.theta ?? DIMENSIONS.processingSpeed.staircase.initialTheta;
  const flexTheta = staircases.flexibility?.theta ?? 0;

  const sequenceLength = Math.round(wmTheta);
  const flashDuration = Math.round(speedTheta);
  const flashGap = 200;
  const gridSize: GridSize = pickGridSize(sequenceLength);

  // Mutation: only when wave allows AND flexibility staircase rolls a hit.
  // Boss rounds force a mutation regardless (with poison preference).
  let mutation: Mutation = 'none';
  if (wave.mutationsEnabled && (isBoss || Math.random() < flexTheta)) {
    mutation = pickMutation(mode, isBoss);
  }

  const displaySequence = generateSequence(sequenceLength, gridSize);
  let expectedSequence = getExpectedRecallSequence(displaySequence, mutation, gridSize);
  if (mode === 'tide') {
    expectedSequence = [...expectedSequence].reverse();
  }
  const poisonCell = mutation === 'poison'
    ? generatePoisonCell(displaySequence, gridSize)
    : null;

  return {
    index: roundIndex,
    wave,
    sequenceLength,
    flashDuration,
    flashGap,
    gridSize,
    displaySequence,
    expectedSequence,
    mutation,
    poisonCell,
    isWaveEntry: isEntry,
    isBoss,
  };
}

function pickGridSize(sequenceLength: number): GridSize {
  if (sequenceLength <= 8) return 3;
  if (sequenceLength <= 14) return 4;
  return 5;
}

function pickMutation(mode: GameMode, preferPoison: boolean): Mutation {
  // Ember relies on poison only — mutations like reverse don't apply mid-watch.
  if (mode === 'ember') return 'poison';
  if (preferPoison) return 'poison';
  const roll = Math.random();
  if (roll < 0.34) return 'poison';
  if (roll < 0.67) return 'mirror';
  return 'reverse';
}

function applyDimensionResponses(
  staircases: Partial<Record<DimensionId, StaircaseState>>,
  mode: GameMode,
  isPerfect: boolean,
  mutationActive: boolean
): Partial<Record<DimensionId, StaircaseState>> {
  const next = { ...staircases };
  const active = MODE_DIMENSIONS[mode] ?? [];
  for (const id of active) {
    const stair = next[id];
    const dim = DIMENSIONS[id];
    if (!stair || !dim) continue;
    // Only feed flexibility a response when a mutation actually fired.
    if (id === 'flexibility' && !mutationActive) continue;
    next[id] = applyResponse(stair, isPerfect, dim.staircase);
  }
  return next;
}

function handleRoundComplete(
  state: GameStoreV2,
  tapResults: TapResultV2[],
  set: (partial: Partial<GameStoreV2>) => void
) {
  const round = state.round!;
  const mutationActive = round.mutation !== 'none';
  const newStaircases = applyDimensionResponses(state.staircases, state.mode, true, mutationActive);
  const newCombo = applyCombo(state.combo, true);

  // Score: rough base of 100 per round, scaled by sequence length, then
  // wave / boss / combo multipliers.
  const baseScore = 80 + round.sequenceLength * 20;
  const scoreEarned = computeRoundScore(baseScore, round.index, comboMultiplier(newCombo));

  set({
    phase: 'feedback',
    tapResults,
    recallProgress: [...state.recallProgress, round.expectedSequence[state.recallProgress.length]],
    staircases: newStaircases,
    combo: newCombo,
    totalScore: state.totalScore + scoreEarned,
    mutationsFaced: state.mutationsFaced + (mutationActive ? 1 : 0),
    mutationsSurvived: state.mutationsSurvived + (mutationActive ? 1 : 0),
  });
}

function finishRun(
  state: GameStoreV2,
  tapResults: TapResultV2[],
  isPerfect: boolean,
  set: (partial: Partial<GameStoreV2>) => void
) {
  const round = state.round!;
  const mutationActive = round.mutation !== 'none';
  const newStaircases = applyDimensionResponses(state.staircases, state.mode, isPerfect, mutationActive);
  const newCombo = applyCombo(state.combo, isPerfect);

  const finalThetas: Partial<Record<DimensionId, number>> = {};
  for (const id of Object.keys(newStaircases) as DimensionId[]) {
    const s = newStaircases[id];
    if (s) finalThetas[id] = s.theta;
  }

  const summary: RunSummaryV2 = {
    mode: state.mode,
    isDailyTrial: state.isDailyTrial,
    totalScore: state.totalScore,
    highestRound: state.roundCount,
    highestWave: round.wave,
    peakCombo: newCombo.peakLabel,
    peakComboCount: newCombo.peakCount,
    mutationsSurvived: state.mutationsSurvived,
    mutationsFaced: state.mutationsFaced + (mutationActive ? 1 : 0),
    finalThetas,
    durationMs: Date.now() - state.startedAt,
    endedAt: new Date().toISOString(),
  };

  log.data('v2 run ended', {
    score: summary.totalScore,
    round: summary.highestRound,
    wave: summary.highestWave.name,
    peakCombo: summary.peakCombo,
  });

  set({
    phase: 'ended',
    tapResults,
    staircases: newStaircases,
    combo: newCombo,
    summary,
    voiceMessage: null,
  });
}
