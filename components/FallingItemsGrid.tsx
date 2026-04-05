/**
 * Ember mode — falling items grid.
 *
 * Shapes fall from the top of the play area toward their target cells.
 * The user taps a cell to intercept its projectile before it lands.
 * Speed is driven by round.flashDuration (shorter = faster fall).
 *
 * TODO: full Tetris-style redesign — multiple simultaneous items,
 * horizontal drift, shape variety, and combo scoring.
 */
import React, { useState, useRef } from 'react';
import { View, useWindowDimensions } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withTiming,
  runOnJS,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { Spacing, Colors } from '../constants/theme';
import type { GridSize } from '../engine/sequenceGenerator';
import { Cell } from './Cell';
import type { TileShape } from './Cell';

export interface FallingItemData {
  id: string;
  cellIndex: number;
  duration: number;    // ms to fall from top to cell
  spawnTime: number;   // performance.now() when spawned
  intercepted: boolean;
}

interface FallingItemsGridProps {
  gridSize: GridSize;
  fallingItems: FallingItemData[];
  poisonCell: number | null;
  missedCells: Set<number>;
  onCellTap: (cellIndex: number, time: number) => void;
  onItemLanded: (item: FallingItemData) => void;
  themeColor: string;
  disabled: boolean;
  tileShape: TileShape;
}

// ── Falling projectile ────────────────────────────────────────────────────────

const AnimatedPolygon = Animated.createAnimatedComponent(Polygon);

interface FallingItemViewProps {
  itemX: number;
  startY: number;   // Y to start from (negative = above container top)
  targetY: number;
  itemSize: number;
  duration: number;
  themeColor: string;
  intercepted: boolean;
  onLanded: () => void;
}

function FallingItemView({
  itemX,
  startY,
  targetY,
  itemSize,
  duration,
  themeColor,
  intercepted,
  onLanded,
}: FallingItemViewProps) {
  // Keep onLanded ref so animation callbacks are never stale
  const onLandedRef = useRef(onLanded);
  onLandedRef.current = onLanded;

  // Stable wrapper — safe to use in Reanimated callbacks
  const callOnLanded = React.useCallback(() => {
    onLandedRef.current();
  }, []);

  const translateY = useSharedValue(startY);
  const opacity = useSharedValue(1);
  const scale = useSharedValue(1);
  const fillColor = useSharedValue(themeColor);

  // Start falling on mount
  React.useEffect(() => {
    translateY.value = withTiming(targetY, {
      duration,
      easing: Easing.in(Easing.quad), // accelerates as it falls — feels physical
    }, (finished) => {
      if (finished) runOnJS(callOnLanded)();
    });
  }, []);

  // Intercept: cancel fall, burst animation, then clean up
  React.useEffect(() => {
    if (!intercepted) return;
    cancelAnimation(translateY);
    fillColor.value = withTiming(Colors.success, { duration: 80 });
    scale.value = withTiming(2.2, { duration: 200 });
    opacity.value = withTiming(0, { duration: 230 }, (finished) => {
      if (finished) runOnJS(callOnLanded)();
    });
  }, [intercepted]);

  const wrapperStyle = useAnimatedStyle(() => ({
    position: 'absolute' as const,
    left: itemX,
    top: 0,
    width: itemSize,
    height: itemSize * 0.866,
    transform: [{ translateY: translateY.value }, { scale: scale.value }],
    opacity: opacity.value,
  }));

  const shapeFill = useAnimatedProps(() => ({
    fill: fillColor.value,
  }));

  // Downward-pointing equilateral triangle — visually reads as "falling toward target"
  const w = itemSize;
  const h = itemSize * 0.866;
  const pts = `${w / 2},${h} 0,0 ${w},0`;

  return (
    <Animated.View style={wrapperStyle} pointerEvents="none">
      <Svg width={w} height={h} pointerEvents="none">
        <AnimatedPolygon points={pts} animatedProps={shapeFill} />
      </Svg>
    </Animated.View>
  );
}

// ── Grid container ────────────────────────────────────────────────────────────

export function FallingItemsGrid({
  gridSize,
  fallingItems,
  poisonCell,
  missedCells,
  onCellTap,
  onItemLanded,
  themeColor,
  disabled,
  tileShape,
}: FallingItemsGridProps) {
  const { width: screenWidth } = useWindowDimensions();
  const availableWidth = Math.min(screenWidth, Spacing.maxWidth) - Spacing.pagePadding * 2;
  const cellSize = (availableWidth - Spacing.gridGap * (gridSize - 1)) / gridSize;
  const gridWidth = gridSize * cellSize + (gridSize - 1) * Spacing.gridGap;
  const gridHeight = gridWidth; // square grid

  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });

  // Returns the top-left position of a cell relative to this container
  const getCellPos = (cellIndex: number) => {
    const col = cellIndex % gridSize;
    const row = Math.floor(cellIndex / gridSize);
    const gridLeft = (containerSize.width - gridWidth) / 2;
    const gridTop = containerSize.height - gridHeight;
    return {
      x: gridLeft + col * (cellSize + Spacing.gridGap),
      y: gridTop + row * (cellSize + Spacing.gridGap),
    };
  };

  const itemSize = cellSize * 0.68;
  const ready = containerSize.width > 0 && containerSize.height > 0;

  return (
    <View
      style={{ flex: 1, width: '100%' }}
      onLayout={(e) =>
        setContainerSize({
          width: e.nativeEvent.layout.width,
          height: e.nativeEvent.layout.height,
        })
      }
    >
      {/* Falling projectiles — no touch interception */}
      {ready && fallingItems.map((item) => {
        const pos = getCellPos(item.cellIndex);
        const itemX = pos.x + (cellSize - itemSize) / 2;
        const targetY = pos.y; // lands at the top edge of the target cell
        // Start above the entire container so items fall the full screen height
        const startY = -containerSize.height;
        return (
          <FallingItemView
            key={item.id}
            itemX={itemX}
            startY={startY}
            targetY={targetY}
            itemSize={itemSize}
            duration={item.duration}
            themeColor={themeColor}
            intercepted={item.intercepted}
            onLanded={() => onItemLanded(item)}
          />
        );
      })}

      {/* Landing pad grid — anchored to bottom, handles all taps */}
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          alignItems: 'center',
          gap: Spacing.gridGap,
        }}
      >
        {Array.from({ length: gridSize }, (_, row) => (
          <View key={row} style={{ flexDirection: 'row', gap: Spacing.gridGap }}>
            {Array.from({ length: gridSize }, (_, col) => {
              const index = row * gridSize + col;
              const hasFallingItem = fallingItems.some(
                (i) => i.cellIndex === index && !i.intercepted
              );
              const tapState: 'idle' | 'correct' | 'wrong' =
                missedCells.has(index)
                  ? 'wrong'
                  : fallingItems.some((i) => i.cellIndex === index && i.intercepted)
                  ? 'correct'
                  : 'idle';

              return (
                <Cell
                  key={index}
                  index={index}
                  size={cellSize}
                  isIlluminated={hasFallingItem}
                  isPoison={poisonCell === index}
                  tapState={tapState}
                  onTap={onCellTap}
                  disabled={disabled}
                  themeColor={themeColor}
                  tileShape={tileShape}
                />
              );
            })}
          </View>
        ))}
      </View>
    </View>
  );
}
