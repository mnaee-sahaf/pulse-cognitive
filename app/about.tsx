import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { Colors, FontSize, Spacing, Pressed } from '../constants/theme';
import { log } from '../lib/devLog';

export default function AboutScreen() {
  const router = useRouter();
  const version = Constants.expoConfig?.version ?? '1.0.0';
  const buildNumber =
    Constants.expoConfig?.ios?.buildNumber ??
    Constants.expoConfig?.android?.versionCode?.toString() ??
    '';

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>ABOUT</Text>
        <Text style={styles.title}>Pulse</Text>
        <Text style={styles.tagline}>Adaptive cognitive training</Text>

        <View style={styles.card}>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Version</Text>
            <Text style={styles.rowValue}>
              {version}
              {buildNumber ? ` (${buildNumber})` : ''}
            </Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Maker</Text>
            <Text style={styles.rowValue}>Athlete OS</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Support</Text>
            <Text style={styles.rowValue}>support@athleteos.app</Text>
          </View>
        </View>

        <Text style={styles.h2}>Built on</Text>
        <Text style={styles.body}>
          Pulse uses cognitive science research on working memory, response inhibition,
          set-shifting, and the speed–accuracy tradeoff. Drills are tuned to keep you in
          the 80–90% accuracy zone — challenging enough to push, easy enough to stay
          engaged.
        </Text>

        <Text style={styles.h2}>Legal</Text>
        <Pressable
          style={({ pressed }) => [styles.linkRow, pressed && Pressed]}
          onPress={() => {
            log.nav('about → privacy');
            router.push('/privacy');
          }}
          accessibilityRole="button"
          accessibilityLabel="Open privacy policy"
        >
          <Text style={styles.linkText}>Privacy Policy</Text>
          <Text style={styles.linkChevron}>›</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.linkRow, pressed && Pressed]}
          onPress={() => {
            log.nav('about → terms');
            router.push('/terms');
          }}
          accessibilityRole="button"
          accessibilityLabel="Open terms of use"
        >
          <Text style={styles.linkText}>Terms of Use</Text>
          <Text style={styles.linkChevron}>›</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && Pressed]}
          onPress={() => {
            log.nav('about → back');
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
  tagline: {
    fontSize: FontSize.body,
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.cardRadius,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: 16,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLabel: {
    fontSize: FontSize.body,
    color: Colors.textSecondary,
  },
  rowValue: {
    fontSize: FontSize.body,
    color: Colors.textPrimary,
    fontWeight: '500',
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
  linkRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Spacing.cardRadius,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  linkText: {
    fontSize: FontSize.body,
    color: Colors.textPrimary,
    fontWeight: '500',
  },
  linkChevron: {
    fontSize: 22,
    color: Colors.textTertiary,
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
