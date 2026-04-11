import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  Share,
  Alert,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import { Colors, FontSize, Spacing } from '../constants/theme';
import { ENGINE_CONFIG_DEFAULTS, type EngineConfig } from '../engine/engineConfig';
import { loadEngineConfig, saveEngineConfig } from '../db/engineConfig';
import { loadAppSettings, saveAppSettings } from '../db/appSettings';
import { resetAllData, backupDatabase, restoreDatabase, hasBackup } from '../db/database';
import { useAppSettings } from '../store/appSettingsStore';
import { DevLogViewer } from '../components/DevLogViewer';

// ------- Draft state — all values stored as strings while editing -------
type DraftConfig = { [K in keyof EngineConfig]: string };

function toDraft(c: EngineConfig): DraftConfig {
  return Object.fromEntries(
    Object.entries(c).map(([k, v]) => [k, String(v)])
  ) as DraftConfig;
}

function fromDraft(d: DraftConfig): EngineConfig | null {
  const result: Partial<EngineConfig> = {};
  for (const key of Object.keys(ENGINE_CONFIG_DEFAULTS) as (keyof EngineConfig)[]) {
    const val = parseFloat(d[key]);
    if (isNaN(val)) return null;
    (result as any)[key] = val;
  }
  return result as EngineConfig;
}

// ------- Section / field metadata -------
interface FieldMeta {
  key: keyof EngineConfig;
  label: string;
  hint: string;
  unit?: string;
}
interface Section {
  title: string;
  fields: FieldMeta[];
}

const SECTIONS: Section[] = [
  {
    title: 'Warm-Up Phase',
    fields: [
      { key: 'warmupRounds',    label: 'Warm-up Rounds',      hint: 'Rounds before adaptive engine reads accuracy', unit: 'rounds' },
      { key: 'warmupTempoRamp', label: 'Warm-up Tempo Ramp',  hint: 'ms delta per warm-up round (negative = faster)', unit: 'ms/round' },
    ],
  },
  {
    title: 'Flash Timing',
    fields: [
      { key: 'initialFlashDuration', label: 'Initial Flash',  hint: 'Starting ms per cell illuminate', unit: 'ms' },
      { key: 'flashFloor',           label: 'Flash Floor',    hint: 'Fastest the game can get', unit: 'ms' },
      { key: 'flashCeiling',         label: 'Flash Ceiling',  hint: 'Slowest (cap when easing back)', unit: 'ms' },
    ],
  },
  {
    title: 'Decision Thresholds',
    fields: [
      { key: 'overwhelmThreshold', label: 'Overwhelm Threshold', hint: 'Accuracy below this → ease back (0–1)', unit: '' },
      { key: 'zpdUpper',           label: 'ZPD Upper Bound',     hint: 'Accuracy above this → push harder (0–1)', unit: '' },
      { key: 'rtFastThreshold',    label: 'RT Fast Threshold',   hint: 'RT below this = player is fast', unit: 'ms' },
      { key: 'rtSlowThreshold',    label: 'RT Slow Threshold',   hint: 'RT above this = player is slow', unit: 'ms' },
    ],
  },
  {
    title: 'Branch: Accelerate All',
    fields: [
      { key: 'accelTempoRamp', label: 'Accel Tempo Ramp', hint: 'ms delta when pushing hard (negative = faster)', unit: 'ms/round' },
      { key: 'accelGrowth',    label: 'Accel Growth',     hint: 'Sequence cells added per round (0–3)', unit: 'cells' },
    ],
  },
  {
    title: 'Branch: Push Tempo',
    fields: [
      { key: 'pushTempoRamp', label: 'Push Tempo Ramp', hint: 'ms delta for tempo-only push', unit: 'ms/round' },
    ],
  },
  {
    title: 'Branch: Ease Back',
    fields: [
      { key: 'easeTempoRamp', label: 'Ease Tempo Ramp', hint: 'ms delta when overwhelmed (positive = slower)', unit: 'ms/round' },
    ],
  },
  {
    title: 'Cold Start (No History)',
    fields: [
      { key: 'defaultTempoRamp', label: 'Default Tempo Ramp', hint: 'Starting ramp for brand-new players', unit: 'ms/round' },
    ],
  },
  {
    title: 'Grid Expansion',
    fields: [
      { key: 'gridExpand3to4Round',  label: '3→4 Earliest Round', hint: 'Round before which grid never expands 3x3→4x4', unit: '' },
      { key: 'gridExpand4to5Round',  label: '4→5 Earliest Round', hint: 'Round before which grid never expands 4x4→5x5', unit: '' },
      { key: 'gridExpandAccuracy',   label: 'Expand Accuracy',    hint: 'Min accuracy each of last 3 rounds to trigger expand (0–1)', unit: '' },
    ],
  },
];

