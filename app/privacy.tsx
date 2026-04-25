import React from 'react';
import { Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, FontSize, Spacing, Pressed } from '../constants/theme';
import { log } from '../lib/devLog';

export default function PrivacyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>LEGAL</Text>
        <Text style={styles.title}>Privacy Policy</Text>
        <Text style={styles.updated}>Last updated: April 2026</Text>

        <Text style={styles.h2}>What we collect</Text>
        <Text style={styles.body}>
          Pulse stores your training sessions, scores, reaction times, and adaptive engine
          state on your device only. We do not collect personally identifiable information
          (no name, email, phone number, or precise location).
        </Text>

        <Text style={styles.h2}>Where it lives</Text>
        <Text style={styles.body}>
          All training data is stored locally in an on-device SQLite database. It never
          leaves your phone unless you explicitly export or share a session snapshot.
        </Text>

        <Text style={styles.h2}>What we do not do</Text>
        <Text style={styles.body}>
          We do not sell or share your data. We do not run third-party advertising SDKs.
          We do not track you across other apps or websites.
        </Text>

        <Text style={styles.h2}>Crash and diagnostic data</Text>
        <Text style={styles.body}>
          Apple may automatically share anonymous crash logs and aggregated usage with us
          if you have opted in via iOS Settings → Privacy &amp; Security → Analytics. You
          can disable this at any time.
        </Text>

        <Text style={styles.h2}>Your choices</Text>
        <Text style={styles.body}>
          You can delete all your data at any time by uninstalling the app. There is no
          server-side copy to remove.
        </Text>

        <Text style={styles.h2}>Children</Text>
        <Text style={styles.body}>
          Pulse is rated for ages 4+. We do not knowingly collect data from children. The
          app does not include chat, social features, or external links to third parties.
        </Text>

        <Text style={styles.h2}>Contact</Text>
        <Text style={styles.body}>
          Questions or requests can be sent to support@athleteos.app.
        </Text>

        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && Pressed]}
          onPress={() => {
            log.nav('privacy → back');
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
