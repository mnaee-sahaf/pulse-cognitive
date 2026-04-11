import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useGameStore } from '../store/gameStore';
import { Colors, FontSize, Spacing } from '../constants/theme';
import { AnimatedBackground } from '../components/AnimatedBackground';
import { useAppSettings } from '../store/appSettingsStore';
import { saveSession, getProfileSeedData } from '../db/sessions';
import { updatePlayerProfile } from '../db/playerProfile';
import { awardXp, loadCompanion, scoreToXp, type CompanionState } from '../db/companion';
import { recordSessionForStreak, getStreakLabel, type StreakState } from '../db/streaks';
import { Companion } from '../components/Companion';
import { LevelUpModal } from '../components/LevelUpModal';
import { ShareableSnapshot } from '../components/ShareableSnapshot';
export default function ResultsScreen() {
  const router = useRouter();
  const { summary, engine, resetSession, gameMode } = useGameStore();
  const animatedBackground = useAppSettings((s) => s.animatedBackground);
  const backgroundIntensity = useAppSettings((s) => s.backgroundIntensity);
  const savedRef = useRef(false);
  const [companion, setCompanion] = useState<CompanionState | null>(null);
  const [xpGained, setXpGained] = useState(0);
  const [leveledUp, setLeveledUp] = useState(false);
  const [evolved, setEvolved] = useState(false);
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);
  const [streak, setStreak] = useState<StreakState | null>(null);

  // Persist session and award XP once on mount
  useEffect(() => {
    if (!summary || savedRef.current) return;
    savedRef.current = true;

    const persist = async () => {
      await saveSession(summary, engine.leverHistory, gameMode);
      const seed = await getProfileSeedData(10);
      await updatePlayerProfile(seed.avgRts, seed.maxSequenceLengths, seed.flexRatings, seed.accuracies);

      const result = await awardXp(summary.totalScore);
      setCompanion(result.state);
      setXpGained(scoreToXp(summary.totalScore));
      setLeveledUp(result.leveledUp);
      setEvolved(result.evolved);
      if (result.leveledUp) setShowLevelUpModal(true);

      // Record streak
      const streakResult = await recordSessionForStreak();
      setStreak(streakResult);

    };
    persist().catch(console.error);
  }, []);

  // Summary may be null briefly while the store update propagates after navigation.
  // Show nothing for one frame rather than redirecting to home immediately.
  if (!summary) {
    return <View style={styles.safe} />;
  }

  const { cognitiveScores, totalScore, roundsCompleted, avgRt, bestRt, accuracy } = summary;

  const metrics = [
    { label: 'Processing Speed', score: cognitiveScores.rtScore, color: Colors.accent },
    { label: 'Working Memory', score: cognitiveScores.wmScore, color: '#8B5CF6' },
    { label: 'Flexibility', score: cognitiveScores.flexScore, color: Colors.warning },
    { label: 'Decision Efficiency', score: cognitiveScores.decisionScore, color: Colors.success },
    { label: 'Impulse Control', score: cognitiveScores.impulseScore, color: '#10B981' },
  ];

  const sorted = [...metrics].sort((a, b) => a.score - b.score);
  const weakest = sorted.filter((m) => m.score < 60).slice(0, 2);
  const strongest = sorted.filter((m) => m.score >= 70).sort((a, b) => b.score - a.score).slice(0, 1);

  return (
    <SafeAreaView style={styles.safe}>
      {animatedBackground && <AnimatedBackground intensity={backgroundIntensity} />}
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.sessionLabel}>SESSION COMPLETE</Text>
          <Text style={styles.totalScore}>{totalScore.toLocaleString()}</Text>
          <Text style={styles.scoreLabel}>POINTS</Text>
        </View>

        {/* Quick stats */}
        <View style={styles.statsRow}>
          <StatBlock label="Rounds" value={String(roundsCompleted)} />
          <StatBlock label="Avg RT" value={`${Math.round(avgRt)}ms`} />
          <StatBlock label="Best RT" value={`${Math.round(bestRt)}ms`} />
          <StatBlock label="Accuracy" value={`${Math.round(accuracy * 100)}%`} />
        </View>

        {/* Cognitive profile bars */}
        <View style={styles.profileSection}>
          <Text style={styles.sectionLabel}>COGNITIVE PROFILE</Text>
          {metrics.map((m, i) => (
            <MetricBar
              key={m.label}
              label={m.label}
              score={m.score}
              color={m.color}
              delay={i * 100}
            />
          ))}
        </View>

        {/* Focus areas callout */}
        {(weakest.length > 0 || strongest.length > 0) && (
          <View style={styles.focusCard}>
            {strongest.length > 0 && (
              <Text style={styles.focusStrong}>
                Strongest: {strongest.map((m) => m.label).join(', ')}
              </Text>
            )}
            {weakest.length > 0 && (
              <Text style={styles.focusWeak}>
                Focus next: {weakest.map((m) => m.label).join(', ')}
              </Text>
            )}
          </View>
        )}

        {/* Engine report */}
        <View style={styles.engineCard}>
          <Text style={styles.sectionLabel}>ADAPTIVE ENGINE</Text>
          <View style={styles.engineRow}>
            <Text style={styles.engineKey}>Intensity Reached</Text>
            <Text style={styles.engineVal}>
              {Math.round(summary.engineIntensity * 100)}%
            </Text>
          </View>
          <View style={styles.engineRow}>
            <Text style={styles.engineKey}>Mutations Faced</Text>
            <Text style={styles.engineVal}>{summary.mutationsFaced.length}</Text>
          </View>
          <View style={styles.engineRow}>
            <Text style={styles.engineKey}>Mutations Survived</Text>
            <Text style={styles.engineVal}>{summary.mutationsSurvived}</Text>
          </View>
        </View>

        {/* Streak */}
        {streak && streak.currentStreak > 0 && (
          <View style={styles.streakCard}>
            <Text style={styles.streakIcon}>{streak.currentStreak >= 7 ? '\uD83D\uDD25' : '\u26A1'}</Text>
            <Text style={styles.streakText}>
              {streak.currentStreak} day streak
              {getStreakLabel(streak.currentStreak) ? ` \u2014 ${getStreakLabel(streak.currentStreak)}` : ''}
            </Text>
          </View>
        )}


        {/* Companion XP */}
        {companion && (
          <View style={styles.companionCard}>
            <Companion state={companion} size={56} showInfo={true} celebrating={leveledUp} />
            <View style={styles.xpBadge}>
              <Text style={styles.xpBadgeText}>+{xpGained} XP</Text>
            </View>
            {evolved && (
              <View style={styles.evolutionBanner}>
                <Text style={styles.evolutionText}>EVOLVED!</Text>
              </View>
            )}
            {leveledUp && !evolved && (
              <View style={styles.levelUpBanner}>
                <Text style={styles.levelUpText}>LEVEL UP → {companion.level}</Text>
              </View>
            )}
          </View>
        )}

        {/* Shareable snapshot */}
        <ShareableSnapshot
          totalScore={totalScore}
          roundsCompleted={roundsCompleted}
          accuracy={accuracy}
          avgRt={avgRt}
          cognitiveScores={cognitiveScores}
          engineIntensity={summary.engineIntensity}
          streak={streak?.currentStreak}
        />

        {/* CTAs */}
        <View style={styles.ctaGroup}>
          <Pressable
            style={({ pressed }) => [styles.ctaPrimary, pressed && styles.ctaPressed]}
            onPress={() => router.replace('/countdown')}
          >
            <Text style={styles.ctaPrimaryText}>Play Again</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.ctaSecondary, pressed && styles.ctaPressed]}
            onPress={() => {
              resetSession();
              router.replace('/');
            }}
          >
            <Text style={styles.ctaSecondaryText}>Home</Text>
          </Pressable>
        </View>
      </ScrollView>

      {companion && (
        <LevelUpModal
          visible={showLevelUpModal}
          companion={companion}
          evolved={evolved}
          onDismiss={() => setShowLevelUpModal(false)}
        />
      )}

    </SafeAreaView>
  );
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statBlock}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label.toUpperCase()}</Text>
    </View>
  );
}

