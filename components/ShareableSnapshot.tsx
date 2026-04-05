import React, { useRef, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet, Alert } from 'react-native';
import * as Sharing from 'expo-sharing';
import { Colors, FontSize, Spacing } from '../constants/theme';
import type { CognitiveScores } from '../engine/scoring';

// ViewShot may fail with New Architecture — import safely
let ViewShot: any = View;
try {
  ViewShot = require('react-native-view-shot').default;
} catch {
  // fallback to plain View if native module unavailable
}

interface ShareableSnapshotProps {
  totalScore: number;
  roundsCompleted: number;
  accuracy: number;
  avgRt: number;
  cognitiveScores: CognitiveScores;
  engineIntensity: number;
  streak?: number;
}

export function ShareableSnapshot({
  totalScore,
  roundsCompleted,
  accuracy,
  avgRt,
  cognitiveScores,
  engineIntensity,
  streak,
}: ShareableSnapshotProps) {
  const viewShotRef = useRef<ViewShot>(null);

  const handleShare = useCallback(async () => {
    try {
      const uri = await viewShotRef.current?.capture?.();
      if (!uri) return;
      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert('Sharing not available on this device');
        return;
      }
      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'Share your cognitive snapshot',
      });
    } catch {
      Alert.alert('Failed to share snapshot');
    }
  }, []);

  const dims = [
    { label: 'RT', score: cognitiveScores.rtScore, color: Colors.accent },
    { label: 'WM', score: cognitiveScores.wmScore, color: '#8B5CF6' },
    { label: 'FLEX', score: cognitiveScores.flexScore, color: Colors.warning },
    { label: 'DEC', score: cognitiveScores.decisionScore, color: Colors.success },
  ];

  return (
    <View style={styles.wrapper}>
      <ViewShot
        ref={viewShotRef}
        options={{ format: 'png', quality: 1 }}
        style={styles.cardOuter}
      >
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.logo}>
              pulse<Text style={styles.dot}>.</Text>
            </Text>
            <Text style={styles.tagline}>COGNITIVE SNAPSHOT</Text>
          </View>

          {/* Score */}
          <Text style={styles.score}>{totalScore.toLocaleString()}</Text>
          <Text style={styles.scoreLabel}>POINTS</Text>

          {/* Quick stats */}
          <View style={styles.statsRow}>
            <View style={styles.statBlock}>
              <Text style={styles.statValue}>{roundsCompleted}</Text>
              <Text style={styles.statLabel}>ROUNDS</Text>
            </View>
            <View style={styles.statBlock}>
              <Text style={styles.statValue}>{Math.round(avgRt)}ms</Text>
              <Text style={styles.statLabel}>AVG RT</Text>
            </View>
            <View style={styles.statBlock}>
              <Text style={styles.statValue}>{Math.round(accuracy * 100)}%</Text>
              <Text style={styles.statLabel}>ACCURACY</Text>
            </View>
          </View>

          {/* Cognitive bars */}
          <View style={styles.dimsContainer}>
            {dims.map((d) => (
              <View key={d.label} style={styles.dimRow}>
                <Text style={[styles.dimLabel, { color: d.color }]}>{d.label}</Text>
                <View style={styles.dimTrack}>
                  <View style={[styles.dimFill, { width: `${d.score}%`, backgroundColor: d.color }]} />
                </View>
                <Text style={[styles.dimScore, { color: d.color }]}>{d.score}</Text>
              </View>
            ))}
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <Text style={styles.intensity}>
              Intensity: {Math.round(engineIntensity * 100)}%
            </Text>
            {streak && streak > 1 && (
              <Text style={styles.streakText}>
                {'\uD83D\uDD25'} {streak} day streak
              </Text>
            )}
          </View>
        </View>
      </ViewShot>

      <Pressable
        style={({ pressed }) => [styles.shareBtn, pressed && { opacity: 0.85 }]}
        onPress={handleShare}
      >
        <Text style={styles.shareBtnText}>Share Snapshot</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 12,
    alignSelf: 'stretch',
  },
  cardOuter: {
    borderRadius: Spacing.cardRadius,
    overflow: 'hidden',
  },
  card: {
    backgroundColor: '#1A1A1A',
    borderRadius: Spacing.cardRadius,
    padding: 24,
    gap: 12,
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    gap: 4,
  },
  logo: {
    fontFamily: 'serif',
    fontSize: 18,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  dot: { color: Colors.accent },
  tagline: {
    fontSize: 9,
    fontWeight: '600',
    color: '#666666',
    letterSpacing: 2.5,
  },
  score: {
    fontSize: 48,
    fontWeight: '600',
    fontFamily: 'serif',
    color: '#FFFFFF',
    letterSpacing: -2,
  },
  scoreLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.accent,
    letterSpacing: 2,
    marginTop: -6,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 24,
    marginVertical: 4,
  },
  statBlock: { alignItems: 'center', gap: 2 },
  statValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    fontFamily: 'serif',
  },
  statLabel: {
    fontSize: 8,
    fontWeight: '600',
    color: '#666666',
    letterSpacing: 1.5,
  },
  dimsContainer: {
    width: '100%',
    gap: 8,
    marginVertical: 4,
  },
  dimRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dimLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
    width: 32,
  },
  dimTrack: {
    flex: 1,
    height: 4,
    backgroundColor: '#333333',
    borderRadius: 2,
    overflow: 'hidden',
  },
  dimFill: {
    height: '100%',
    borderRadius: 2,
  },
  dimScore: {
    fontSize: 13,
    fontWeight: '600',
    fontFamily: 'serif',
    width: 26,
    textAlign: 'right',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 4,
  },
  intensity: {
    fontSize: 10,
    color: '#666666',
    letterSpacing: 0.5,
  },
  streakText: {
    fontSize: 10,
    color: Colors.warning,
    fontWeight: '600',
  },
  shareBtn: {
    backgroundColor: Colors.surface,
    paddingVertical: 14,
    borderRadius: Spacing.cardRadius,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  shareBtnText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
});
