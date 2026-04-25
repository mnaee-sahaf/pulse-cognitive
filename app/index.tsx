import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Colors, FontSize, Spacing, Pressed } from '../constants/theme';
import { getLifetimeStats, getCognitiveProfile } from '../db/sessions';
import {
  loadCompanion,
  getAllCompanions,
  switchCompanion,
  type CompanionState,
  type CompanionId,
} from '../db/companion';
import { loadPurchaseState, type PurchaseState } from '../db/purchaseState';
import { loadStreakState, getStreakLabel, type StreakState } from '../db/streaks';
import { Companion } from '../components/Companion';
import { CompanionSwitcher } from '../components/CompanionSwitcher';
import { CognitiveRadar, type RadarDimension } from '../components/CognitiveRadar';
import { AnimatedBackground } from '../components/AnimatedBackground';
import { useAppSettings } from '../store/appSettingsStore';

export default function HomeScreen() {
  const router = useRouter();
  const [stats, setStats] = useState({ sessionCount: 0, bestRt: 0, avgScore: 0 });
  const [cogProfile, setCogProfile] = useState({ rtScore: 0, wmScore: 0, flexScore: 0, decisionScore: 0 });
  const [companion, setCompanion] = useState<CompanionState | null>(null);
  const [allCompanions, setAllCompanions] = useState<CompanionState[]>([]);
  const [purchaseState, setPurchaseState] = useState<PurchaseState | null>(null);
  const [streak, setStreak] = useState<StreakState>({ currentStreak: 0, bestStreak: 0, lastSessionDate: null, frozen: false });
  const [weeklyReport, setWeeklyReport] = useState<WeeklyReport | null>(null);
  const [switcherVisible, setSwitcherVisible] = useState(false);
  const animatedBackground = useAppSettings((s) => s.animatedBackground);
  const backgroundIntensity = useAppSettings((s) => s.backgroundIntensity);

  const loadData = useCallback(() => {
    getLifetimeStats().then(setStats).catch(console.error);
    getCognitiveProfile().then(setCogProfile).catch(console.error);
    loadCompanion().then((c) => {
      if (!c) {
        router.replace('/choose-companion');
      } else {
        setCompanion(c);
      }
    }).catch(console.error);
    getAllCompanions().then(setAllCompanions).catch(console.error);
    loadPurchaseState().then(setPurchaseState).catch(console.error);
    loadStreakState().then(setStreak).catch(console.error);
    generateWeeklyReport().then(setWeeklyReport).catch(console.error);
  }, []);

  useFocusEffect(loadData);

  const handleSwitchCompanion = useCallback(async (id: CompanionId) => {
    await switchCompanion(id);
    setSwitcherVisible(false);
    loadData();
  }, [loadData]);

  const hasStats = stats.sessionCount > 0;
  const isFullUnlock = true; // v1: all modes unlocked
  const activeMode = companion?.companionId ?? 'arc';

  // Build radar dimensions — lock dimensions not trained by the active mode
  const radarDims: RadarDimension[] = [
    { label: 'Processing Speed', shortLabel: 'RT', value: cogProfile.rtScore, color: Colors.accent, locked: !isFullUnlock && activeMode !== 'ember' },
    { label: 'Working Memory', shortLabel: 'WM', value: cogProfile.wmScore, color: '#8B5CF6', locked: !isFullUnlock && activeMode !== 'arc' },
    { label: 'Flexibility', shortLabel: 'FLEX', value: cogProfile.flexScore, color: Colors.warning, locked: !isFullUnlock && activeMode !== 'tide' },
    { label: 'Decision Efficiency', shortLabel: 'DEC', value: cogProfile.decisionScore, color: Colors.success, locked: false },
  ];

  const streakLabel = getStreakLabel(streak.currentStreak);

  // Pulse Index — average of the four cognitive dimensions, this week vs last week.
  // Surfaces real week-over-week improvement, the single biggest retention lever.
  const pulseIndex = useMemo(() => {
    if (!weeklyReport || weeklyReport.sessionsThisWeek === 0) return null;
    const avg = (a: number, b: number, c: number, d: number) => Math.round((a + b + c + d) / 4);
    const current = avg(
      weeklyReport.rtScoreThisWeek,
      weeklyReport.wmScoreThisWeek,
      weeklyReport.flexScoreThisWeek,
      weeklyReport.decisionScoreThisWeek
    );
    const previous = weeklyReport.sessionsLastWeek > 0
      ? avg(
          weeklyReport.rtScoreLastWeek,
          weeklyReport.wmScoreLastWeek,
          weeklyReport.flexScoreLastWeek,
          weeklyReport.decisionScoreLastWeek
        )
      : 0;
    return { current, previous, sessionsThisWeek: weeklyReport.sessionsThisWeek };
  }, [weeklyReport]);

  return (
    <SafeAreaView style={styles.safe}>
      {animatedBackground && <AnimatedBackground intensity={backgroundIntensity} />}
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.logo}>
            pulse<Text style={styles.dot}>.</Text>
          </Text>
          <Text style={styles.tagline}>Adaptive Cognitive Training</Text>
        </View>

        {companion && (
          <Pressable
            onPress={() => setSwitcherVisible(true)}
            style={({ pressed }) => [styles.companionTap, pressed && Pressed]}
            accessibilityRole="button"
            accessibilityLabel={`Switch training mode. Currently ${companion.companionId.toUpperCase()}.`}
          >
            <Companion state={companion} size={64} showInfo={true} />
            <Text style={styles.switchHint}>TAP TO SWITCH MODE</Text>
          </Pressable>
        )}

        {/* Hero metric — Pulse Index this week vs last week */}
        {pulseIndex && (
          <Pressable
            style={({ pressed }) => [styles.heroCard, pressed && Pressed]}
            onPress={() => router.push('/weekly-report')}
            accessibilityRole="button"
            accessibilityLabel={`Pulse Index ${pulseIndex.current}. Open weekly report.`}
          >
            <View style={styles.heroLeft}>
              <Text style={styles.heroLabel}>PULSE INDEX</Text>
              <Text style={styles.heroValue}>{pulseIndex.current}</Text>
              <Text style={styles.heroFootnote}>
                {pulseIndex.sessionsThisWeek} {pulseIndex.sessionsThisWeek === 1 ? 'session' : 'sessions'} this week
              </Text>
            </View>
            {pulseIndex.previous > 0 && (
              <View style={styles.heroRight}>
                <Text style={styles.heroTrend}>
                  {trendArrow(pulseIndex.current, pulseIndex.previous) || '→ flat'}
                </Text>
                <Text style={styles.heroTrendHint}>vs last week</Text>
              </View>
            )}
          </Pressable>
        )}

        {/* Streak display */}
        {streak.currentStreak > 0 && (
          <View style={styles.streakRow}>
            <Text style={styles.streakFire}>{streak.currentStreak >= 7 ? '\uD83D\uDD25' : '\u26A1'}</Text>
            <View style={styles.streakInfo}>
              <Text style={styles.streakCount}>{streak.currentStreak} day streak</Text>
              {streakLabel && <Text style={styles.streakBadge}>{streakLabel}</Text>}
              {streak.frozen && <Text style={styles.streakFrozen}>FROZEN — play today to keep it</Text>}
            </View>
            {streak.bestStreak > streak.currentStreak && (
              <Text style={styles.streakBest}>Best: {streak.bestStreak}</Text>
            )}
          </View>
        )}

        {/* Cognitive radar chart */}
        {hasStats && (
          <View style={styles.radarSection}>
            <Text style={styles.sectionLabel}>COGNITIVE PROFILE</Text>
            <CognitiveRadar dimensions={radarDims} size={180} />
            
          </View>
        )}

        {/* Stats row */}
        <View style={styles.metricsRow}>
          <MetricBlock label="Sessions" value={hasStats ? String(stats.sessionCount) : '\u2014'} />
          <MetricBlock label="Best RT" value={hasStats ? `${stats.bestRt}ms` : '\u2014'} />
          <MetricBlock label="Avg Score" value={hasStats ? String(stats.avgScore) : '\u2014'} />
        </View>

        <Pressable
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
          onPress={() => router.push('/countdown')}
          accessibilityRole="button"
          accessibilityLabel="Begin training session"
          accessibilityHint="Starts a 60-second cognitive training round"
        >
          <Text style={styles.ctaText}>Begin Session</Text>
        </Pressable>

        <View style={styles.bottomRow}>
          <View style={styles.secondaryRow}>
            <Pressable
              style={({ pressed }) => [styles.secondaryBtn, { flex: 1 }, pressed && styles.ctaPressed]}
              onPress={() => router.push('/history')}
              accessibilityRole="button"
              accessibilityLabel="History"
            >
              <Text style={styles.secondaryBtnText}>History</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.secondaryBtn, { flex: 1 }, pressed && styles.ctaPressed]}
              onPress={() => router.push('/weekly-report')}
              accessibilityRole="button"
              accessibilityLabel="Weekly report"
            >
              <Text style={styles.secondaryBtnText}>Weekly</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.secondaryBtn, styles.settingsBtn, pressed && styles.ctaPressed]}
              onPress={() => router.push('/settings')}
              accessibilityRole="button"
              accessibilityLabel="Settings"
            >
              <Text style={styles.secondaryBtnText}>{'\u2699'}</Text>
            </Pressable>
          </View>
          <Text style={styles.hint}>60 seconds · 4 cognitive metrics</Text>
        </View>
      </ScrollView>

      <CompanionSwitcher
        visible={switcherVisible}
        companions={allCompanions}
        purchaseState={purchaseState}
        onSelect={handleSwitchCompanion}
        onUpgrade={() => setSwitcherVisible(false)}
        onClose={() => setSwitcherVisible(false)}
      />
    </SafeAreaView>
  );
}

