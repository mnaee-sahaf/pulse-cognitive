export type GridSize = 3 | 4 | 5;
export type Mutation = 'none' | 'mirror' | 'reverse' | 'poison' | 'parity' | 'double';

export interface CellPosition {
  row: number;
  col: number;
}

/**
 * Generates a random non-repeating sequence of cell indices for the given grid size.
 * Length must not exceed gridSize^2.
 */
export function generateSequence(length: number, gridSize: GridSize): number[] {
  const totalCells = gridSize * gridSize;
  const available = Array.from({ length: totalCells }, (_, i) => i);
  const sequence: number[] = [];

  for (let i = 0; i < length; i++) {
    const idx = Math.floor(Math.random() * available.length);
    sequence.push(available[idx]);
    available.splice(idx, 1);
    // Refill if we run out (shouldn't happen with sane sequence lengths)
    if (available.length === 0) {
      for (let j = 0; j < totalCells; j++) {
        if (!sequence.includes(j)) available.push(j);
      }
    }
  }

  return sequence;
}

/**
 * Picks a random poison cell that is NOT in the active sequence.
 */
export function generatePoisonCell(sequence: number[], gridSize: GridSize): number {
  const totalCells = gridSize * gridSize;
  const available = Array.from({ length: totalCells }, (_, i) => i).filter(
    (i) => !sequence.includes(i)
  );
  if (available.length === 0) return -1;
  return available[Math.floor(Math.random() * available.length)];
}

/**
 * Transforms a sequence index for the Mirror mutation.
 * Horizontally mirrors the column: col -> (gridSize - 1 - col)
 */
export function applyMirror(cellIndex: number, gridSize: GridSize): number {
  const row = Math.floor(cellIndex / gridSize);
  const col = cellIndex % gridSize;
  const mirroredCol = gridSize - 1 - col;
  return row * gridSize + mirroredCol;
}

/**
 * Returns the expected recall sequence given the active mutation.
 */
export function getExpectedRecallSequence(
  displaySequence: number[],
  mutation: Mutation,
  gridSize: GridSize
): number[] {
  switch (mutation) {
    case 'mirror':
      return displaySequence.map((idx) => applyMirror(idx, gridSize));
    case 'reverse':
      return [...displaySequence].reverse();
    case 'parity':
      // Only recall cells at even positions (0-indexed) in the sequence
      return displaySequence.filter((_, i) => i % 2 === 0);
    case 'double':
      // Recall each cell twice in succession
      return displaySequence.flatMap((idx) => [idx, idx]);
    case 'poison':
    case 'none':
    default:
      return displaySequence;
  }
}

export function indexToPosition(index: number, gridSize: GridSize): CellPosition {
  return { row: Math.floor(index / gridSize), col: index % gridSize };
}

export function positionToIndex(pos: CellPosition, gridSize: GridSize): number {
  return pos.row * gridSize + pos.col;
}
