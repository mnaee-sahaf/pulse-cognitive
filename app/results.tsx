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
import { loadPurchaseState, type PurchaseState } from '../db/purchaseState';
import { recordSessionForStreak, getStreakMilestone, getStreakLabel, type StreakState } from '../db/streaks';
import { getLifetimeStats } from '../db/sessions';
import { Companion } from '../components/Companion';
import { LevelUpModal } from '../components/LevelUpModal';
import { UpgradePrompt } from '../components/UpgradePrompt';
import { ShareableSnapshot } from '../components/ShareableSnapshot';
import type { GameMode } from '../engine/gameStateMachine';

// Which cognitive dimensions each mode actively trains
const MODE_ACTIVE_DIMS: Record<GameMode, Set<string>> = {
  arc: new Set(['Working Memory', 'Decision Speed']),
  tide: new Set(['Flexibility', 'Decision Speed']),
  ember: new Set(['Reaction Speed', 'Decision Speed']),
};

function buildNudge(
  sessionCount: number,
  streak: StreakState,
  companionLevel: number
): string | null {
  // Milestone nudges (highest priority first)
  const milestone = getStreakMilestone(streak.currentStreak);
  if (milestone === 7) {
    return '7 days straight — you\'re serious about this. Unlock full training for $7.99.';
  }
  if (companionLevel === 10) {
    return 'Your companion reached Level 10! The other companions are waiting.';
  }
  // Session-count nudges
  if (sessionCount === 3) {
    return 'Your brain is warming up. Unlock all 3 training modes to build a complete profile.';
  }
  if (sessionCount === 5) {
    return 'You\'ve completed 5 sessions! Complete cognitive training requires all 3 modes.';
  }
  if (sessionCount === 10) {
    return '10 sessions in — you\'re committed. Train the whole brain for $7.99.';
  }
  // Every 10th session after that
  if (sessionCount > 10 && sessionCount % 10 === 0) {
    return `${sessionCount} sessions and counting. Unlock everything for just $7.99.`;
  }
  return null;
}

