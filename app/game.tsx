import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useGameStore } from '../store/gameStore';
import { Grid } from '../components/Grid';
import { Colors, FontSize, Spacing } from '../constants/theme';
import * as Haptics from 'expo-haptics';
import { AnimatedBackground } from '../components/AnimatedBackground';
import { useAppSettings } from '../store/appSettingsStore';

export default function GameScreen() {
  const router = useRouter();
  const state = useGameStore();
  const {
    phase,
    round,
    currentFlashIndex,
    recallProgress,
    tapResults,
    totalScore,
    engine,
    roundCount,
    lives,
    setFlashIndex,
    startRecall,
    handleTap,
    advanceRound,
  } = state;

  const animatedBackground = useAppSettings((s) => s.animatedBackground);
  const backgroundIntensity = useAppSettings((s) => s.backgroundIntensity);
  const hapticFeedback = useAppSettings((s) => s.hapticFeedback);
  const watchEndTimeRef = useRef(0);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevLivesRef = useRef(lives);

  // Buzz when a life is lost
  useEffect(() => {
    if (lives < prevLivesRef.current) {
      if (hapticFeedback) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
    prevLivesRef.current = lives;
  }, [lives, hapticFeedback]);

  // Watch phase: flash cells in sequence
  useEffect(() => {
    if (phase !== 'watch' || !round) return;

    let i = 0;
    const flashNext = () => {
      if (i >= round.displaySequence.length) {
        setFlashIndex(-1);
        watchEndTimeRef.current = performance.now();
        setTimeout(() => startRecall(watchEndTimeRef.current), round.flashGap);
        return;
      }
      setFlashIndex(round.displaySequence[i]);
      i++;
      flashTimerRef.current = setTimeout(() => {
        setFlashIndex(-1);
        setTimeout(flashNext, round.flashGap);
      }, round.flashDuration);
    };

    // Brief pause before starting sequence
    const startTimer = setTimeout(flashNext, 400);
    return () => {
      clearTimeout(startTimer);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, [phase, round?.round]);

  // Feedback phase: buzz on sequence complete, then advance
  useEffect(() => {
    if (phase !== 'feedback') return;
    if (hapticFeedback) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const t = setTimeout(() => advanceRound(), 600);
    return () => clearTimeout(t);
  }, [phase]);

  // Navigate to results when session ends
  useEffect(() => {
    if (phase === 'ended') {
      router.replace('/results');
    }
  }, [phase]);

  // Build tap state map for the grid
  const tapStates = useCallback((): Record<number, 'idle' | 'correct' | 'wrong'> => {
    const map: Record<number, 'idle' | 'correct' | 'wrong'> = {};
    tapResults.forEach((t) => {
      map[t.cellIndex] = t.correct ? 'correct' : 'wrong';
    });
    return map;
  }, [tapResults]);

  if (!round) return null;

  const isRecalling = phase === 'recall';
  const phaseLabel =
    phase === 'watch' ? 'WATCH' :
    phase === 'recall' ? 'RECALL' :
    phase === 'feedback' ? 'GOOD' : '';

  const mutationLabel = round.mutation !== 'none' ? round.mutation.toUpperCase() : null;

  return (
    <SafeAreaView style={styles.safe}>
      {animatedBackground && <AnimatedBackground intensity={backgroundIntensity} />}
      <View style={styles.container}>
        {/* HUD */}
        <View style={styles.hud}>
          <View style={styles.hudLeft}>
            <Text style={styles.score}>{totalScore.toLocaleString()}</Text>
            <Text style={styles.hudLabel}>SCORE</Text>
          </View>
          <View style={styles.hudCenter}>
            <Text style={[
              styles.phaseLabel,
              phase === 'recall' && styles.phaseLabelRecall,
              phase === 'feedback' && styles.phaseLabelFeedback,
            ]}>
              {phaseLabel}
            </Text>
            {mutationLabel && (
              <View style={styles.mutationBadge}>
                <Text style={styles.mutationText}>{mutationLabel}</Text>
              </View>
            )}
            <View style={styles.livesRow}>
              {Array.from({ length: 3 }, (_, i) => (
                <View
                  key={i}
                  style={[styles.lifesDot, i < lives && styles.lifesDotActive]}
                />
              ))}
            </View>
          </View>
          <View style={styles.hudRight}>
            <Text style={styles.roundNum}>R{roundCount}</Text>
            <Text style={styles.hudLabel}>ROUND</Text>
          </View>
        </View>

        {/* Sequence length indicator */}
        <View style={styles.seqRow}>
          {Array.from({ length: round.displaySequence.length }, (_, i) => (
            <View
              key={i}
              style={[
                styles.seqDot,
                i < recallProgress.length && styles.seqDotFilled,
              ]}
            />
          ))}
        </View>

        {/* Grid */}
        <View style={styles.gridContainer}>
          <Grid
            gridSize={round.gridSize}
            illuminatedCell={currentFlashIndex}
            poisonCell={round.poisonCell}
            tapStates={tapStates()}
            onTap={handleTap}
            disabled={!isRecalling}
          />
        </View>

        {/* Intensity bar */}
        <View style={styles.intensityContainer}>
          <Text style={styles.hudLabel}>ADAPTIVE INTENSITY</Text>
          <View style={styles.intensityTrack}>
            <View
              style={[
                styles.intensityFill,
                { width: `${Math.round(engine.intensity * 100)}%` },
              ]}
            />
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.pagePadding,
    paddingTop: 16,
    paddingBottom: 32,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hud: {
    flexDirection: 'row',
    width: '100%',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  hudLeft: { alignItems: 'flex-start', minWidth: 64 },
  hudCenter: { alignItems: 'center', gap: 6 },
  hudRight: { alignItems: 'flex-end', minWidth: 64 },
  score: {
    fontSize: FontSize.display,
    fontWeight: '600',
    fontFamily: 'serif',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  roundNum: {
    fontSize: FontSize.display,
    fontWeight: '600',
    fontFamily: 'serif',
    color: Colors.textPrimary,
  },
  hudLabel: {
    fontSize: FontSize.label,
    fontWeight: '500',
    color: Colors.textTertiary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  phaseLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 2,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
  },
  phaseLabelRecall: {
    color: Colors.accent,
  },
  phaseLabelFeedback: {
    color: Colors.success,
  },
  mutationBadge: {
    backgroundColor: Colors.warning + '22',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: Colors.warning + '44',
  },
  mutationText: {
    fontSize: FontSize.label,
    fontWeight: '600',
    color: Colors.warning,
    letterSpacing: 1.5,
  },
  livesRow: {
    flexDirection: 'row',
    gap: 5,
    marginTop: 4,
  },
  lifesDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: Colors.border,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  lifesDotActive: {
    backgroundColor: Colors.danger,
    borderColor: Colors.danger,
  },
  seqRow: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  seqDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.border,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  seqDotFilled: {
    backgroundColor: Colors.accent,
    borderColor: Colors.accent,
  },
  gridContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  intensityContainer: {
    width: '100%',
    gap: 8,
    alignItems: 'flex-start',
  },
  intensityTrack: {
    width: '100%',
    height: 3,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  intensityFill: {
    height: '100%',
    backgroundColor: Colors.accent,
    borderRadius: 2,
  },
});
