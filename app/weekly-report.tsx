import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, FontSize, Spacing } from '../constants/theme';
import { generateWeeklyReport, trendArrow, rtTrendArrow, type WeeklyReport } from '../db/weeklyReport';
import { loadPurchaseState, type PurchaseState } from '../db/purchaseState';

export default function WeeklyReportScreen() {
  const router = useRouter();
  const [report, setReport] = useState<WeeklyReport | null>(null);
  const [purchaseState, setPurchaseState] = useState<PurchaseState | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([generateWeeklyReport(), loadPurchaseState()])
      .then(([r, ps]) => {
        setReport(r);
        setPurchaseState(ps);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <View style={styles.safe} />;

  if (!report) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No sessions this week yet.</Text>
          <Text style={styles.emptySubtext}>Play a session to start tracking your weekly progress.</Text>
          <Pressable
            style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.8 }]}
            onPress={() => router.back()}
          >
            <Text style={styles.backBtnText}>Back</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const isFullUnlock = purchaseState?.fullUnlock ?? false;
  const weekLabel = new Date(report.weekStarting).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  const dimensions = [
    { label: 'Reaction Speed', current: report.rtScoreThisWeek, prev: report.rtScoreLastWeek, color: Colors.accent },
    { label: 'Working Memory', current: report.wmScoreThisWeek, prev: report.wmScoreLastWeek, color: '#8B5CF6' },
    { label: 'Flexibility', current: report.flexScoreThisWeek, prev: report.flexScoreLastWeek, color: Colors.warning },
    { label: 'Decision Speed', current: report.decisionScoreThisWeek, prev: report.decisionScoreLastWeek, color: Colors.success },
  ];

  // Find strongest and weakest trained dimensions
  const strongest = dimensions.reduce((a, b) => a.current > b.current ? a : b);
  const weakest = dimensions.reduce((a, b) => a.current < b.current ? a : b);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>WEEKLY REPORT</Text>
        <Text style={styles.title}>Week of {weekLabel}</Text>

        {/* Sessions overview */}
        <View style={styles.card}>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Sessions</Text>
            <View style={styles.statValues}>
              <Text style={styles.statCurrent}>{report.sessionsThisWeek}</Text>
              {report.sessionsLastWeek > 0 && (
                <Text style={styles.statTrend}>
                  {trendArrow(report.sessionsThisWeek, report.sessionsLastWeek)}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Avg RT</Text>
            <View style={styles.statValues}>
              <Text style={styles.statCurrent}>{report.avgRtThisWeek}ms</Text>
              {report.avgRtLastWeek > 0 && (
                <Text style={styles.statTrend}>
                  {rtTrendArrow(report.avgRtThisWeek, report.avgRtLastWeek)}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Avg Score</Text>
            <View style={styles.statValues}>
              <Text style={styles.statCurrent}>{report.avgScoreThisWeek}</Text>
              {report.avgScoreLastWeek > 0 && (
                <Text style={styles.statTrend}>
                  {trendArrow(report.avgScoreThisWeek, report.avgScoreLastWeek)}
                </Text>
              )}
            </View>
          </View>
          <View style={styles.statRow}>
            <Text style={styles.statLabel}>Best Round</Text>
            <Text style={styles.statCurrent}>{report.bestRoundThisWeek}</Text>
          </View>
        </View>

        {/* Cognitive dimensions */}
        <Text style={styles.sectionLabel}>COGNITIVE DIMENSIONS</Text>
        <View style={styles.card}>
          {dimensions.map((d) => (
            <View key={d.label} style={styles.dimRow}>
              <View style={[styles.dimDot, { backgroundColor: d.color }]} />
              <Text style={styles.dimLabel}>{d.label}</Text>
              <Text style={[styles.dimScore, { color: d.color }]}>{d.current}</Text>
              {d.prev > 0 && (
                <Text style={styles.dimTrend}>{trendArrow(d.current, d.prev)}</Text>
              )}
            </View>
          ))}
        </View>

        {/* Insight */}
        <View style={styles.insightCard}>
          <Text style={styles.insightText}>
            Your strongest dimension this week is{' '}
            <Text style={{ fontWeight: '700', color: strongest.color }}>{strongest.label}</Text>
            {weakest.current < strongest.current && (
              <>
                .{' '}
                <Text style={{ color: weakest.color }}>{weakest.label}</Text>
                {' '}needs the most attention.
              </>
            )}
          </Text>
        </View>

        {/* Upgrade nudge for free users */}
        {!isFullUnlock && (
          <View style={styles.nudgeCard}>
            <Text style={styles.nudgeText}>
              You're only training 1 of 3 cognitive dimensions.
              Unlock all modes for a balanced brain — $7.99 one-time.
            </Text>
          </View>
        )}

        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && { opacity: 0.8 }]}
          onPress={() => router.back()}
        >
          <Text style={styles.backBtnText}>Back</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: {
    paddingHorizontal: Spacing.pagePadding,
    paddingTop: 40,
    paddingBottom: 48,
    gap: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.pagePadding,
    gap: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'serif',
    color: Colors.textPrimary,
  },
  emptySubtext: {
    fontSize: FontSize.body,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  sectionLabel: {
    fontSize: FontSize.label,
    fontWeight: '500',
    color: Colors.textTertiary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  title: {
    fontSize: FontSize.display,
    fontWeight: '600',
    fontFamily: 'serif',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.cardRadius,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: 16,
    gap: 12,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: FontSize.body,
    color: Colors.textSecondary,
  },
  statValues: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statCurrent: {
    fontSize: FontSize.body,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontFamily: 'serif',
  },
  statTrend: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.success,
  },
  dimRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dimDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dimLabel: {
    fontSize: FontSize.body,
    color: Colors.textPrimary,
    flex: 1,
  },
  dimScore: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'serif',
    minWidth: 32,
    textAlign: 'right',
  },
  dimTrend: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.success,
    minWidth: 40,
    textAlign: 'right',
  },
  insightCard: {
    backgroundColor: Colors.accentSoft,
    borderRadius: 12,
    padding: 14,
  },
  insightText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  nudgeCard: {
    backgroundColor: Colors.warning + '12',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.warning + '33',
    padding: 14,
  },
  nudgeText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    textAlign: 'center',
  },
  backBtn: {
    paddingVertical: 14,
    borderRadius: Spacing.cardRadius,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  backBtnText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
});
