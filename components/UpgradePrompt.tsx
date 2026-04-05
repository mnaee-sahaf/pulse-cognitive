import React, { useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet } from 'react-native';
import { Colors, FontSize, Spacing } from '../constants/theme';
import { COMPANIONS, type CompanionId } from '../db/companion';
import { ModeDetailCard } from './ModeDetailCard';
import { log } from '../lib/devLog';

interface UpgradePromptProps {
  visible: boolean;
  freeCompanionId: CompanionId;
  onPurchase: () => void;
  onDismiss: () => void;
}

const DIMENSION_MAP: Record<CompanionId, string> = {
  arc: 'Working Memory',
  tide: 'Cognitive Flexibility',
  ember: 'Reaction Speed',
  halt: 'Impulse Control',
};

export function UpgradePrompt({ visible, freeCompanionId, onPurchase, onDismiss }: UpgradePromptProps) {
  const companionIds: CompanionId[] = ['arc', 'tide', 'ember', 'halt'];
  const [detailMode, setDetailMode] = useState<CompanionId | null>(null);

  return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        {/* Detail card takes over the modal when a locked mode is tapped */}
        {detailMode ? (
          <ModeDetailCard
            visible={true}
            companionId={detailMode}
            onDismiss={() => {
              log.info('ModeDetailCard dismissed', { mode: detailMode });
              setDetailMode(null);
            }}
          />
        ) : (
        <View style={styles.backdrop}>
          <View style={styles.card}>
            <Text style={styles.title}>Unlock Full Training</Text>
            <Text style={styles.subtitle}>
              Your brain has 4 dimensions.{'\n'}You're only training 1.
            </Text>

            {/* Companion grid — locked ones are tappable */}
            <View style={styles.companionRow}>
              {companionIds.map((id) => {
                const c = COMPANIONS[id];
                const isFree = id === freeCompanionId;
                const color = c.stages[0].primaryColor;
                return (
                  <Pressable
                    key={id}
                    style={styles.companionSlot}
                    onPress={() => {
                      if (!isFree) {
                        log.info('locked companion icon tapped', { mode: id });
                        setDetailMode(id);
                      }
                    }}
                    disabled={isFree}
                  >
                    <View style={[
                      styles.companionIcon,
                      { borderColor: isFree ? color : Colors.border },
                      !isFree && styles.companionLocked,
                    ]}>
                      <Text style={[
                        styles.companionEmoji,
                        !isFree && { opacity: 0.3 },
                      ]}>
                        {isFree ? '\u2713' : '\uD83D\uDD12'}
                      </Text>
                    </View>
                    <Text style={[
                      styles.companionName,
                      { color: isFree ? color : Colors.textTertiary },
                    ]}>
                      {c.name}
                    </Text>
                    <Text style={styles.companionDim}>
                      {DIMENSION_MAP[id]}
                    </Text>
                    {!isFree && (
                      <Text style={styles.tapHint}>Tap to learn more</Text>
                    )}
                  </Pressable>
                );
              })}
            </View>

            {/* Dimensions list — locked ones are tappable */}
            <View style={styles.dimList}>
              {companionIds.map((id) => {
                const isFree = id === freeCompanionId;
                return (
                  <Pressable
                    key={id}
                    style={styles.dimRow}
                    onPress={() => {
                      if (!isFree) {
                        log.info('locked dimension row tapped', { mode: id });
                        setDetailMode(id);
                      }
                    }}
                    disabled={isFree}
                  >
                    <View style={[styles.dimDot, { backgroundColor: isFree ? COMPANIONS[id].stages[0].primaryColor : Colors.border }]} />
                    <Text style={[styles.dimText, !isFree && styles.dimLocked]}>
                      {DIMENSION_MAP[id]}
                    </Text>
                    {!isFree && <Text style={styles.lockLabel}>LOCKED</Text>}
                  </Pressable>
                );
              })}
              <View style={styles.dimRow}>
                <View style={[styles.dimDot, { backgroundColor: Colors.success }]} />
                <Text style={styles.dimText}>Decision Speed</Text>
                <Text style={styles.freeLabel}>FREE</Text>
              </View>
            </View>

            {/* Price */}
            <Text style={styles.price}>$7.99 one-time · No subscription</Text>

            {/* CTAs */}
            <Pressable
              style={({ pressed }) => [styles.purchaseBtn, pressed && { opacity: 0.85 }]}
              onPress={onPurchase}
            >
              <Text style={styles.purchaseBtnText}>Unlock Everything</Text>
            </Pressable>

            <Pressable onPress={onDismiss} hitSlop={12}>
              <Text style={styles.dismissText}>Maybe later</Text>
            </Pressable>
          </View>
        </View>
        )}
      </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.pagePadding,
  },
  card: {
    width: '100%',
    maxWidth: Spacing.maxWidth - Spacing.pagePadding * 2,
    backgroundColor: Colors.background,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    gap: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: '600',
    fontFamily: 'serif',
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: FontSize.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  companionRow: {
    flexDirection: 'row',
    gap: 20,
    marginVertical: 4,
  },
  companionSlot: {
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  companionIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.surface,
  },
  companionLocked: {
    backgroundColor: Colors.border + '40',
  },
  companionEmoji: {
    fontSize: 18,
  },
  companionName: {
    fontSize: 13,
    fontWeight: '600',
  },
  companionDim: {
    fontSize: 9,
    color: Colors.textTertiary,
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  tapHint: {
    fontSize: 8,
    color: Colors.accent,
    letterSpacing: 0.3,
    marginTop: 2,
  },
  dimList: {
    width: '100%',
    gap: 8,
    paddingVertical: 4,
  },
  dimRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dimDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dimText: {
    fontSize: FontSize.body,
    color: Colors.textPrimary,
    flex: 1,
  },
  dimLocked: {
    color: Colors.textTertiary,
  },
  lockLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: Colors.textTertiary,
    letterSpacing: 1,
  },
  freeLabel: {
    fontSize: 9,
    fontWeight: '600',
    color: Colors.success,
    letterSpacing: 1,
  },
  price: {
    fontSize: 13,
    color: Colors.textSecondary,
    letterSpacing: 0.3,
  },
  purchaseBtn: {
    width: '100%',
    backgroundColor: Colors.accent,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  purchaseBtnText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  dismissText: {
    fontSize: 14,
    color: Colors.textTertiary,
    paddingVertical: 4,
  },
});
