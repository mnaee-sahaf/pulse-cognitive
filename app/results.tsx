/**
 * Pulse v2 — Run Summary.
 *
 * Concrete records replace abstract scores: highest wave, peak combo,
 * mutations survived, per-dimension thetas. No "Pulse Index" black box.
 *
 * On mount, the run is persisted to sessions (with the new theta_*
 * columns). If it was a daily trial, completion is recorded too.
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useGameStoreV2 } from '../store/gameStoreV2';
import { Colors, FontSize, Spacing, Pressed } from '../constants/theme';
import { saveSessionV2 } from '../db/sessions';
import { recordCompletion } from '../db/dailyTrial';
import { formatDate } from '../engine/dailyTrial';
import { DIMENSIONS, type DimensionId } from '../engine/dimensions';
import { lookupNorm, percentile } from '../engine/norms';
import { loadDemographics } from '../db/profile';

export default function ResultsScreen() {
  const router = useRouter();
  const summary = useGameStoreV2((s) => s.summary);
  const resetRun = useGameStoreV2((s) => s.resetRun);
  const persistedRef = useRef(false);
  const [percentiles, setPercentiles] = useState<Partial<Record<DimensionId, number>>>({});

  useEffect(() => {
    if (!summary || persistedRef.current) return;
    persistedRef.current = true;

    const persist = async () => {
      try {
        await saveSessionV2(summary);
        if (summary.isDailyTrial) {
          await recordCompletion(
            formatDate(new Date()),
            summary.highestWave.index,
            summary.totalScore
          );
        }
        const demo = await loadDemographics();
        if (demo) {
          const next: Partial<Record<DimensionId, number>> = {};
          for (const id of Object.keys(summary.finalThetas) as DimensionId[]) {
            const dim = DIMENSIONS[id];
            const theta = summary.finalThetas[id];
            if (!dim?.norm || theta === undefined) continue;
            const norm = lookupNorm(dim.norm.table, demo.ageBand, demo.sex);
            next[id] = percentile(theta, norm, dim.norm.lowerIsBetter);
          }
          setPercentiles(next);
        }
      } catch {
        // Persistence failures shouldn't crash the results UI.
      }
    };
    persist();
  }, [summary]);

  if (!summary) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.loading}>
          <Text style={styles.loadingTitle}>No run to show</Text>
          <Pressable
            style={({ pressed }) => [styles.ctaSecondary, pressed && Pressed]}
            onPress={() => router.replace('/')}
            accessibilityRole="button"
            accessibilityLabel="Return home"
          >
            <Text style={styles.ctaSecondaryText}>Home</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const wave = summary.highestWave;
  const seconds = Math.round(summary.durationMs / 1000);
  const dimensionRows = (Object.keys(summary.finalThetas) as DimensionId[])
    .map((id) => ({
      id,
      label: DIMENSIONS[id].label,
      shortLabel: DIMENSIONS[id].shortLabel,
      theta: summary.finalThetas[id]!,
      pct: percentiles[id],
      hasNorm: DIMENSIONS[id].norm !== null,
    }))
    .filter((r) => r.theta !== undefined);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.sessionLabel}>RUN COMPLETE</Text>
          <Text style={styles.totalScore}>{summary.totalScore.toLocaleString()}</Text>
          <Text style={styles.scoreLabel}>POINTS</Text>
        </View>

        <View style={styles.waveCard}>
          <Text style={styles.waveLabel}>HIGHEST WAVE</Text>
          <Text style={styles.waveIndex}>Wave {wave.index}</Text>
          <Text style={styles.waveName}>{wave.name}</Text>
          <Text style={styles.waveTagline}>{wave.tagline}</Text>
        </View>

        <View style={styles.statsRow}>
          <StatBlock label="Rounds" value={String(summary.highestRound)} />
          <StatBlock
            label="Peak Combo"
            value={summary.peakComboCount > 0 ? `x${summary.peakComboCount}` : '—'}
          />
          <StatBlock label="Mutations" value={`${summary.mutationsSurvived}/${summary.mutationsFaced}`} />
          <StatBlock label="Time" value={`${seconds}s`} />
        </View>

        {summary.peakCombo && (
          <View style={styles.comboNote}>
            <Text style={styles.comboNoteText}>
              Peak combo: <Text style={styles.comboNoteAccent}>{summary.peakCombo}</Text>
            </Text>
          </View>
        )}

        {summary.isDailyTrial && (
          <View style={styles.dailyTrialCard}>
            <Text style={styles.dailyTrialLabel}>DAILY TRIAL COMPLETE</Text>
            <Text style={styles.dailyTrialBody}>
              Recorded for {formatDate(new Date())}. See you tomorrow.
            </Text>
          </View>
        )}

        {dimensionRows.length > 0 && (
          <View style={styles.dimSection}>
            <Text style={styles.sectionLabel}>WHAT YOU TRAINED</Text>
            <View style={styles.dimCard}>
              {dimensionRows.map((row) => (
                <View key={row.id} style={styles.dimRow}>
                  <View style={styles.dimLeft}>
                    <Text style={styles.dimLabel}>{row.label}</Text>
                    <Text style={styles.dimSub}>
                      {DIMENSIONS[row.id].lever} reached: {Math.round(row.theta)}
                    </Text>
                  </View>
                  <View style={styles.dimRight}>
                    <DimRightSlot pct={row.pct} hasNorm={row.hasNorm} />
                  </View>
                </View>
              ))}
            </View>
            <Text style={styles.normFootnote}>
              Percentiles compare against published research norms for your age band.
              Not a clinical assessment.
            </Text>
          </View>
        )}

        <View style={styles.ctaGroup}>
          <Pressable
            style={({ pressed }) => [styles.ctaPrimary, pressed && Pressed]}
            onPress={() => {
              resetRun();
              router.replace('/countdown');
            }}
            accessibilityRole="button"
            accessibilityLabel="Run again"
          >
            <Text style={styles.ctaPrimaryText}>Run Again</Text>
          </Pressable>
          <Pressable
            style={({ pressed }) => [styles.ctaSecondary, pressed && Pressed]}
            onPress={() => {
              resetRun();
              router.replace('/');
            }}
            accessibilityRole="button"
            accessibilityLabel="Return home"
          >
            <Text style={styles.ctaSecondaryText}>Home</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function DimRightSlot({ pct, hasNorm }: { pct?: number; hasNorm: boolean }) {
  if (pct !== undefined) {
    return (
      <>
        <Text style={styles.dimPct}>{pct}</Text>
        <Text style={styles.dimPctLabel}>PERCENTILE</Text>
      </>
    );
  }
  if (hasNorm) {
    return <Text style={styles.dimNoNorm}>set demographics for percentile</Text>;
  }
  return <Text style={styles.dimNoNorm}>tracked, no norm</Text>;
}

function StatBlock({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statBlock}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label.toUpperCase()}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.pagePadding,
    gap: 16,
  },
  loadingTitle: {
    fontSize: 22,
    fontFamily: 'serif',
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  scroll: {
    paddingHorizontal: Spacing.pagePadding,
    paddingTop: 32,
    paddingBottom: 48,
    gap: 24,
  },
  header: { alignItems: 'center', gap: 4 },
  sessionLabel: {
    fontSize: FontSize.label,
    fontWeight: '600',
    color: Colors.textTertiary,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },
  totalScore: {
    fontSize: 56,
    fontFamily: 'serif',
    fontWeight: '600',
    color: Colors.textPrimary,
    letterSpacing: -1,
    lineHeight: 60,
    marginTop: 4,
  },
  scoreLabel: {
    fontSize: FontSize.label,
    fontWeight: '600',
    color: Colors.textTertiary,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  waveCard: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.cardRadius,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingVertical: 24,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 4,
  },
  waveLabel: {
    fontSize: FontSize.label,
    fontWeight: '700',
    color: Colors.textTertiary,
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },
  waveIndex: {
    fontSize: FontSize.body,
    color: Colors.textSecondary,
    fontWeight: '500',
    marginTop: 6,
  },
  waveName: {
    fontSize: 36,
    fontFamily: 'serif',
    fontWeight: '600',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  waveTagline: {
    fontSize: FontSize.body,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  statBlock: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.surface,
    borderRadius: Spacing.cardRadius,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingVertical: 14,
  },
  statValue: {
    fontSize: 22,
    fontFamily: 'serif',
    fontWeight: '600',
    color: Colors.textPrimary,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textTertiary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  comboNote: {
    backgroundColor: Colors.accentSoft,
    borderRadius: Spacing.cardRadius,
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: 'center',
  },
  comboNoteText: {
    fontSize: FontSize.body,
    color: Colors.textSecondary,
  },
  comboNoteAccent: {
    color: Colors.accent,
    fontWeight: '700',
  },
  dailyTrialCard: {
    backgroundColor: Colors.warning + '14',
    borderRadius: Spacing.cardRadius,
    borderWidth: 1.5,
    borderColor: Colors.warning + '55',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 4,
  },
  dailyTrialLabel: {
    fontSize: FontSize.label,
    fontWeight: '700',
    color: Colors.warning,
    letterSpacing: 2,
  },
  dailyTrialBody: {
    fontSize: FontSize.body,
    color: Colors.textSecondary,
  },
  dimSection: { gap: 8 },
  sectionLabel: {
    fontSize: FontSize.label,
    fontWeight: '600',
    color: Colors.textTertiary,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  dimCard: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.cardRadius,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingVertical: 8,
  },
  dimRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  dimLeft: { flex: 1 },
  dimLabel: {
    fontSize: FontSize.body,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  dimSub: {
    fontSize: 11,
    color: Colors.textTertiary,
    marginTop: 2,
  },
  dimRight: {
    alignItems: 'flex-end',
    minWidth: 80,
  },
  dimPct: {
    fontSize: 22,
    fontFamily: 'serif',
    fontWeight: '600',
    color: Colors.accent,
  },
  dimPctLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: Colors.textTertiary,
    letterSpacing: 1.5,
  },
  dimNoNorm: {
    fontSize: 11,
    color: Colors.textTertiary,
    fontStyle: 'italic',
    textAlign: 'right',
  },
  normFootnote: {
    fontSize: 11,
    color: Colors.textTertiary,
    lineHeight: 16,
    paddingHorizontal: 4,
  },
  ctaGroup: { gap: 12 },
  ctaPrimary: {
    backgroundColor: Colors.accent,
    paddingVertical: 18,
    borderRadius: Spacing.cardRadius,
    alignItems: 'center',
  },
  ctaPrimaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  ctaSecondary: {
    paddingVertical: 14,
    borderRadius: Spacing.cardRadius,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  ctaSecondaryText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
});
