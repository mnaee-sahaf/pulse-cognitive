import React, { useEffect, useRef, useCallback, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  Alert,
  StyleSheet,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
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
import { log } from '../lib/devLog';

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
    gameMode,
    emberHits,
    perfectStreak,
    tickTimer,
    setFlashIndex,
    startRecall,
    handleTap,
    handleWatchTap,
    handleHaltTap,
    handleHaltTimeout,
    finishEmberSequence,
    advanceRound,
    resetSession,
  } = state;

  const [timeRemaining, setTimeRemaining] = useState(60000);
  const [showTimesUp, setShowTimesUp] = useState(false);

  // Pulsing timer animation for last 10 seconds
  const timerScale = useSharedValue(1);
  const timerPulsing = useRef(false);

  const timerAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: timerScale.value }],
  }));

  const animatedBackground = useAppSettings((s) => s.animatedBackground);
  const backgroundIntensity = useAppSettings((s) => s.backgroundIntensity);
  const hapticFeedback = useAppSettings((s) => s.hapticFeedback);
  const watchEndTimeRef = useRef(0);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashGapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const emberFinishTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flashStartRef = useRef(0);

  // Ember: track which cell is the active intercept target and for how long.
  const EMBER_GRACE_MS = 350;
  const emberTargetRef = useRef(-1);
  const emberTargetExpiryRef = useRef(0);
  const emberHitThisFlashRef = useRef(false);

  // Session timer — tick every 100ms
  useEffect(() => {
    if (phase === 'ended' || phase === 'idle') return;
    const interval = setInterval(() => {
      const remaining = tickTimer();
      setTimeRemaining(remaining);
      if (remaining <= 10000 && !timerPulsing.current) {
        timerPulsing.current = true;
        timerScale.value = withRepeat(
          withSequence(
            withTiming(1.15, { duration: 400 }),
            withTiming(1, { duration: 400 })
          ),
          -1,
          true
        );
      }
    }, 100);
    return () => clearInterval(interval);
  }, [phase, tickTimer]);

  // HALT mode: track whether tap was received this trial
  const haltTappedRef = useRef(false);
  const haltTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Watch phase: flash cells in sequence (or single trial for HALT)
  useEffect(() => {
    if (phase !== 'watch' || !round) return;

    // HALT mode: single cell flash with response window timeout
    if (gameMode === 'halt') {
      haltTappedRef.current = false;
      const targetCell = round.displaySequence[0];
      const responseWindow = round.responseWindow ?? 1200;

      // Brief pause before showing the stimulus (matches other modes)
      const HALT_PRE_DELAY = 500;
      const preTimer = setTimeout(() => {
        flashStartRef.current = performance.now();
        setFlashIndex(targetCell);

        // Response window starts when cell appears
        haltTimeoutRef.current = setTimeout(() => {
          setFlashIndex(-1);
          if (!haltTappedRef.current) {
            handleHaltTimeout();
          }
        }, responseWindow);
      }, HALT_PRE_DELAY);

      return () => {
        clearTimeout(preTimer);
        if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
        if (haltTimeoutRef.current) clearTimeout(haltTimeoutRef.current);
      };
    }

    let i = 0;
    const flashNext = () => {
      if (i >= round.displaySequence.length) {
        setFlashIndex(-1);
        if (gameMode === 'ember') {
          emberFinishTimerRef.current = setTimeout(() => finishEmberSequence(), round.flashGap);
        } else {
          watchEndTimeRef.current = performance.now();
          flashGapTimerRef.current = setTimeout(() => startRecall(watchEndTimeRef.current), round.flashGap);
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
        flashGapTimerRef.current = setTimeout(flashNext, round.flashGap);
      }, round.flashDuration);
    };

    // Brief pause before starting sequence
    const startTimer = setTimeout(flashNext, 400);
    return () => {
      clearTimeout(startTimer);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
      if (flashGapTimerRef.current) clearTimeout(flashGapTimerRef.current);
      if (emberFinishTimerRef.current) clearTimeout(emberFinishTimerRef.current);
    };
  }, [phase, round?.round]);

  // Feedback phase: buzz on sequence complete, then advance.
  // Key on roundCount to prevent double-advance when phase toggles rapidly.
  const feedbackHandledRef = useRef(0);
  useEffect(() => {
    if (phase !== 'feedback') return;
    if (feedbackHandledRef.current === roundCount) return;
    feedbackHandledRef.current = roundCount;
    if (hapticFeedback) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const delay = gameMode === 'halt' ? 200 : 600;
    const t = setTimeout(() => advanceRound(), delay);
    return () => clearTimeout(t);
  }, [phase, roundCount]);

  // Navigate to results when session ends — show "TIME'S UP" briefly first.
  const navigatedRef = useRef(false);
  useEffect(() => {
    if (phase === 'ended' && !navigatedRef.current) {
      navigatedRef.current = true;
      if (hapticFeedback) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setShowTimesUp(true);
      log.nav('session ended → showing times up overlay', { hasSummary: !!state.summary });
      const t = setTimeout(() => {
        router.replace('/results');
      }, 1200);
      return () => clearTimeout(t);
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
  const isHaltWatch = gameMode === 'halt' && phase === 'watch';

  const onGridTap = useCallback((cellIndex: number, time: number) => {
    if (isHaltWatch) {
      if (haltTappedRef.current) return; // ignore double-taps
      haltTappedRef.current = true;
      const rt = time - flashStartRef.current;
      setFlashIndex(-1);
      if (haltTimeoutRef.current) clearTimeout(haltTimeoutRef.current);
      handleHaltTap(cellIndex, rt);
    } else if (isEmberWatch) {
      const rt = time - flashStartRef.current;
      const isValidTarget =
        cellIndex === emberTargetRef.current &&
        time <= emberTargetExpiryRef.current &&
        !emberHitThisFlashRef.current;

      if (isValidTarget) {
        emberHitThisFlashRef.current = true;
        handleWatchTap(cellIndex, rt);
      } else if (round && cellIndex === round.poisonCell) {
        handleWatchTap(cellIndex, rt);
      }
    } else {
      handleTap(cellIndex, time);
    }
  }, [isEmberWatch, isHaltWatch, handleWatchTap, handleHaltTap, handleTap]);

  if (!round) return null;
  const haltTrialLabel = round?.trialType === 'nogo' ? 'NO-GO'
    : round?.trialType === 'stop' ? 'STOP' : 'GO';

  const phaseLabel =
    phase === 'feedback' ? 'GOOD' :
    gameMode === 'halt' ? haltTrialLabel :
    gameMode === 'ember' ? 'INTERCEPT' :
    gameMode === 'tide' && phase === 'recall' ? 'REVERSE' :
    phase === 'watch' ? 'WATCH' :
    phase === 'recall' ? 'RECALL' : '';

  // Always derived from the companion definition so color + shape stay in sync
  const modeColor = COMPANIONS[gameMode].stages[0].primaryColor;

  const tileShape: TileShape =
    gameMode === 'arc'   ? 'hexagon' :
    gameMode === 'tide'  ? 'circle' :
    'square';

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

            <Animated.Text style={[
              styles.timerText,
              timeRemaining <= 10000 && styles.timerUrgent,
              timerAnimStyle,
            ]}>
              {`${Math.ceil(timeRemaining / 1000)}s`}
            </Animated.Text>
            {perfectStreak >= 2 && (
              <Text style={[styles.streakBadge, { color: modeColor }]}>
                {perfectStreak}x STREAK
              </Text>
            )}
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
            disabled={!isRecalling && !isEmberWatch && !isHaltWatch}
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

      {showTimesUp && (
        <View style={styles.timesUpOverlay}>
          <Text style={styles.timesUpText}>TIME&apos;S UP</Text>
        </View>
      )}
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
  timerText: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'serif',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
    marginTop: 4,
  },
  timerUrgent: {
    color: Colors.danger,
  },
  streakBadge: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: 2,
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
  timesUpOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timesUpText: {
    fontSize: 42,
    fontWeight: '700',
    fontFamily: 'serif',
    color: '#FFFFFF',
    letterSpacing: 4,
  },
});
