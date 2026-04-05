import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Colors, FontSize, Spacing } from '../constants/theme';
import type { GameMode } from '../engine/gameStateMachine';
import { COMPANIONS } from '../db/companion';

interface ExplainerContent {
  title: string;
  modeLabel: string;
  focus: string;
  color: string;
  steps: string[];
  tip: string;
}

const EXPLAINERS: Record<GameMode, ExplainerContent> = {
  arc: {
    title: 'Arc',
    modeLabel: 'MEMORY',
    focus: 'Working Memory',
    color: COMPANIONS.arc.stages[0].primaryColor,
    steps: [
      'Watch the sequence of cells light up',
      'Recall and tap them in the same order',
      'Sequences grow longer as you improve',
    ],
    tip: 'Mutations like Mirror or Reverse may twist the recall order — stay sharp.',
  },
  tide: {
    title: 'Tide',
    modeLabel: 'REVERSE',
    focus: 'Cognitive Flexibility',
    color: COMPANIONS.tide.stages[0].primaryColor,
    steps: [
      'Watch the sequence of cells light up',
      'Recall and tap them in reverse order',
      'Your brain must flip the sequence each round',
    ],
    tip: 'Mirror mutations stack with the reverse — you may need to mentally flip twice.',
  },
  ember: {
    title: 'Ember',
    modeLabel: 'INTERCEPT',
    focus: 'Reaction Speed',
    color: COMPANIONS.ember.stages[0].primaryColor,
    steps: [
      'Cells light up one at a time',
      'Tap each cell while it is lit or just after',
      'Miss too many and you lose a life',
    ],
    tip: 'Watch for poison cells — tapping one costs a life instantly.',
  },
  halt: {
    title: 'Halt',
    modeLabel: 'HALT',
    focus: 'Impulse Control',
    color: COMPANIONS.halt.stages[0].primaryColor,
    steps: [
      'Cells light up rapidly — tap Go cells (green)',
      'Do NOT tap No-Go cells (red border)',
      'Stop-Signal trials change mid-flash — cancel your tap',
    ],
    tip: 'Speed matters, but false alarms cost lives. Control your impulses.',
  },
};

interface GameExplainerProps {
  gameMode: GameMode;
  onDismiss: () => void;
}

export function GameExplainer({ gameMode, onDismiss }: GameExplainerProps) {
  const info = EXPLAINERS[gameMode];

  return (
    <Pressable style={styles.backdrop} onPress={onDismiss}>
      <View style={styles.card}>
        {/* Mode badge */}
        <View style={[styles.badge, { backgroundColor: info.color + '18', borderColor: info.color + '40' }]}>
          <Text style={[styles.badgeText, { color: info.color }]}>{info.modeLabel}</Text>
        </View>

        <Text style={styles.title}>{info.title}</Text>
        <Text style={styles.focus}>{info.focus}</Text>

        {/* Steps */}
        <View style={styles.stepsContainer}>
          {info.steps.map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={[styles.stepDot, { backgroundColor: info.color }]}>
                <Text style={styles.stepNum}>{i + 1}</Text>
              </View>
              <Text style={styles.stepText}>{step}</Text>
            </View>
          ))}
        </View>

        {/* Tip */}
        <View style={styles.tipContainer}>
          <Text style={styles.tipText}>{info.tip}</Text>
        </View>

        {/* Dismiss hint */}
        <Text style={styles.dismiss}>Tap anywhere to start</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.pagePadding,
    zIndex: 10,
  },
  card: {
    width: '100%',
    maxWidth: Spacing.maxWidth - Spacing.pagePadding * 2,
    alignItems: 'center',
    gap: 12,
  },
  badge: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2.5,
  },
  title: {
    fontSize: 32,
    fontWeight: '600',
    fontFamily: 'serif',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  focus: {
    fontSize: FontSize.body,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  stepsContainer: {
    width: '100%',
    gap: 14,
    marginVertical: 8,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNum: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stepText: {
    fontSize: FontSize.body,
    color: Colors.textPrimary,
    flex: 1,
    lineHeight: 20,
  },
  tipContainer: {
    width: '100%',
    backgroundColor: Colors.border + '80',
    borderRadius: 10,
    padding: 14,
    marginTop: 4,
  },
  tipText: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    fontStyle: 'italic',
  },
  dismiss: {
    fontSize: FontSize.label,
    color: Colors.textTertiary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 20,
    fontWeight: '500',
  },
});
