import React from 'react';
import { Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, FontSize, Spacing, Pressed } from '../constants/theme';
import { log } from '../lib/devLog';

export default function TermsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>LEGAL</Text>
        <Text style={styles.title}>Terms of Use</Text>
        <Text style={styles.updated}>Last updated: April 2026</Text>

        <Text style={styles.h2}>What Pulse is</Text>
        <Text style={styles.body}>
          Pulse is a cognitive training app that uses adaptive drills to challenge working
          memory, processing speed, cognitive flexibility, and impulse control. It is not
          a medical device, diagnostic tool, or substitute for professional advice.
        </Text>

        <Text style={styles.h2}>Acceptable use</Text>
        <Text style={styles.body}>
          Use the app for personal cognitive training. Do not attempt to reverse-engineer,
          modify, or redistribute the app outside the App Store.
        </Text>

        <Text style={styles.h2}>No medical claims</Text>
        <Text style={styles.body}>
          Pulse is intended for general fitness and entertainment. It is not designed to
          diagnose, treat, cure, or prevent any condition. If you have concerns about
          attention, memory, or cognitive function, consult a qualified clinician.
        </Text>

        <Text style={styles.h2}>Disclaimer</Text>
        <Text style={styles.body}>
          The app is provided "as is", without warranties of any kind. We do not guarantee
          improvements in real-world tasks, school or work performance, or any specific
          cognitive outcome.
        </Text>

        <Text style={styles.h2}>Limitation of liability</Text>
        <Text style={styles.body}>
          To the maximum extent permitted by law, Athlete OS shall not be liable for any
          indirect, incidental, or consequential damages arising from your use of Pulse.
        </Text>

        <Text style={styles.h2}>Changes</Text>
        <Text style={styles.body}>
          We may update these terms with future versions of the app. Material changes will
          be highlighted in release notes.
        </Text>

        <Text style={styles.h2}>Contact</Text>
        <Text style={styles.body}>
          Questions or requests can be sent to support@athleteos.app.
        </Text>

        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && Pressed]}
          onPress={() => {
            log.nav('terms → back');
            router.back();
          }}
          accessibilityRole="button"
          accessibilityLabel="Back"
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
    gap: 14,
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
  updated: {
    fontSize: FontSize.label,
    color: Colors.textTertiary,
    marginBottom: 8,
  },
  h2: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.textPrimary,
    marginTop: 6,
  },
  body: {
    fontSize: FontSize.body,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  backBtn: {
    paddingVertical: 14,
    borderRadius: Spacing.cardRadius,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
    marginTop: 12,
  },
  backBtnText: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
});