export default function ResultsScreen() {
  const router = useRouter();
  const { summary, engine, resetSession, gameMode } = useGameStore();
  const animatedBackground = useAppSettings((s) => s.animatedBackground);
  const backgroundIntensity = useAppSettings((s) => s.backgroundIntensity);
  const savedRef = useRef(false);
  const [companion, setCompanion] = useState<CompanionState | null>(null);
  const [purchaseState, setPurchaseState] = useState<PurchaseState | null>(null);
  const [upgradeVisible, setUpgradeVisible] = useState(false);
  const [xpGained, setXpGained] = useState(0);
  const [leveledUp, setLeveledUp] = useState(false);
  const [evolved, setEvolved] = useState(false);
  const [showLevelUpModal, setShowLevelUpModal] = useState(false);
  const [streak, setStreak] = useState<StreakState | null>(null);
  const [nudgeText, setNudgeText] = useState<string | null>(null);
  const [sessionCount, setSessionCount] = useState(0);

  // Persist session and award XP once on mount
  useEffect(() => {
    if (!summary || savedRef.current) return;
    savedRef.current = true;

    const persist = async () => {
      await saveSession(summary, engine.leverHistory);
      const seed = await getProfileSeedData(10);
      await updatePlayerProfile(seed.avgRts, seed.maxSequenceLengths, seed.flexRatings, seed.accuracies);

      const result = await awardXp(summary.totalScore);
      setCompanion(result.state);
      setXpGained(scoreToXp(summary.totalScore));
      setLeveledUp(result.leveledUp);
      setEvolved(result.evolved);
      if (result.leveledUp) setShowLevelUpModal(true);

      const ps = await loadPurchaseState();
      setPurchaseState(ps);

      // Record streak
      const streakResult = await recordSessionForStreak();
      setStreak(streakResult);

      // Get session count for nudge triggers
      const stats = await getLifetimeStats();
      setSessionCount(stats.sessionCount);

      // Build contextual nudge (only for free users)
      if (ps && !ps.fullUnlock) {
        const nudge = buildNudge(stats.sessionCount, streakResult, result.state.level);
        setNudgeText(nudge);
      }
    };
    persist().catch(console.error);
  }, []);

  if (!summary) {
    router.replace('/');
    return null;
  }

  const { cognitiveScores, totalScore, roundsCompleted, avgRt, bestRt, accuracy } = summary;

  const activeDims = MODE_ACTIVE_DIMS[gameMode] ?? MODE_ACTIVE_DIMS.arc;
  const isFullUnlock = purchaseState?.fullUnlock ?? false;

  const metrics = [
    { label: 'Reaction Speed', score: cognitiveScores.rtScore, color: Colors.accent },
    { label: 'Working Memory', score: cognitiveScores.wmScore, color: '#8B5CF6' },
    { label: 'Flexibility', score: cognitiveScores.flexScore, color: Colors.warning },
    { label: 'Decision Speed', score: cognitiveScores.decisionScore, color: Colors.success },
  ].map((m) => ({
    ...m,
    locked: !isFullUnlock && !activeDims.has(m.label),
  }));

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
              locked={m.locked}
              onLockedTap={() => setUpgradeVisible(true)}
            />
          ))}
          {metrics.some((m) => m.locked) && (
            <Pressable
              onPress={() => setUpgradeVisible(true)}
              style={({ pressed }) => [styles.profileNudge, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.profileNudgeText}>
                Unlock all training modes to build a complete profile
              </Text>
            </Pressable>
          )}
        </View>

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

        {/* Upgrade nudge */}
        {nudgeText && (
          <Pressable
            style={({ pressed }) => [styles.nudgeCard, pressed && { opacity: 0.8 }]}
            onPress={() => setUpgradeVisible(true)}
          >
            <Text style={styles.nudgeText}>{nudgeText}</Text>
          </Pressable>
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

      {purchaseState && (
        <UpgradePrompt
          visible={upgradeVisible}
          freeCompanionId={purchaseState.freeCompanionId}
          onPurchase={() => {
            // TODO: wire up IAP
            setUpgradeVisible(false);
          }}
          onDismiss={() => setUpgradeVisible(false)}
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

function MetricBar({
  label,
  score,
  color,
  delay,
  locked = false,
  onLockedTap,
}: {
  label: string;
  score: number;
  color: string;
  delay: number;
  locked?: boolean;
  onLockedTap?: () => void;
}) {
  const width = useSharedValue(0);

  useEffect(() => {
    if (!locked) {
      width.value = withDelay(
        delay,
        withTiming(score, {
          duration: 800,
          easing: Easing.bezier(0.22, 1, 0.36, 1),
        })
      );
    }
  }, [locked]);

  const barStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
    backgroundColor: locked ? Colors.border : color,
  }));

  const content = (
    <View style={[styles.metricRow, locked && { opacity: 0.5 }]}>
      <View style={styles.metricLabelRow}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {locked && <Text style={{ fontSize: 11 }}>{'\uD83D\uDD12'}</Text>}
          <Text style={styles.metricName}>{label}</Text>
        </View>
        {locked ? (
          <Text style={[styles.metricScore, { color: Colors.textTertiary, fontSize: 11 }]}>LOCKED</Text>
        ) : (
          <Text style={[styles.metricScore, { color }]}>{score}</Text>
        )}
      </View>
      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, barStyle]} />
      </View>
    </View>
  );

  if (locked && onLockedTap) {
    return (
      <Pressable onPress={onLockedTap}>
        {content}
      </Pressable>
    );
  }

  return content;
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
  profileNudge: {
    marginTop: 4,
    paddingVertical: 8,
    alignItems: 'center',
  },
  profileNudgeText: {
    fontSize: 12,
    color: Colors.accent,
    fontWeight: '500',
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
  nudgeCard: {
    backgroundColor: Colors.accentSoft,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.accent + '33',
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignSelf: 'stretch',
  },
  nudgeText: {
    fontSize: 13,
    color: Colors.accent,
    lineHeight: 18,
    textAlign: 'center',
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
