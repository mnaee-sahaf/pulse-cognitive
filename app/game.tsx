/**
 * Pulse v2 — wave-driven endless cognitive run.
 *
 * Each session escalates through visible waves until the player fails.
 * Combos, engine voice overlay, fail-on-mistake. No timer.
 *
 * The store (gameStoreV2) owns difficulty (per-dimension staircases) and
 * round generation. This component is purely view + UI orchestration.
 */

import React, { useEffect, useRef, useCallback } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { useGameStoreV2 } from '../store/gameStoreV2';
import { Grid } from '../components/Grid';
import { AnimatedBackground } from '../components/AnimatedBackground';
import { EngineVoice } from '../components/EngineVoice';
import { Colors, FontSize, Spacing, Pressed } from '../constants/theme';
import { useAppSettings } from '../store/appSettingsStore';

export default function GameScreen() {
  const router = useRouter();

  // Selective subscriptions per CLAUDE.md Rule 3.
  const phase = useGameStoreV2((s) => s.phase);
  const round = useGameStoreV2((s) => s.round);
  const flashIndex = useGameStoreV2((s) => s.flashIndex);
  const recallProgress = useGameStoreV2((s) => s.recallProgress);
  const tapResults = useGameStoreV2((s) => s.tapResults);
  const totalScore = useGameStoreV2((s) => s.totalScore);
  const roundCount = useGameStoreV2((s) => s.roundCount);
  const combo = useGameStoreV2((s) => s.combo);
  const mode = useGameStoreV2((s) => s.mode);
  const voiceMessage = useGameStoreV2((s) => s.voiceMessage);

  const setFlashIndex = useGameStoreV2((s) => s.setFlashIndex);
  const startRecall = useGameStoreV2((s) => s.startRecall);
  const handleTap = useGameStoreV2((s) => s.handleTap);
  const advanceFromFeedback = useGameStoreV2((s) => s.advanceFromFeedback);
  const setVoiceMessage = useGameStoreV2((s) => s.setVoiceMessage);
  const resetRun = useGameStoreV2((s) => s.resetRun);

  const animatedBackground = useAppSettings((s) => s.animatedBackground);
  const backgroundIntensity = useAppSettings((s) => s.backgroundIntensity);
  const hapticFeedback = useAppSettings((s) => s.hapticFeedback);

  const watchEndTimeRef = useRef(0);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const modeColor = pickModeColor(mode);

  // ── Wave banner: hold for ~1.2s, then transition into watching ─────
  useEffect(() => {
    if (phase !== 'wave-banner' || !round) return;
    if (hapticFeedback) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const t = setTimeout(() => {
      // Manually transition out of the banner. Store doesn't have a
      // dedicated action — startWatching is just setting phase.
      useGameStoreV2.setState({ phase: 'watching' });
    }, 1200);
    return () => clearTimeout(t);
  }, [phase, round?.index, hapticFeedback]);

  // ── Watching: flash cells in sequence ──────────────────────────────
  useEffect(() => {
    if (phase !== 'watching' || !round) return;

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

    const startTimer = setTimeout(flashNext, 400);
    return () => {
      clearTimeout(startTimer);
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
  }, [phase, round?.index]);

  // ── Feedback: success haptic, then advance ─────────────────────────
  useEffect(() => {
    if (phase !== 'feedback') return;
    if (hapticFeedback) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const t = setTimeout(() => advanceFromFeedback(), 500);
    return () => clearTimeout(t);
  }, [phase, hapticFeedback, advanceFromFeedback]);

  // ── Ended: error haptic, navigate to results ───────────────────────
  useEffect(() => {
    if (phase !== 'ended') return;
    if (hapticFeedback) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    router.replace('/results');
  }, [phase, hapticFeedback, router]);

  // ── Combo entry haptic ────────────────────────────────────────────
  useEffect(() => {
    if (combo.justEntered && hapticFeedback) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }
  }, [combo.justEntered, hapticFeedback]);

  const tapStates = useCallback((): Record<number, 'idle' | 'correct' | 'wrong'> => {
    const map: Record<number, 'idle' | 'correct' | 'wrong'> = {};
    tapResults.forEach((t) => {
      map[t.cellIndex] = t.correct ? 'correct' : 'wrong';
    });
    return map;
  }, [tapResults]);

  const onGridTap = useCallback((cellIndex: number, time: number) => {
    handleTap(cellIndex, time);
  }, [handleTap]);

  const handleQuit = useCallback(() => {
    resetRun();
    router.replace('/');
  }, [resetRun, router]);

  if (!round) return null;

  const isRecalling = phase === 'recalling';
  const phaseLabel = pickPhaseLabel(phase, mode, round.wave.name);
  const mutationLabel = round.mutation !== 'none' ? round.mutation.toUpperCase() : null;
  const tileShape = pickTileShape(mode);

  // Wave banner: show big name, dim everything else
  if (phase === 'wave-banner') {
    return (
      <SafeAreaView style={styles.safe}>
        {animatedBackground && <AnimatedBackground intensity={backgroundIntensity} />}
        <View style={styles.bannerContainer} accessibilityRole="alert">
          <Text style={[styles.bannerLabel, { color: modeColor }]}>
            WAVE {round.wave.index}
          </Text>
          <Text style={styles.bannerName}>{round.wave.name}</Text>
          <Text style={styles.bannerTagline}>{round.wave.tagline}</Text>
          {round.wave.mutationsEnabled && (
            <Text style={styles.bannerHint}>Mutations active.</Text>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {animatedBackground && <AnimatedBackground intensity={backgroundIntensity} />}

      <EngineVoice
        message={voiceMessage}
        onDismiss={() => setVoiceMessage(null)}
      />

      <View style={styles.container}>
        {/* HUD */}
        <View style={styles.hud}>
          <View style={styles.hudLeft}>
            <Text style={styles.score}>{totalScore.toLocaleString()}</Text>
            <Text style={styles.hudLabel}>SCORE</Text>
            <Pressable
              onPress={handleQuit}
              style={({ pressed }) => [styles.quitBtn, pressed && Pressed]}
              hitSlop={12}
              accessibilityRole="button"
              accessibilityLabel="Quit run"
            >
              <Text style={styles.quitText}>✕ QUIT</Text>
            </Pressable>
          </View>

          <View style={styles.hudCenter}>
            <View style={[styles.modeBadge, { backgroundColor: modeColor + '22', borderColor: modeColor + '55' }]}>
              <Text style={[styles.modeText, { color: modeColor }]}>
                {round.wave.name.toUpperCase()}
              </Text>
            </View>

            <Text style={[
              styles.phaseLabel,
              isRecalling && { color: modeColor },
              phase === 'feedback' && styles.phaseLabelFeedback,
            ]}>
              {phaseLabel}
            </Text>

            {mutationLabel && (
              <View style={styles.mutationBadge}>
                <Text style={styles.mutationText}>{mutationLabel}</Text>
              </View>
            )}

            {combo.count >= 2 && (
              <View style={[styles.comboBadge, { borderColor: modeColor + '88' }]}>
                <Text style={[styles.comboCount, { color: modeColor }]}>x{combo.count}</Text>
                {combo.peakLabel && (
                  <Text style={[styles.comboLabel, { color: modeColor }]}>
                    {combo.peakLabel.toUpperCase()}
                  </Text>
                )}
              </View>
            )}
          </View>

          <View style={styles.hudRight}>
            <Text style={styles.roundNum}>R{roundCount}</Text>
            <Text style={styles.hudLabel}>ROUND</Text>
          </View>
        </View>

        {/* Sequence progress dots */}
        <View style={styles.seqRow}>
          {Array.from({ length: round.expectedSequence.length }, (_, i) => (
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
            illuminatedCell={flashIndex}
            poisonCell={round.poisonCell}
            tapStates={tapStates()}
            onTap={onGridTap}
            disabled={!isRecalling}
            themeColor={modeColor}
            tileShape={tileShape}
          />
        </View>

        {/* Combo shield indicator */}
        {combo.shieldAvailable && (
          <View style={[styles.shieldRow, { borderColor: modeColor }]}>
            <Text style={[styles.shieldText, { color: modeColor }]}>SHIELD READY</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

function pickModeColor(mode: string): string {
  if (mode === 'ember') return '#FF6B35';
  if (mode === 'tide') return '#2D9CDB';
  if (mode === 'halt') return '#10B981';
  return Colors.accent;
}

function pickTileShape(mode: string): 'hexagon' | 'circle' | 'square' {
  if (mode === 'arc') return 'hexagon';
  if (mode === 'tide') return 'circle';
  return 'square';
}

function pickPhaseLabel(phase: string, mode: string, waveName: string): string {
  if (phase === 'wave-banner') return waveName.toUpperCase();
  if (phase === 'feedback') return 'GOOD';
  if (phase === 'recalling') return mode === 'tide' ? 'REVERSE' : 'RECALL';
  if (phase === 'watching') return 'WATCH';
  return '';
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: {
    flex: 1,
    paddingHorizontal: Spacing.pagePadding,
    paddingTop: 16,
    paddingBottom: 32,
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  // ── Wave banner full-screen
  bannerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.pagePadding,
    gap: 8,
  },
  bannerLabel: {
    fontSize: FontSize.label,
    fontWeight: '700',
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  bannerName: {
    fontSize: 48,
    fontWeight: '600',
    fontFamily: 'serif',
    color: Colors.textPrimary,
    letterSpacing: -1,
  },
  bannerTagline: {
    fontSize: FontSize.body,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  bannerHint: {
    fontSize: FontSize.label,
    fontWeight: '600',
    color: Colors.warning,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 12,
  },

  // ── HUD
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
  quitBtn: { marginTop: 6 },
  quitText: {
    fontSize: FontSize.label,
    fontWeight: '600',
    color: Colors.textTertiary,
    letterSpacing: 1.5,
  },

  modeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Spacing.badgeRadius,
    borderWidth: 1,
  },
  modeText: {
    fontSize: FontSize.label,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  phaseLabel: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: Colors.textTertiary,
  },
  phaseLabelFeedback: {
    color: Colors.success,
  },
  mutationBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Spacing.badgeRadius,
    backgroundColor: Colors.warning + '22',
    borderWidth: 1,
    borderColor: Colors.warning + '55',
  },
  mutationText: {
    fontSize: FontSize.label - 1,
    fontWeight: '700',
    color: Colors.warning,
    letterSpacing: 1.5,
  },
  comboBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: Spacing.pillRadius,
    borderWidth: 1.5,
    backgroundColor: Colors.surface,
    marginTop: 4,
  },
  comboCount: {
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'serif',
  },
  comboLabel: {
    fontSize: FontSize.label - 1,
    fontWeight: '700',
    letterSpacing: 1.5,
  },

  // ── Sequence dots
  seqRow: {
    flexDirection: 'row',
    gap: 6,
    marginVertical: 12,
  },
  seqDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.border,
  },
  seqDotFilled: {
    backgroundColor: Colors.accent,
  },

  // ── Grid
  gridContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Shield
  shieldRow: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: Spacing.pillRadius,
    borderWidth: 1.5,
    backgroundColor: Colors.surface,
    alignSelf: 'center',
  },
  shieldText: {
    fontSize: FontSize.label,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
});