function getBenchmarkLabel(score: number): string {
  if (score >= 85) return 'Elite';
  if (score >= 70) return 'Advanced';
  if (score >= 50) return 'Intermediate';
  if (score >= 30) return 'Developing';
  return 'Beginner';
}

function MetricBar({
  label,
  score,
  color,
  delay,
}: {
  label: string;
  score: number;
  color: string;
  delay: number;
}) {
  const width = useSharedValue(0);

  useEffect(() => {
    width.value = withDelay(
      delay,
      withTiming(score, {
        duration: 800,
        easing: Easing.bezier(0.22, 1, 0.36, 1),
      })
    );
  }, []);

  const barStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
    backgroundColor: color,
  }));

  return (
    <View style={styles.metricRow}>
      <View style={styles.metricLabelRow}>
        <Text style={styles.metricName}>{label}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
          <Text style={styles.benchmarkLabel}>{getBenchmarkLabel(score)}</Text>
          <Text style={[styles.metricScore, { color }]}>{score}</Text>
        </View>
      </View>
      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, barStyle]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: {
    paddingHorizontal: Spacing.pagePadding,
    paddingTop: 40,
    paddingBottom: 48,
    gap: 32,
  },
  header: { alignItems: 'center', gap: 6 },
  sessionLabel: {
    fontSize: FontSize.label,
    fontWeight: '500',
    color: Colors.textTertiary,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  totalScore: {
    fontSize: 64,
    fontWeight: '600',
    fontFamily: 'serif',
    color: Colors.textPrimary,
    letterSpacing: -2,
  },
  scoreLabel: {
    fontSize: FontSize.label,
    fontWeight: '500',
    color: Colors.accent,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: Spacing.cardRadius,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: 20,
  },
  statBlock: { alignItems: 'center', gap: 4 },
  statValue: {
    fontSize: 20,
    fontWeight: '600',
    fontFamily: 'serif',
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: FontSize.label - 1,
    fontWeight: '500',
    color: Colors.textTertiary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  profileSection: {
    gap: 16,
  },
  sectionLabel: {
    fontSize: FontSize.label,
    fontWeight: '500',
    color: Colors.textTertiary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  metricRow: { gap: 8 },
  metricLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  metricName: {
    fontSize: FontSize.body,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  metricScore: {
    fontSize: 20,
    fontWeight: '600',
    fontFamily: 'serif',
  },
  barTrack: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 2,
  },
  benchmarkLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textTertiary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  focusCard: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.cardRadius,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: 16,
    gap: 6,
  },
  focusStrong: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.success,
    letterSpacing: 0.3,
  },
  focusWeak: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.warning,
    letterSpacing: 0.3,
  },
  engineCard: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.cardRadius,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: 20,
    gap: 12,
  },
  engineRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  engineKey: {
    fontSize: FontSize.body,
    color: Colors.textSecondary,
  },
  engineVal: {
    fontSize: FontSize.body,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontFamily: 'serif',
  },
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.warning + '44',
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignSelf: 'stretch',
  },
  streakIcon: { fontSize: 18 },
  streakText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  ctaGroup: { gap: 12 },
  companionCard: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.cardRadius,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: 20,
    alignItems: 'center',
    gap: 12,
  },
  xpBadge: {
    backgroundColor: Colors.accentSoft,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: Colors.accent + '44',
  },
  xpBadgeText: {
    fontSize: FontSize.label,
    fontWeight: '600',
    color: Colors.accent,
    letterSpacing: 1,
  },
  evolutionBanner: {
    backgroundColor: '#F59E0B22',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.warning + '44',
  },
  evolutionText: {
    fontSize: FontSize.label,
    fontWeight: '700',
    color: Colors.warning,
    letterSpacing: 2,
  },
  levelUpBanner: {
    backgroundColor: Colors.accentSoft,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 8,
  },
  levelUpText: {
    fontSize: FontSize.label,
    fontWeight: '700',
    color: Colors.accent,
    letterSpacing: 1.5,
  },
  ctaPrimary: {
    backgroundColor: Colors.accent,
    paddingVertical: 18,
    borderRadius: Spacing.cardRadius,
    alignItems: 'center',
  },
  ctaSecondary: {
    backgroundColor: Colors.surface,
    paddingVertical: 16,
    borderRadius: Spacing.cardRadius,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  ctaPressed: { opacity: 0.8 },
  ctaPrimaryText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  ctaSecondaryText: {
    fontSize: 17,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
});
