import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Colors, FontSize, Spacing } from '../constants/theme';
import { COMPANIONS, type CompanionId } from '../db/companion';

interface ModeDetail {
  title: string;
  modeLabel: string;
  dimension: string;
  color: string;
  tagline: string;
  whatItIs: string;
  howItWorks: string[];
  whyItMatters: string;
  science: {
    construct: string;
    researchers: string;
    insight: string;
  };
  realWorld: string[];
}

const MODE_DETAILS: Record<CompanionId, ModeDetail> = {
  arc: {
    title: 'Arc',
    modeLabel: 'MEMORY',
    dimension: 'Working Memory',
    color: COMPANIONS.arc.stages[0].primaryColor,
    tagline: 'Train the mental workspace that powers everything else.',
    whatItIs:
      'Working memory is your brain\'s scratchpad — the limited-capacity system that holds and manipulates information in real time. Every complex thought, calculation, and decision runs through it.',
    howItWorks: [
      'Watch a sequence of cells illuminate on the grid',
      'Recall and tap them back in the exact same order',
      'Sequences grow longer as your capacity expands',
      'Mutations (Mirror, Reverse) add mental transformation demands',
    ],
    whyItMatters:
      'Working memory capacity is the single strongest predictor of fluid intelligence. It underpins reading comprehension, mental arithmetic, reasoning, and the ability to follow complex instructions. Training it expands the bandwidth of your conscious thought.',
    science: {
      construct: 'Spatial N-Back / Working Memory Capacity',
      researchers: 'Kirchner (1958), Jaeggi et al. (2008), Baddeley (2000)',
      insight:
        'The watch-and-recall mechanic is a spatial N-back task. Each added element increases the memory load. Jaeggi et al. showed that adaptive N-back training can transfer to improvements in fluid intelligence — the ability to solve novel problems.',
    },
    realWorld: [
      'Following multi-step instructions without re-reading',
      'Mental math and holding intermediate results',
      'Tracking multiple threads in a conversation',
      'Programming — holding function context while writing code',
    ],
  },
  tide: {
    title: 'Tide',
    modeLabel: 'REVERSE',
    dimension: 'Cognitive Flexibility',
    color: COMPANIONS.tide.stages[0].primaryColor,
    tagline: 'Build the mental agility to switch gears without losing speed.',
    whatItIs:
      'Cognitive flexibility is your ability to shift between different rules, perspectives, or strategies. It\'s the executive function that lets you adapt when the situation changes — without freezing or falling back to old habits.',
    howItWorks: [
      'Watch a sequence of cells illuminate on the grid',
      'Recall and tap them in reverse order — your brain must flip the sequence',
      'Mutations layer additional transformations (Mirror + Reverse = double flip)',
      'The adaptive engine increases mutation frequency as your flexibility grows',
    ],
    whyItMatters:
      'Cognitive flexibility is what separates rigid thinkers from adaptive ones. It\'s the ability to update your mental model when new information arrives, switch between tasks without cognitive whiplash, and resist the pull of habitual responses when they\'re no longer appropriate.',
    science: {
      construct: 'Executive Function / Set-Shifting',
      researchers: 'Monsell (2003), Wisconsin Card Sorting Test, Miyake et al. (2000)',
      insight:
        'The mutation system operationalizes the task-switching paradigm. The "switch cost" — increased RT and errors after a rule change — reflects the cognitive overhead of reconfiguring task sets. Training reduces this cost, making your brain faster at adapting to changed rules.',
    },
    realWorld: [
      'Adapting your communication style between audiences',
      'Debugging — switching between hypotheses quickly',
      'Multitasking without context-switch penalties',
      'Creative problem-solving — seeing alternatives to your first instinct',
    ],
  },
  ember: {
    title: 'Ember',
    modeLabel: 'INTERCEPT',
    dimension: 'Reaction Speed',
    color: COMPANIONS.ember.stages[0].primaryColor,
    tagline: 'Sharpen the raw speed of perception and response.',
    whatItIs:
      'Reaction speed is the time between perceiving a stimulus and executing a response. It reflects the efficiency of your entire perceptual-motor pipeline — from visual processing through decision-making to motor execution.',
    howItWorks: [
      'Cells illuminate one at a time on the grid',
      'Tap each cell while it\'s lit or within a brief grace window',
      'Miss too many and you lose a life — speed matters',
      'Poison cells appear that must be avoided, training inhibitory control',
    ],
    whyItMatters:
      'Reaction speed isn\'t just about reflexes — it\'s a measure of neural processing efficiency. Faster RT correlates with better cognitive performance across domains. As tempo increases, you\'re training the speed-accuracy tradeoff: learning to make correct decisions faster under time pressure.',
    science: {
      construct: 'Simple and Choice Reaction Time',
      researchers: 'Donders (1868), Hick (1952), Ratcliff (1978)',
      insight:
        'As sequences grow, the task shifts from simple RT to choice RT, which Hick\'s Law predicts increases logarithmically with the number of alternatives. The adaptive engine compresses timing to push you toward your speed ceiling while maintaining accuracy — training the drift-diffusion model of decision-making.',
    },
    realWorld: [
      'Driving — faster hazard perception and response',
      'Sports — reduced reaction time to game events',
      'Decision-making under time pressure',
      'Gaming — competitive advantage through faster inputs',
    ],
  },
  halt: {
    title: 'Halt',
    modeLabel: 'HALT',
    dimension: 'Impulse Control',
    color: COMPANIONS.halt.stages[0].primaryColor,
    tagline: 'Master the ability to stop when everything says go.',
    whatItIs:
      'Impulse control is the ability to suppress a prepotent response — to override automatic behavior when the situation demands it. It\'s the executive brake that prevents you from acting on every impulse.',
    howItWorks: [
      'Cells light up rapidly on the grid in quick succession',
      'Tap Go cells (majority) as fast as you can',
      'Withhold your tap on No-Go cells (marked with a visual cue)',
      'Stop-Signal trials start as Go then switch — cancel your response mid-action',
    ],
    whyItMatters:
      'Impulse control underpins self-regulation in every domain — from resisting distractions to managing emotional reactions. The ability to cancel a planned action is one of the most fundamental cognitive control operations, and it\'s measurably trainable.',
    science: {
      construct: 'Go/No-Go + Stop-Signal Paradigm',
      researchers: 'Logan & Cowan (1984), Raud et al. (2020), Allom et al. (2015)',
      insight:
        'The Stop-Signal Reaction Time (SSRT) is the gold-standard measure of inhibitory control. The staircase procedure converges on your true stopping speed. Raud et al. showed Go/No-Go and Stop-Signal engage different mechanisms — action restraint vs. action cancellation — and this mode trains both.',
    },
    realWorld: [
      'Resisting impulsive decisions under pressure',
      'Managing emotional reactions in conflict',
      'Dietary self-control and habit breaking',
      'Focus — suppressing distracting impulses while working',
    ],
  },
};

