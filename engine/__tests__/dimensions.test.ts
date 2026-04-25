import {
  DIMENSIONS,
  DIMENSION_IDS,
  MODE_DIMENSIONS,
  WORKING_MEMORY,
  PROCESSING_SPEED,
  INHIBITION,
  FLEXIBILITY,
  SUSTAINED_ATTENTION,
} from '../dimensions';
import { createStaircase, applyResponse } from '../staircase';

describe('dimension registry', () => {
  it('has all five dimensions registered', () => {
    expect(DIMENSION_IDS).toHaveLength(5);
    for (const id of DIMENSION_IDS) {
      expect(DIMENSIONS[id]).toBeDefined();
      expect(DIMENSIONS[id].id).toBe(id);
    }
  });

  it('every dimension has a staircase config and label', () => {
    for (const dim of Object.values(DIMENSIONS)) {
      expect(dim.label.length).toBeGreaterThan(0);
      expect(dim.shortLabel.length).toBeGreaterThan(0);
      expect(dim.staircase.initialTheta).toBeGreaterThanOrEqual(dim.staircase.thetaMin);
      expect(dim.staircase.initialTheta).toBeLessThanOrEqual(dim.staircase.thetaMax);
      expect(dim.staircase.thetaMax).toBeGreaterThan(dim.staircase.thetaMin);
      expect(dim.staircase.initialStep).toBeGreaterThan(0);
      expect(dim.staircase.upRule).toBeGreaterThanOrEqual(1);
    }
  });

  it('each dimension thetaToLeverValue returns a finite number', () => {
    for (const dim of Object.values(DIMENSIONS)) {
      const v = dim.thetaToLeverValue(dim.staircase.initialTheta);
      expect(Number.isFinite(v)).toBe(true);
    }
  });
});

describe('working memory dimension', () => {
  it('starts at 4 cells, clamps in [3, 12]', () => {
    expect(WORKING_MEMORY.staircase.initialTheta).toBe(4);
    expect(WORKING_MEMORY.staircase.thetaMin).toBe(3);
    expect(WORKING_MEMORY.staircase.thetaMax).toBe(12);
  });
  it('produces integer sequence lengths', () => {
    expect(WORKING_MEMORY.thetaToLeverValue(4.5)).toBe(5);
    expect(WORKING_MEMORY.thetaToLeverValue(7)).toBe(7);
  });
  it('runs a quick staircase to verify integer integration', () => {
    let s = createStaircase(WORKING_MEMORY.staircase);
    s = applyResponse(s, true, WORKING_MEMORY.staircase);
    s = applyResponse(s, true, WORKING_MEMORY.staircase);
    s = applyResponse(s, true, WORKING_MEMORY.staircase);
    expect(s.theta).toBe(5);
  });
});

describe('processing speed dimension', () => {
  it('clamps flash duration to [200, 800] ms', () => {
    expect(PROCESSING_SPEED.staircase.thetaMin).toBe(200);
    expect(PROCESSING_SPEED.staircase.thetaMax).toBe(800);
  });
  it('returns integer ms values', () => {
    expect(PROCESSING_SPEED.thetaToLeverValue(540.7)).toBe(541);
  });
});

describe('inhibition dimension', () => {
  it('SSD bounded at 50–500 ms', () => {
    expect(INHIBITION.staircase.thetaMin).toBe(50);
    expect(INHIBITION.staircase.thetaMax).toBe(500);
  });
  it('starts at 250ms (Verbruggen consensus default)', () => {
    expect(INHIBITION.staircase.initialTheta).toBe(250);
  });
});

describe('flexibility and sustained attention', () => {
  it('flexibility mutationRate stays in [0, 0.6]', () => {
    expect(FLEXIBILITY.staircase.thetaMin).toBe(0);
    expect(FLEXIBILITY.staircase.thetaMax).toBe(0.6);
  });
  it('flexibility has no population norm (within-user trajectory only)', () => {
    expect(FLEXIBILITY.norm).toBeNull();
  });
  it('sustainedAttention has no population norm', () => {
    expect(SUSTAINED_ATTENTION.norm).toBeNull();
  });
});

describe('MODE_DIMENSIONS', () => {
  it('every mode lists at least one dimension', () => {
    for (const mode of ['arc', 'tide', 'ember', 'halt'] as const) {
      expect(MODE_DIMENSIONS[mode].length).toBeGreaterThanOrEqual(1);
    }
  });
  it('halt drives inhibition; ember drives processingSpeed', () => {
    expect(MODE_DIMENSIONS.halt).toContain('inhibition');
    expect(MODE_DIMENSIONS.ember).toContain('processingSpeed');
  });
  it('every listed dimension is in DIMENSIONS', () => {
    for (const list of Object.values(MODE_DIMENSIONS)) {
      for (const dimId of list) {
        expect(DIMENSIONS[dimId]).toBeDefined();
      }
    }
  });
});
