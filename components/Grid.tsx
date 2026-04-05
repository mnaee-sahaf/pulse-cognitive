import React from 'react';
import { View, StyleSheet, useWindowDimensions } from 'react-native';
import { Cell, type TileShape } from './Cell';
import { Spacing } from '../constants/theme';
import type { GridSize } from '../engine/sequenceGenerator';

interface GridProps {
  gridSize: GridSize;
  illuminatedCell: number;  // -1 = none
  poisonCell: number | null;
  tapStates: Record<number, 'idle' | 'correct' | 'wrong'>;
  onTap: (cellIndex: number, time: number) => void;
  disabled: boolean;
  themeColor: string;
  tileShape: TileShape;
}

export function Grid({
  gridSize,
  illuminatedCell,
  poisonCell,
  tapStates,
  onTap,
  disabled,
  themeColor,
  tileShape,
}: GridProps) {
  const { width } = useWindowDimensions();
  const availableWidth = Math.min(width, Spacing.maxWidth) - Spacing.pagePadding * 2;
  const cellSize = (availableWidth - Spacing.gridGap * (gridSize - 1)) / gridSize;

  const totalCells = gridSize * gridSize;

  return (
    <View style={[styles.grid, { gap: Spacing.gridGap }]}>
      {Array.from({ length: gridSize }, (_, row) => (
        <View key={row} style={[styles.row, { gap: Spacing.gridGap }]}>
          {Array.from({ length: gridSize }, (_, col) => {
            const index = row * gridSize + col;
            return (
              <Cell
                key={index}
                index={index}
                size={cellSize}
                isIlluminated={illuminatedCell === index}
                isPoison={poisonCell === index}
                tapState={tapStates[index] ?? 'idle'}
                onTap={onTap}
                disabled={disabled}
                themeColor={themeColor}
                tileShape={tileShape}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
  },
});
