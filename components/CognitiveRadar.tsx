import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
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
  onLockedTap?: () => void;
}

export function CognitiveRadar({ dimensions, size = 200, onLockedTap }: CognitiveRadarProps) {
  return (
    <View style={[styles.container, { width: size }]}>
      {dimensions.map((d) => (
        <Pressable
          key={d.shortLabel}
          style={styles.row}
          onPress={d.locked ? onLockedTap : undefined}
          disabled={!d.locked}
        >
          <Text style={[styles.label, { color: d.locked ? Colors.textTertiary : d.color }]}>
            {d.locked ? '\uD83D\uDD12' : ''} {d.shortLabel}
          </Text>
          <View style={styles.track}>
            <View
              style={[
                styles.fill,
                {
                  width: `${d.locked ? 0 : d.value}%`,
                  backgroundColor: d.color,
                  opacity: d.locked ? 0.3 : 1,
                },
              ]}
            />
          </View>
          <Text style={[styles.value, { color: d.locked ? Colors.textTertiary : d.color }]}>
            {d.locked ? '—' : d.value}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
    alignSelf: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    width: 40,
  },
  track: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'serif',
    width: 30,
    textAlign: 'right',
  },
});