function MetricBlock({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metricBlock}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: {
    paddingHorizontal: Spacing.pagePadding,
    paddingTop: 32,
    paddingBottom: 32,
    alignItems: 'center',
    gap: 20,
  },
  header: { alignItems: 'center', gap: 8 },
  logo: {
    fontFamily: 'serif',
    fontSize: FontSize.logo,
    fontWeight: '600',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  dot: { color: Colors.accent },
  tagline: {
    fontSize: FontSize.label,
    fontWeight: '500',
    color: Colors.textTertiary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  companionTap: {
    alignItems: 'center',
    gap: 8,
  },
  switchHint: {
    fontSize: FontSize.label - 1,
    color: Colors.textTertiary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  // Hero metric — Pulse Index card
  heroCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: Spacing.cardRadius,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 18,
    paddingVertical: 16,
    width: '100%',
    gap: 12,
  },
  heroLeft: { gap: 2, flex: 1 },
  heroLabel: {
    fontSize: FontSize.label,
    fontWeight: '600',
    color: Colors.textTertiary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  heroValue: {
    fontSize: 36,
    fontFamily: 'serif',
    fontWeight: '600',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  heroFootnote: {
    fontSize: 12,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  heroRight: { alignItems: 'flex-end', gap: 2 },
  heroTrend: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.success,
    fontFamily: 'serif',
  },
  heroTrendHint: {
    fontSize: 11,
    color: Colors.textTertiary,
    letterSpacing: 0.5,
  },
  // Streak
  streakRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: Colors.surface,
    borderRadius: Spacing.cardRadius,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    width: '100%',
  },
  streakFire: { fontSize: 20 },
  streakInfo: { flex: 1, gap: 2 },
  streakCount: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  streakBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: Colors.warning,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  streakFrozen: {
    fontSize: 9,
    color: Colors.danger,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  streakBest: {
    fontSize: FontSize.label,
    color: Colors.textTertiary,
  },
  // Radar
  radarSection: {
    alignItems: 'center',
    gap: 8,
    width: '100%',
  },
  sectionLabel: {
    fontSize: FontSize.label,
    fontWeight: '500',
    color: Colors.textTertiary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    alignSelf: 'flex-start',
  },
  radarHint: {
    fontSize: 11,
    color: Colors.accent,
    fontWeight: '500',
    letterSpacing: 0.3,
  },
  // Metrics
  metricsRow: { flexDirection: 'row', gap: 24 },
  metricBlock: { alignItems: 'center', gap: 4, minWidth: 72 },
  metricValue: {
    fontSize: FontSize.display,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontFamily: 'serif',
  },
  metricLabel: {
    fontSize: FontSize.label,
    fontWeight: '500',
    color: Colors.textTertiary,
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  cta: {
    backgroundColor: Colors.accent,
    paddingVertical: 18,
    paddingHorizontal: 48,
    borderRadius: Spacing.cardRadius,
    width: '100%',
    alignItems: 'center',
  },
  ctaPressed: Pressed,
  ctaText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  bottomRow: { alignItems: 'center', gap: 16, width: '100%' },
  secondaryRow: { flexDirection: 'row', gap: 12, width: '100%' },
  secondaryBtn: {
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: Spacing.cardRadius,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  settingsBtn: {
    flex: 0,
    paddingHorizontal: 16,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  hint: {
    fontSize: FontSize.label,
    color: Colors.textTertiary,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
});
