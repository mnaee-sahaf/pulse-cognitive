import React, { useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { COMPANIONS, saveCompanionChoice, type CompanionId } from '../db/companion';
import { Companion } from '../components/Companion';
import { Colors, FontSize, Spacing } from '../constants/theme';

export default function ChooseCompanionScreen() {
  const router = useRouter();
  const [selected, setSelected] = useState<CompanionId | null>(null);
  const [confirming, setConfirming] = useState(false);

  const companions = Object.values(COMPANIONS);

  const handleConfirm = async () => {
    if (!selected || confirming) return;
    setConfirming(true);
    await saveCompanionChoice(selected);
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Choose Your Companion</Text>
          <Text style={styles.subtitle}>
            Your companion grows with you — evolving as your cognitive ceiling rises.
          </Text>
        </View>

        <View style={styles.cards}>
          {companions.map((c) => {
            const isSelected = selected === c.id;
            const starterStage = c.stages[0];
            return (
              <Pressable
                key={c.id}
                style={[styles.card, isSelected && styles.cardSelected]}
                onPress={() => setSelected(c.id)}
              >
                <Companion
                  state={{
                    companionId: c.id,
                    level: 5,
                    xp: 0,
                    xpToNext: 100,
                  }}
                  size={64}
                  showInfo={false}
                />
                <View style={styles.cardText}>
                  <Text style={styles.cardName}>{c.name}</Text>
                  <Text style={styles.cardDesc}>{c.description}</Text>
                  <View style={styles.stagesRow}>
                    {c.stages.map((s) => (
                      <View
                        key={s.label}
                        style={[styles.stageDot, { backgroundColor: s.primaryColor }]}
                      />
                    ))}
                    <Text style={styles.stagesLabel}>4 evolutions</Text>
                  </View>
                </View>
                {isSelected && (
                  <View style={[styles.checkmark, { backgroundColor: starterStage.primaryColor }]}>
                    <Text style={styles.checkmarkText}>✓</Text>
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        <Pressable
          style={({ pressed }) => [
            styles.cta,
            !selected && styles.ctaDisabled,
            pressed && selected && styles.ctaPressed,
          ]}
          onPress={handleConfirm}
          disabled={!selected || confirming}
        >
          <Text style={styles.ctaText}>
            {confirming ? 'Starting…' : selected ? `Choose ${COMPANIONS[selected].name}` : 'Select a companion'}
          </Text>
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
    gap: 32,
  },
  header: { gap: 8 },
  title: {
    fontSize: FontSize.display,
    fontWeight: '600',
    fontFamily: 'serif',
    color: Colors.textPrimary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: FontSize.body,
    color: Colors.textSecondary,
    lineHeight: 22,
  },
  cards: { gap: 12 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    backgroundColor: Colors.surface,
    borderRadius: Spacing.cardRadius,
    borderWidth: 1.5,
    borderColor: Colors.border,
    padding: 16,
  },
  cardSelected: {
    borderColor: Colors.accent,
    backgroundColor: Colors.accentSoft,
  },
  cardText: { flex: 1, gap: 4 },
  cardName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontFamily: 'serif',
  },
  cardDesc: {
    fontSize: FontSize.label,
    color: Colors.textSecondary,
    lineHeight: 18,
  },
  stagesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  stageDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stagesLabel: {
    fontSize: FontSize.label - 1,
    color: Colors.textTertiary,
    marginLeft: 2,
  },
  checkmark: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  cta: {
    backgroundColor: Colors.accent,
    paddingVertical: 18,
    borderRadius: Spacing.cardRadius,
    alignItems: 'center',
  },
  ctaDisabled: {
    backgroundColor: Colors.border,
  },
  ctaPressed: { opacity: 0.85 },
  ctaText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