export default function SettingsScreen() {
  const router = useRouter();
  const [draft, setDraft] = useState<DraftConfig>(toDraft(ENGINE_CONFIG_DEFAULTS));
  const [saved, setSaved] = useState(false);
  const animatedBackground = useAppSettings((s) => s.animatedBackground);
  const backgroundIntensity = useAppSettings((s) => s.backgroundIntensity);
  const greenTileFeedback = useAppSettings((s) => s.greenTileFeedback);
  const hapticFeedback = useAppSettings((s) => s.hapticFeedback);

  const setAnimatedBackground = useAppSettings((s) => s.setAnimatedBackground);
  const setBackgroundIntensity = useAppSettings((s) => s.setBackgroundIntensity);
  const setGreenTileFeedback = useAppSettings((s) => s.setGreenTileFeedback);
  const setHapticFeedback = useAppSettings((s) => s.setHapticFeedback);

  const [intensityDraft, setIntensityDraft] = useState(String(backgroundIntensity));
  const [backupExists, setBackupExists] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadEngineConfig().then((cfg) => setDraft(toDraft(cfg))).catch(console.error);
      if (__DEV__) hasBackup().then(setBackupExists).catch(console.error);
      loadAppSettings().then((s) => {
        setAnimatedBackground(s.animatedBackground);
        setBackgroundIntensity(s.backgroundIntensity);
        setIntensityDraft(String(s.backgroundIntensity));
        setGreenTileFeedback(s.greenTileFeedback);
        setHapticFeedback(s.hapticFeedback);
      }).catch(console.error);
    }, [])
  );

  function currentAppSettings() {
    return { animatedBackground, backgroundIntensity, lives: 3, greenTileFeedback, hapticFeedback };
  }

  async function toggleAnimatedBackground(v: boolean) {
    setAnimatedBackground(v);
    await saveAppSettings({ ...currentAppSettings(), animatedBackground: v }).catch(console.error);
  }

  async function commitIntensity(raw: string) {
    const val = parseFloat(raw);
    if (isNaN(val) || val <= 0) return;
    const clamped = Math.min(5, Math.max(0.25, val));
    setBackgroundIntensity(clamped);
    setIntensityDraft(String(clamped));
    await saveAppSettings({ ...currentAppSettings(), backgroundIntensity: clamped }).catch(console.error);
  }

  async function toggleGreenTileFeedback(v: boolean) {
    setGreenTileFeedback(v);
    await saveAppSettings({ ...currentAppSettings(), greenTileFeedback: v }).catch(console.error);
  }

  async function toggleHapticFeedback(v: boolean) {
    setHapticFeedback(v);
    await saveAppSettings({ ...currentAppSettings(), hapticFeedback: v }).catch(console.error);
  }

  function updateField(key: keyof EngineConfig, value: string) {
    setDraft((d) => ({ ...d, [key]: value }));
    setSaved(false);
  }

  async function handleSave() {
    const config = fromDraft(draft);
    if (!config) {
      Alert.alert('Invalid values', 'All fields must be valid numbers.');
      return;
    }
    await saveEngineConfig(config);
    setSaved(true);
  }

  function handleReset() {
    Alert.alert('Reset to Defaults?', 'This will overwrite your current preset.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: () => {
          setDraft(toDraft(ENGINE_CONFIG_DEFAULTS));
          setSaved(false);
        },
      },
    ]);
  }

  function handleBackup() {
    Alert.alert(
      'Backup Current Session',
      'Saves a snapshot of your current data. Any previous backup will be overwritten.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Backup',
          onPress: async () => {
            await backupDatabase();
            setBackupExists(true);
            Alert.alert('Backup saved', 'You can restore it at any time from this screen.');
          },
        },
      ]
    );
  }

  function handleRestore() {
    Alert.alert(
      'Restore Backup',
      'This will replace your current data with the backup. Any progress since the backup will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Restore',
          style: 'destructive',
          onPress: async () => {
            await restoreDatabase();
            // Reload store from the restored DB so in-memory state matches
            const s = await loadAppSettings();
            setAnimatedBackground(s.animatedBackground);
            setBackgroundIntensity(s.backgroundIntensity);
            setGreenTileFeedback(s.greenTileFeedback);
            setHapticFeedback(s.hapticFeedback);
            router.replace('/');
          },
        },
      ]
    );
  }

  function handleResetFreshUser() {
    Alert.alert(
      'Reset to Fresh User',
      'This will delete ALL data — sessions, companion progress, profile, and settings. The onboarding flow will restart.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset Everything',
          style: 'destructive',
          onPress: async () => {
            await resetAllData();
            setAnimatedBackground(false);
            setBackgroundIntensity(1.0);
            setGreenTileFeedback(true);
            setHapticFeedback(true);
            router.replace('/choose-companion');
          },
        },
      ]
    );
  }

  async function handleShare() {
    const config = fromDraft(draft) ?? ENGINE_CONFIG_DEFAULTS;
    const json = JSON.stringify(config, null, 2);
    await Share.share({ message: `Pulse Engine Config:\n\`\`\`json\n${json}\n\`\`\`` });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backText}>← Back</Text>
            </Pressable>
            <Text style={styles.title}>Engine Settings</Text>
            <Text style={styles.subtitle}>
              Changes apply on the next session start. Save your preset, then share the JSON to log it back.
            </Text>
          </View>

          {/* Visual */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Visual</Text>
            <View style={styles.card}>
              <View style={[styles.fieldRow, styles.fieldDivider]}>
                <View style={styles.fieldLeft}>
                  <Text style={styles.fieldLabel}>Animated Background</Text>
                  <Text style={styles.fieldHint}>
                    Pastel blobs drifting behind game grid, home + results
                  </Text>
                </View>
                <Switch
                  value={animatedBackground}
                  onValueChange={toggleAnimatedBackground}
                  trackColor={{ false: Colors.border, true: Colors.accent + '88' }}
                  thumbColor={animatedBackground ? Colors.accent : Colors.textTertiary}
                />
              </View>
              <View style={styles.fieldRow}>
                <View style={styles.fieldLeft}>
                  <Text style={styles.fieldLabel}>Animation Speed</Text>
                  <Text style={styles.fieldHint}>
                    Speed multiplier — 1 = slow drift, 2 = 2× faster, 3 = chaotic. Range 0.25–5.
                  </Text>
                </View>
                <View style={styles.fieldRight}>
                  <TextInput
                    style={styles.input}
                    value={intensityDraft}
                    onChangeText={setIntensityDraft}
                    onBlur={() => commitIntensity(intensityDraft)}
                    onSubmitEditing={() => commitIntensity(intensityDraft)}
                    keyboardType="numeric"
                    selectTextOnFocus
                    returnKeyType="done"
                  />
                </View>
              </View>
            </View>
          </View>

          {/* Gameplay Feel */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Gameplay Feel</Text>
            <View style={styles.card}>
              <View style={[styles.fieldRow, styles.fieldDivider]}>
                <View style={styles.fieldLeft}>
                  <Text style={styles.fieldLabel}>Green Tile Feedback</Text>
                  <Text style={styles.fieldHint}>Flash tile green on correct tap</Text>
                </View>
                <Switch
                  value={greenTileFeedback}
                  onValueChange={toggleGreenTileFeedback}
                  trackColor={{ false: Colors.border, true: Colors.accent + '88' }}
                  thumbColor={greenTileFeedback ? Colors.accent : Colors.textTertiary}
                />
              </View>
              <View style={styles.fieldRow}>
                <View style={styles.fieldLeft}>
                  <Text style={styles.fieldLabel}>Haptic Feedback</Text>
                  <Text style={styles.fieldHint}>Vibration on tap, round complete, and life lost</Text>
                </View>
                <Switch
                  value={hapticFeedback}
                  onValueChange={toggleHapticFeedback}
                  trackColor={{ false: Colors.border, true: Colors.accent + '88' }}
                  thumbColor={hapticFeedback ? Colors.accent : Colors.textTertiary}
                />
              </View>
            </View>
          </View>

          {/* Engine Sections */}
          {SECTIONS.map((section) => (
            <View key={section.title} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title.toUpperCase()}</Text>
              <View style={styles.card}>
                {section.fields.map((field, i) => (
                  <View
                    key={field.key}
                    style={[
                      styles.fieldRow,
                      i < section.fields.length - 1 && styles.fieldDivider,
                    ]}
                  >
                    <View style={styles.fieldLeft}>
                      <Text style={styles.fieldLabel}>{field.label}</Text>
                      <Text style={styles.fieldHint}>{field.hint}</Text>
                    </View>
                    <View style={styles.fieldRight}>
                      <TextInput
                        style={styles.input}
                        value={draft[field.key]}
                        onChangeText={(v) => updateField(field.key, v)}
                        keyboardType="numeric"
                        selectTextOnFocus
                        returnKeyType="done"
                      />
                      {field.unit ? (
                        <Text style={styles.unit}>{field.unit}</Text>
                      ) : null}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ))}

          {/* Actions */}
          <View style={styles.actions}>
            <Pressable
              style={({ pressed }) => [styles.btnPrimary, pressed && styles.pressed]}
              onPress={handleSave}
            >
              <Text style={styles.btnPrimaryText}>
                {saved ? 'Saved ✓' : 'Save Preset'}
              </Text>
            </Pressable>

            <View style={styles.rowBtns}>
              <Pressable
                style={({ pressed }) => [styles.btnSecondary, { flex: 1 }, pressed && styles.pressed]}
                onPress={handleShare}
              >
                <Text style={styles.btnSecondaryText}>Share JSON</Text>
              </Pressable>
              <Pressable
                style={({ pressed }) => [styles.btnSecondary, { flex: 1 }, pressed && styles.pressed]}
                onPress={handleReset}
              >
                <Text style={[styles.btnSecondaryText, { color: Colors.warning }]}>
                  Reset Defaults
                </Text>
              </Pressable>
            </View>
          </View>

          {/* Dev Tools — only visible in __DEV__ builds */}
          {__DEV__ && (
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: Colors.warning }]}>
                ⚠ DEV TOOLS
              </Text>
              <View style={styles.card}>
                <Pressable
                  style={({ pressed }) => [styles.fieldRow, styles.fieldDivider, pressed && styles.pressed]}
                  onPress={handleBackup}
                >
                  <View style={styles.fieldLeft}>
                    <Text style={styles.fieldLabel}>Backup Current Session</Text>
                    <Text style={styles.fieldHint}>
                      Snapshot all data so you can restore it after testing.
                      {backupExists ? ' — backup exists ✓' : ' — no backup yet'}
                    </Text>
                  </View>
                </Pressable>

                {backupExists && (
                  <Pressable
                    style={({ pressed }) => [styles.fieldRow, styles.fieldDivider, pressed && styles.pressed]}
                    onPress={handleRestore}
                  >
                    <View style={styles.fieldLeft}>
                      <Text style={[styles.fieldLabel, { color: Colors.accent }]}>
                        Restore Backup
                      </Text>
                      <Text style={styles.fieldHint}>
                        Replace current data with your saved snapshot and return home.
                      </Text>
                    </View>
                  </Pressable>
                )}

                <Pressable
                  style={({ pressed }) => [styles.fieldRow, pressed && styles.pressed]}
                  onPress={handleResetFreshUser}
                >
                  <View style={styles.fieldLeft}>
                    <Text style={[styles.fieldLabel, { color: Colors.danger }]}>
                      Reset to Fresh User
                    </Text>
                    <Text style={styles.fieldHint}>
                      Wipes all data and restarts onboarding. Use to test the full new-user flow.
                    </Text>
                  </View>
                </Pressable>
              </View>

              {/* Dev Log Viewer */}
              <DevLogViewer maxHeight={500} />
            </View>
          )}

          {/* JSON preview */}
          <View style={styles.jsonBlock}>
            <Text style={styles.sectionTitle}>CURRENT PRESET JSON</Text>
            <Text selectable style={styles.jsonText}>
              {JSON.stringify(fromDraft(draft) ?? draft, null, 2)}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: {
    paddingHorizontal: Spacing.pagePadding,
    paddingTop: 24,
    paddingBottom: 60,
    gap: 24,
  },
  header: { gap: 8 },
  backBtn: { marginBottom: 4 },
  backText: {
    fontSize: FontSize.body,
    color: Colors.accent,
    fontWeight: '500',
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    fontFamily: 'serif',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: FontSize.body,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  section: { gap: 8 },
  sectionTitle: {
    fontSize: FontSize.label,
    fontWeight: '600',
    color: Colors.textTertiary,
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Spacing.cardRadius,
    borderWidth: 1.5,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  fieldDivider: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  fieldLeft: { flex: 1, gap: 2 },
  fieldLabel: {
    fontSize: FontSize.body,
    fontWeight: '500',
    color: Colors.textPrimary,
  },
  fieldHint: {
    fontSize: 11,
    color: Colors.textTertiary,
    lineHeight: 15,
  },
  fieldRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  input: {
    backgroundColor: Colors.background,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: FontSize.body,
    fontWeight: '600',
    color: Colors.textPrimary,
    minWidth: 64,
    textAlign: 'right',
  },
  unit: {
    fontSize: 11,
    color: Colors.textTertiary,
    width: 48,
  },
  actions: { gap: 12 },
  btnPrimary: {
    backgroundColor: Colors.accent,
    paddingVertical: 16,
    borderRadius: Spacing.cardRadius,
    alignItems: 'center',
  },
  btnPrimaryText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  rowBtns: { flexDirection: 'row', gap: 12 },
  btnSecondary: {
    backgroundColor: Colors.surface,
    paddingVertical: 14,
    borderRadius: Spacing.cardRadius,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  btnSecondaryText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  pressed: { opacity: 0.75 },
  jsonBlock: {
    gap: 8,
    backgroundColor: Colors.surface,
    borderRadius: Spacing.cardRadius,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: 16,
  },
  jsonText: {
    fontSize: 11,
    fontFamily: 'monospace',
    color: Colors.textSecondary,
    lineHeight: 18,
  },
});
