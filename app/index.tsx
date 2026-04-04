import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Colors, FontSize, Spacing } from '../constants/theme';
import { getLifetimeStats } from '../db/sessions';
import { loadCompanion, type CompanionState } from '../db/companion';
import { Companion } from '../components/Companion';
import { AnimatedBackground } from '../components/AnimatedBackground';
import { useAppSettings } from '../store/appSettingsStore';

export default function HomeScreen() {
  const router = useRouter();
  const [stats, setStats] = useState({ sessionCount: 0, bestRt: 0, avgScore: 0 });
  const [companion, setCompanion] = useState<CompanionState | null>(null);
  const animatedBackground = useAppSettings((s) => s.animatedBackground);

  useFocusEffect(
    useCallback(() => {
      getLifetimeStats().then(setStats).catch(console.error);
      loadCompanion().then((c) => {
        if (!c) {
          router.replace('/choose-companion');
        } else {
          setCompanion(c);
        }
      }).catch(console.error);
    }, [])
  );

  const hasStats = stats.sessionCount > 0;

  return (
    <SafeAreaView style={styles.safe}>
      {animatedBackground && <AnimatedBackground />}
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.logo}>
            pulse<Text style={styles.dot}>.</Text>
          </Text>
          <Text style={styles.tagline}>Adaptive Cognitive Training</Text>
        </View>

        {companion && (
          <Companion state={companion} size={72} showInfo={true} />
        )}

        <View style={styles.metricsRow}>
          <MetricBlock label="Sessions" value={hasStats ? String(stats.sessionCount) : '—'} />
          <MetricBlock label="Best RT" value={hasStats ? `${stats.bestRt}ms` : '—'} />
          <MetricBlock label="Avg Score" value={hasStats ? String(stats.avgScore) : '—'} />
        </View>

        <Pressable
          style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
          onPress={() => router.push('/countdown')}
        >
          <Text style={styles.ctaText}>Begin Session</Text>
        </Pressable>

        <View style={styles.bottomRow}>
          <View style={styles.secondaryRow}>
            <Pressable
              style={({ pressed }) => [styles.secondaryBtn, { flex: 1 }, pressed && styles.ctaPressed]}
              onPress={() => router.push('/history')}
            >
              <Text style={styles.secondaryBtnText}>History</Text>
            </Pressable>
            <Pressable
              style={({ pressed }) => [styles.secondaryBtn, styles.settingsBtn, pressed && styles.ctaPressed]}
              onPress={() => router.push('/settings')}
            >
              <Text style={styles.secondaryBtnText}>⚙</Text>
            </Pressable>
          </View>
          <Text style={styles.hint}>60 seconds · 4 cognitive metrics</Text>
        </View>
      </View>
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
  container: {
    flex: 1,
    paddingHorizontal: Spacing.pagePadding,
    paddingTop: 32,
    paddingBottom: 32,
    alignItems: 'center',
    justifyContent: 'space-between',
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
  ctaPressed: { opacity: 0.85 },
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
