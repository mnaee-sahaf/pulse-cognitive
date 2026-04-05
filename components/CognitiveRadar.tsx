import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Polygon, Line, Circle, Text as SvgText } from 'react-native-svg';
import { Colors, FontSize } from '../constants/theme';

export interface RadarDimension {
  label: string;
  shortLabel: string;
  value: number;    // 0–100
  color: string;
  locked?: boolean;
}

interface CognitiveRadarProps {
  dimensions: RadarDimension[];
  size?: number;
}

export function CognitiveRadar({ dimensions, size = 200 }: CognitiveRadarProps) {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.36;
  const labelRadius = size * 0.48;
  const n = dimensions.length;

  // Angle for each axis (starting from top, clockwise)
  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;

  // Point on the chart at a given fraction (0–1) along an axis
  const point = (i: number, frac: number) => ({
    x: cx + radius * frac * Math.cos(angle(i)),
    y: cy + radius * frac * Math.sin(angle(i)),
  });

  // Background rings at 25%, 50%, 75%, 100%
  const rings = [0.25, 0.5, 0.75, 1.0];

  // Data polygon points
  const dataPoints = useMemo(() => {
    return dimensions.map((d, i) => {
      const frac = d.locked ? 0 : d.value / 100;
      const p = point(i, frac);
      return `${p.x},${p.y}`;
    }).join(' ');
  }, [dimensions, size]);

  // Ghost polygon for locked dims (show what they could be at baseline 30%)
  const ghostPoints = useMemo(() => {
    return dimensions.map((d, i) => {
      const frac = d.locked ? 0.3 : d.value / 100;
      const p = point(i, frac);
      return `${p.x},${p.y}`;
    }).join(' ');
  }, [dimensions, size]);

  const hasLocked = dimensions.some((d) => d.locked);

  return (
    <View style={styles.container}>
      <Svg width={size} height={size}>
        {/* Background rings */}
        {rings.map((r) => (
          <Polygon
            key={r}
            points={Array.from({ length: n }, (_, i) => {
              const p = point(i, r);
              return `${p.x},${p.y}`;
            }).join(' ')}
            fill="none"
            stroke={Colors.border}
            strokeWidth={0.8}
            strokeDasharray={r === 1 ? undefined : '3,3'}
          />
        ))}

        {/* Axis lines */}
        {dimensions.map((_, i) => {
          const p = point(i, 1);
          return (
            <Line
              key={i}
              x1={cx}
              y1={cy}
              x2={p.x}
              y2={p.y}
              stroke={Colors.border}
              strokeWidth={0.8}
            />
          );
        })}

        {/* Ghost polygon (shows potential for locked dims) */}
        {hasLocked && (
          <Polygon
            points={ghostPoints}
            fill={Colors.border + '30'}
            stroke={Colors.border}
            strokeWidth={1}
            strokeDasharray="4,4"
          />
        )}

        {/* Data polygon */}
        <Polygon
          points={dataPoints}
          fill={Colors.accent + '25'}
          stroke={Colors.accent}
          strokeWidth={1.5}
        />

        {/* Data points */}
        {dimensions.map((d, i) => {
          if (d.locked) return null;
          const frac = d.value / 100;
          const p = point(i, frac);
          return (
            <Circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={3}
              fill={d.color}
            />
          );
        })}

        {/* Axis labels */}
        {dimensions.map((d, i) => {
          const p = {
            x: cx + labelRadius * Math.cos(angle(i)),
            y: cy + labelRadius * Math.sin(angle(i)),
          };
          return (
            <SvgText
              key={i}
              x={p.x}
              y={p.y}
              textAnchor="middle"
              alignmentBaseline="central"
              fontSize={9}
              fontWeight="600"
              fill={d.locked ? Colors.textTertiary : d.color}
              opacity={d.locked ? 0.5 : 1}
            >
              {d.locked ? `\uD83D\uDD12 ${d.shortLabel}` : d.shortLabel}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
});
