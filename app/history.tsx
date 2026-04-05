import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import { useFocusEffect, useRouter } from 'expo-router';
import { getRecentSessions, type StoredSession } from '../db/sessions';
import { exportSessionsCsv } from '../db/export';
import { Colors, FontSize, Spacing } from '../constants/theme';

export default function HistoryScreen() {
  const router = useRouter();
  const [sessions, setSessions] = useState<StoredSession[]>([]);
  const [exporting, setExporting] = useState(false);

  useFocusEffect(
    useCallback(() => {
      getRecentSessions(20)
        .then(setSessions)
        .catch(console.error);
    }, [])
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backText}>←</Text>
        </Pressable>
        <Text style={styles.title}>History</Text>
        <Pressable
          onPress={async () => {
            setExporting(true);
            await exportSessionsCsv().catch(console.error);
            setExporting(false);
          }}
          disabled={exporting || sessions.length === 0}
        >
          <Text style={[
            styles.exportBtn,
            (exporting || sessions.length === 0) && styles.exportBtnDisabled,
          ]}>
            {exporting ? 'Exporting…' : 'Export CSV'}
          </Text>
        </Pressable>
      </View>

      {sessions.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No sessions yet.</Text>
          <Text style={styles.emptyHint}>Complete a session to see your history.</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
        >
          {/* Trend chart */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>RT TREND (last 20 sessions)</Text>
            <RtTrendChart sessions={sessions} />
          </View>

          {/* Cognitive profile averages */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>AVERAGE PROFILE</Text>
            <AvgProfileBars sessions={sessions} />
          </View>

          {/* Session list */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>SESSIONS</Text>
            {sessions.map((s, i) => (
              <SessionRow key={s.sessionId} session={s} index={i} />
            ))}
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function RtTrendChart({ sessions }: { sessions: StoredSession[] }) {
  const ordered = [...sessions].reverse(); // oldest first
  const rts = ordered.map((s) => s.avgRt);
  const max = Math.max(...rts, 1);
  const min = Math.min(...rts);
  const range = max - min || 1;
  const chartHeight = 80;
  const barWidth = Math.min(20, (340 - (ordered.length - 1) * 4) / ordered.length);

  return (
    <View style={styles.chartContainer}>
      <View style={[styles.chart, { height: chartHeight }]}>
        {ordered.map((s, i) => {
          const heightPct = ((max - s.avgRt) / range);
          const barH = Math.max(4, heightPct * (chartHeight - 8));
          return (
            <View key={s.sessionId} style={styles.barWrapper}>
              <View style={{ flex: 1, justifyContent: 'flex-end' }}>
                <View
                  style={[
                    styles.rtBar,
                    {
                      height: barH,
                      backgroundColor: s.avgRt < 350 ? Colors.success : Colors.accent,
                    },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>
      <View style={styles.chartLabels}>
        <Text style={styles.chartLabel}>{Math.round(min)}ms best</Text>
        <Text style={styles.chartLabel}>{Math.round(max)}ms slowest</Text>
      </View>
    </View>
  );
}

function AvgProfileBars({ sessions }: { sessions: StoredSession[] }) {
  const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;

  const metrics = [
    {
      label: 'Processing Speed',
      score: Math.round(avg(sessions.map((s) => s.rtScore))),
      color: Colors.accent,
    },
    {
      label: 'Working Memory',
      score: Math.round(avg(sessions.map((s) => s.wmScore))),
      color: '#8B5CF6',
    },
    {
      label: 'Flexibility',
      score: Math.round(avg(sessions.map((s) => s.flexScore))),
      color: Colors.warning,
    },
    {
      label: 'Decision Efficiency',
      score: Math.round(avg(sessions.map((s) => s.decisionScore))),
      color: Colors.success,
    },
  ];

  return (
    <View style={styles.profileBars}>
      {metrics.map((m, i) => (
        <AnimatedBar key={m.label} {...m} delay={i * 80} />
      ))}
    </View>
  );
}

function AnimatedBar({
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

  useFocusEffect(
    useCallback(() => {
      width.value = 0;
      width.value = withDelay(
        delay,
        withTiming(score, { duration: 700, easing: Easing.bezier(0.22, 1, 0.36, 1) })
      );
    }, [score])
  );

  const barStyle = useAnimatedStyle(() => ({
    width: `${width.value}%`,
    backgroundColor: color,
  }));

  return (
    <View style={styles.barRow}>
      <View style={styles.barLabelRow}>
        <Text style={styles.barLabel}>{label}</Text>
        <Text style={[styles.barScore, { color }]}>{score}</Text>
      </View>
      <View style={styles.barTrack}>
        <Animated.View style={[styles.barFill, barStyle]} />
      </View>
    </View>
  );
}

function SessionRow({ session, index }: { session: StoredSession; index: number }) {
  const date = new Date(session.timestamp);
  const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

  return (
    <View style={styles.sessionRow}>
      <View style={styles.sessionLeft}>
        <Text style={styles.sessionDate}>{dateStr}</Text>
        <Text style={styles.sessionTime}>{timeStr}</Text>
      </View>
      <View style={styles.sessionMid}>
        <Text style={styles.sessionScore}>{session.totalScore.toLocaleString()}</Text>
        <Text style={styles.sessionScoreLabel}>pts</Text>
      </View>
      <View style={styles.sessionRight}>
        <Text style={styles.sessionRt}>{Math.round(session.avgRt)}ms</Text>
        <Text style={styles.sessionRounds}>{session.roundsCompleted}r</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.pagePadding,
    paddingTop: 12,
    paddingBottom: 16,
  },
  backBtn: { width: 32, height: 32, justifyContent: 'center' },
  backText: { fontSize: 22, color: Colors.textPrimary },
  title: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.textPrimary,
    letterSpacing: 0.2,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: FontSize.body,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  emptyHint: {
    fontSize: FontSize.label,
    color: Colors.textTertiary,
    letterSpacing: 0.5,
  },
  scroll: {
    paddingHorizontal: Spacing.pagePadding,
    paddingBottom: 48,
    gap: 32,
  },
  section: { gap: 12 },
  sectionLabel: {
    fontSize: FontSize.label,
    fontWeight: '500',
    color: Colors.textTertiary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  chartContainer: { gap: 6 },
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
    backgroundColor: Colors.surface,
    borderRadius: Spacing.cardRadius,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: 12,
  },
  barWrapper: { flex: 1, height: '100%' },
  rtBar: { borderRadius: 3, minHeight: 4 },
  chartLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  chartLabel: {
    fontSize: FontSize.label - 1,
    color: Colors.textTertiary,
    letterSpacing: 0.5,
  },
  profileBars: { gap: 14 },
  barRow: { gap: 6 },
  barLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  barLabel: {
    fontSize: FontSize.body,
    color: Colors.textSecondary,
  },
  barScore: {
    fontSize: 18,
    fontWeight: '600',
    fontFamily: 'serif',
  },
  barTrack: {
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: { height: '100%', borderRadius: 2 },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  sessionLeft: { gap: 2 },
  sessionDate: {
    fontSize: FontSize.body,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  sessionTime: {
    fontSize: FontSize.label,
    color: Colors.textTertiary,
    letterSpacing: 0.3,
  },
  sessionMid: { alignItems: 'center', gap: 2 },
  sessionScore: {
    fontSize: 20,
    fontWeight: '600',
    fontFamily: 'serif',
    color: Colors.textPrimary,
  },
  sessionScoreLabel: {
    fontSize: FontSize.label,
    color: Colors.textTertiary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  sessionRight: { alignItems: 'flex-end', gap: 2 },
  sessionRt: {
    fontSize: FontSize.body,
    fontWeight: '500',
    color: Colors.accent,
    fontFamily: 'serif',
  },
  sessionRounds: {
    fontSize: FontSize.label,
    color: Colors.textTertiary,
    letterSpacing: 0.5,
  },
  exportBtn: {
    fontSize: FontSize.label,
    fontWeight: '500',
    color: Colors.accent,
    letterSpacing: 0.5,
  },
  exportBtnDisabled: {
    color: Colors.textTertiary,
  },
});