interface ModeDetailCardProps {
  visible: boolean;
  companionId: CompanionId;
  onDismiss: () => void;
}

export function ModeDetailCard({ companionId, onDismiss }: ModeDetailCardProps) {
  const detail = MODE_DETAILS[companionId];

  return (
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scroll}
          >
            {/* Header */}
            <View style={[styles.badge, { backgroundColor: detail.color + '18', borderColor: detail.color + '40' }]}>
              <Text style={[styles.badgeText, { color: detail.color }]}>{detail.modeLabel}</Text>
            </View>
            <Text style={styles.title}>{detail.dimension}</Text>
            <Text style={[styles.tagline, { color: detail.color }]}>{detail.tagline}</Text>

            {/* What it is */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>WHAT IT IS</Text>
              <Text style={styles.body}>{detail.whatItIs}</Text>
            </View>

            {/* How it works */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>HOW {detail.title.toUpperCase()} MODE WORKS</Text>
              {detail.howItWorks.map((step, i) => (
                <View key={i} style={styles.stepRow}>
                  <View style={[styles.stepDot, { backgroundColor: detail.color }]}>
                    <Text style={styles.stepNum}>{i + 1}</Text>
                  </View>
                  <Text style={styles.stepText}>{step}</Text>
                </View>
              ))}
            </View>

            {/* Why it matters */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>WHY IT MATTERS</Text>
              <Text style={styles.body}>{detail.whyItMatters}</Text>
            </View>

            {/* Science */}
            <View style={[styles.section, styles.scienceCard]}>
              <Text style={styles.sectionTitle}>THE SCIENCE</Text>
              <View style={styles.scienceRow}>
                <Text style={styles.scienceLabel}>Construct</Text>
                <Text style={styles.scienceValue}>{detail.science.construct}</Text>
              </View>
              <View style={styles.scienceRow}>
                <Text style={styles.scienceLabel}>Key Research</Text>
                <Text style={styles.scienceValue}>{detail.science.researchers}</Text>
              </View>
              <Text style={styles.scienceInsight}>{detail.science.insight}</Text>
            </View>

            {/* Real world */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>REAL-WORLD APPLICATIONS</Text>
              {detail.realWorld.map((item, i) => (
                <View key={i} style={styles.realWorldRow}>
                  <View style={[styles.rwDot, { backgroundColor: detail.color + '60' }]} />
                  <Text style={styles.rwText}>{item}</Text>
                </View>
              ))}
            </View>
          </ScrollView>

          {/* Dismiss */}
          <Pressable
            style={({ pressed }) => [styles.dismissBtn, pressed && { opacity: 0.85 }]}
            onPress={onDismiss}
          >
            <Text style={styles.dismissBtnText}>Close</Text>
          </Pressable>
        </View>
      </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '88%',
    paddingBottom: 40,
  },
  scroll: {
    padding: 24,
    paddingTop: 20,
    gap: 20,
    alignItems: 'center',
  },
  badge: {
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2.5,
  },
  title: {
    fontSize: 26,
    fontWeight: '600',
    fontFamily: 'serif',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  tagline: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  section: {
    width: '100%',
    gap: 10,
  },
  sectionTitle: {
    fontSize: FontSize.label,
    fontWeight: '600',
    color: Colors.textTertiary,
    letterSpacing: 1.5,
  },
  body: {
    fontSize: FontSize.body,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  stepDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  stepNum: {
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  stepText: {
    fontSize: FontSize.body,
    color: Colors.textPrimary,
    flex: 1,
    lineHeight: 20,
  },
  scienceCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: 16,
  },
  scienceRow: {
    gap: 2,
  },
  scienceLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.textTertiary,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  scienceValue: {
    fontSize: 13,
    color: Colors.textPrimary,
    fontWeight: '500',
    lineHeight: 18,
  },
  scienceInsight: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 19,
    fontStyle: 'italic',
    marginTop: 4,
  },
  realWorldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  rwDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  rwText: {
    fontSize: FontSize.body,
    color: Colors.textPrimary,
    flex: 1,
    lineHeight: 20,
  },
  dismissBtn: {
    marginHorizontal: 24,
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: Spacing.cardRadius,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  dismissBtnText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
});
