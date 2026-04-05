import {
  generateSequence,
  generatePoisonCell,
  applyMirror,
  getExpectedRecallSequence,
  indexToPosition,
  positionToIndex,
  type GridSize,
} from '../sequenceGenerator';

// ── generateSequence ──

describe('generateSequence', () => {
  it('returns a sequence of the requested length', () => {
    const seq = generateSequence(5, 4);
    expect(seq).toHaveLength(5);
  });

  it('returns values within grid bounds', () => {
    const gridSize: GridSize = 3;
    const seq = generateSequence(7, gridSize);
    const max = gridSize * gridSize;
    seq.forEach((cell) => {
      expect(cell).toBeGreaterThanOrEqual(0);
      expect(cell).toBeLessThan(max);
    });
  });

  it('produces non-repeating indices when length <= gridSize^2', () => {
    const seq = generateSequence(9, 3); // full 3x3 grid
    const unique = new Set(seq);
    expect(unique.size).toBe(9);
  });

  it('handles length 1', () => {
    const seq = generateSequence(1, 3);
    expect(seq).toHaveLength(1);
  });

  it('handles length equal to total cells', () => {
    const seq = generateSequence(25, 5);
    expect(seq).toHaveLength(25);
    expect(new Set(seq).size).toBe(25);
  });
});

// ── generatePoisonCell ──

describe('generatePoisonCell', () => {
  it('returns a cell NOT in the sequence', () => {
    const seq = [0, 1, 2, 3];
    const poison = generatePoisonCell(seq, 3);
    expect(seq).not.toContain(poison);
    expect(poison).toBeGreaterThanOrEqual(0);
    expect(poison).toBeLessThan(9);
  });

  it('returns -1 when sequence covers all cells', () => {
    const seq = [0, 1, 2, 3, 4, 5, 6, 7, 8];
    expect(generatePoisonCell(seq, 3)).toBe(-1);
  });

  it('works with larger grids', () => {
    const seq = [0, 5, 10];
    const poison = generatePoisonCell(seq, 4);
    expect(seq).not.toContain(poison);
    expect(poison).toBeGreaterThanOrEqual(0);
    expect(poison).toBeLessThan(16);
  });
});

// ── applyMirror ──

describe('applyMirror', () => {
  it('mirrors column in a 3x3 grid', () => {
    // Cell 0 (row 0, col 0) → col 2 → cell 2
    expect(applyMirror(0, 3)).toBe(2);
    // Cell 1 (row 0, col 1) → col 1 → cell 1 (center stays)
    expect(applyMirror(1, 3)).toBe(1);
    // Cell 2 (row 0, col 2) → col 0 → cell 0
    expect(applyMirror(2, 3)).toBe(0);
  });

  it('preserves row during mirror', () => {
    // Cell 6 (row 2, col 0) → (row 2, col 2) → cell 8
    expect(applyMirror(6, 3)).toBe(8);
    // Cell 8 (row 2, col 2) → (row 2, col 0) → cell 6
    expect(applyMirror(8, 3)).toBe(6);
  });

  it('works with 4x4 grid', () => {
    // Cell 0 (row 0, col 0) → col 3 → cell 3
    expect(applyMirror(0, 4)).toBe(3);
    // Cell 5 (row 1, col 1) → col 2 → cell 6
    expect(applyMirror(5, 4)).toBe(6);
  });

  it('double mirror returns original', () => {
    for (let i = 0; i < 9; i++) {
      expect(applyMirror(applyMirror(i, 3), 3)).toBe(i);
    }
  });
});

// ── getExpectedRecallSequence ──

describe('getExpectedRecallSequence', () => {
  const seq = [0, 3, 6, 1];

  it('returns same sequence for "none"', () => {
    expect(getExpectedRecallSequence(seq, 'none', 3)).toEqual(seq);
  });

  it('returns same sequence for "poison"', () => {
    expect(getExpectedRecallSequence(seq, 'poison', 3)).toEqual(seq);
  });

  it('reverses sequence for "reverse"', () => {
    expect(getExpectedRecallSequence(seq, 'reverse', 3)).toEqual([1, 6, 3, 0]);
  });

  it('mirrors each cell for "mirror"', () => {
    const result = getExpectedRecallSequence(seq, 'mirror', 3);
    expect(result).toEqual(seq.map((i) => applyMirror(i, 3)));
  });

  it('keeps even-indexed positions for "parity"', () => {
    // Indices 0, 2 → cells 0, 6
    expect(getExpectedRecallSequence(seq, 'parity', 3)).toEqual([0, 6]);
  });

  it('doubles each cell for "double"', () => {
    expect(getExpectedRecallSequence(seq, 'double', 3)).toEqual([0, 0, 3, 3, 6, 6, 1, 1]);
  });

  it('returns same sequence for "colorSwitch" (UI-level only)', () => {
    expect(getExpectedRecallSequence(seq, 'colorSwitch', 3)).toEqual(seq);
  });
});

// ── indexToPosition / positionToIndex ──

describe('indexToPosition and positionToIndex', () => {
  it('converts index to row/col correctly', () => {
    expect(indexToPosition(0, 3)).toEqual({ row: 0, col: 0 });
    expect(indexToPosition(4, 3)).toEqual({ row: 1, col: 1 });
    expect(indexToPosition(8, 3)).toEqual({ row: 2, col: 2 });
  });

  it('roundtrips index → position → index', () => {
    for (let i = 0; i < 25; i++) {
      const pos = indexToPosition(i, 5);
      expect(positionToIndex(pos, 5)).toBe(i);
    }
  });
});
