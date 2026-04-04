import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Alert,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useGameStore } from '../store/gameStore';
import { Grid } from '../components/Grid';
import type { TileShape } from '../components/Cell';
import { Colors, FontSize, Spacing } from '../constants/theme';
import * as Haptics from 'expo-haptics';
import { AnimatedBackground } from '../components/AnimatedBackground';
import { useAppSettings } from '../store/appSettingsStore';
import { COMPANIONS } from '../db/companion';

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
    gameMode,
    emberHits,
    setFlashIndex,
    startRecall,
    handleTap,
    handleWatchTap,
    finishEmberSequence,
    advanceRound,
    resetSession,
  } = state;

  const animatedBackground = useAppSettings((s) => s.animatedBackground);
  const backgroundIntensity = useAppSettings((s) => s.backgroundIntensity);
  const hapticFeedback = useAppSettings((s) => s.hapticFeedback);
  const watchEndTimeRef = useRef(0);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevLivesRef = useRef(lives);
  const flashStartRef = useRef(0);

  // Ember: track which cell is the active intercept target and for how long.
  // Using refs (not state) so checks in onGridTap are always current without
  // triggering re-renders.
  // TODO: Ember needs a full redesign — falling Tetris-style items with
  // increasing speed/complexity that the user intercepts before they land.
  const EMBER_GRACE_MS = 350; // ms after flash ends where tap still counts
  const emberTargetRef = useRef(-1);        // cell index currently valid to tap
  const emberTargetExpiryRef = useRef(0);   // absolute time when target expires
  const emberHitThisFlashRef = useRef(false); // prevent double-counting same flash

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
        if (gameMode === 'ember') {
          setTimeout(() => finishEmberSequence(), round.flashGap);
        } else {
          watchEndTimeRef.current = performance.now();
          setTimeout(() => startRecall(watchEndTimeRef.current), round.flashGap);
        }
        return;
      }
      const cellIndex = round.displaySequence[i];
      setFlashIndex(cellIndex);
      flashStartRef.current = performance.now();
      if (gameMode === 'ember') {
        emberTargetRef.current = cellIndex;
        emberTargetExpiryRef.current = performance.now() + round.flashDuration + EMBER_GRACE_MS;
        emberHitThisFlashRef.current = false;
      }
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

  const handleQuit = () => {
    Alert.alert(
      'Abandon Session',
      'Your progress this session will be lost.',
      [
        { text: 'Keep Going', style: 'cancel' },
        {
          text: 'Abandon',
          style: 'destructive',
          onPress: () => {
            resetSession();
            router.replace('/');
          },
        },
      ]
    );
  };

  const isRecalling = phase === 'recall';
  const isEmberWatch = gameMode === 'ember' && phase === 'watch';

  const onGridTap = useCallback((cellIndex: number, time: number) => {
    if (isEmberWatch) {
      const rt = time - flashStartRef.current;
      const isValidTarget =
        cellIndex === emberTargetRef.current &&
        time <= emberTargetExpiryRef.current &&
        !emberHitThisFlashRef.current;

      if (isValidTarget) {
        emberHitThisFlashRef.current = true; // lock out double-taps on same flash
        handleWatchTap(cellIndex, rt);
      } else if (round && cellIndex === round.poisonCell) {
        // Route poison taps to the store regardless of timing so loseLife fires
        handleWatchTap(cellIndex, rt);
      }
      // Invalid non-poison taps are silently ignored
    } else {
      handleTap(cellIndex, time);
    }
  }, [isEmberWatch, handleWatchTap, handleTap]);

  if (!round) return null;
  const phaseLabel =
    phase === 'feedback' ? 'GOOD' :
    gameMode === 'ember' ? 'INTERCEPT' :
    gameMode === 'tide' && phase === 'recall' ? 'REVERSE' :
    phase === 'watch' ? 'WATCH' :
    phase === 'recall' ? 'RECALL' : '';

  // Always derived from the companion definition so color + shape stay in sync
  const modeColor = COMPANIONS[gameMode].stages[0].primaryColor;

  const tileShape: TileShape =
    gameMode === 'arc'   ? 'hexagon' :
    gameMode === 'tide'  ? 'circle' :
    // TODO: refactor Ember game mechanics after research — real-time intercept
    // feel, scoring, and tile shape all need revisiting before this is final.
    'triangle';

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
            <Pressable
              onPress={handleQuit}
              style={({ pressed }) => [styles.quitBtn, pressed && { opacity: 0.5 }]}
              hitSlop={12}
            >
              <Text style={styles.quitText}>✕ QUIT</Text>
            </Pressable>
          </View>
          <View style={styles.hudCenter}>
            {/* Mode badge */}
            <View style={[styles.modeBadge, { backgroundColor: modeColor + '22', borderColor: modeColor + '55' }]}>
              <Text style={[styles.modeText, { color: modeColor }]}>
                {gameMode.toUpperCase()}
              </Text>
            </View>

            <Text style={[
              styles.phaseLabel,
              (phase === 'recall' || isEmberWatch) && { color: modeColor },
              phase === 'feedback' && styles.phaseLabelFeedback,
            ]}>
              {phaseLabel}
            </Text>

            {mutationLabel && (
              <View style={styles.mutationBadge}>
                <Text style={styles.mutationText}>{mutationLabel}</Text>
              </View>
            )}

            {/* Ember: hit counter instead of recall progress */}
            {gameMode === 'ember' && phase === 'watch' && round && (
              <Text style={[styles.emberCounter, { color: modeColor }]}>
                {emberHits}/{round.displaySequence.length}
              </Text>
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
            onTap={onGridTap}
            disabled={!isRecalling && !isEmberWatch}
            themeColor={modeColor}
            tileShape={tileShape}
            hideWhenIdle={gameMode === 'ember'}
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
  hudLeft: { alignItems: 'flex-start', minWidth: 64, gap: 2 },
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
  quitBtn: {
    marginTop: 6,
  },
  quitText: {
    fontSize: FontSize.label,
    fontWeight: '600',
    color: Colors.textTertiary,
    letterSpacing: 1,
  },
  modeBadge: {
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 2,
  },
  modeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 2,
  },
  phaseLabel: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 2,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
  },
  phaseLabelFeedback: {
    color: Colors.success,
  },
  emberCounter: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'serif',
    letterSpacing: -0.5,
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
