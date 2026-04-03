import React, { useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Modal,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useAudioPlayer } from 'expo-audio';
import {
  COMPANIONS,
  getCurrentStage,
  type CompanionState,
} from '../db/companion';
import { Colors, FontSize, Spacing } from '../constants/theme';

interface LevelUpModalProps {
  visible: boolean;
  companion: CompanionState;
  evolved: boolean;
  onDismiss: () => void;
}

const LEVEL_UP_SOUND = require('../assets/sounds/level-up.mp3');
const EVOLVE_SOUND = require('../assets/sounds/evolve.mp3');

export function LevelUpModal({ visible, companion, evolved, onDismiss }: LevelUpModalProps) {
  const definition = COMPANIONS[companion.companionId];
  const stage = getCurrentStage(definition, companion.level);

  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const badgeScale = useSharedValue(0);
  const shimmer = useSharedValue(0);

  const levelUpPlayer = useAudioPlayer(LEVEL_UP_SOUND);
  const evolvePlayer = useAudioPlayer(EVOLVE_SOUND);

  useEffect(() => {
    if (!visible) {
      scale.value = 0;
      opacity.value = 0;
      badgeScale.value = 0;
      shimmer.value = 0;
      return;
    }

    // Haptic feedback
    if (evolved) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }

    // Play sound
    try {
      if (evolved) {
        evolvePlayer.seekTo(0);
        evolvePlayer.play();
      } else {
        levelUpPlayer.seekTo(0);
        levelUpPlayer.play();
      }
    } catch (e) {
      // Fail silently if sound unavailable
    }

    // Entry animation
    opacity.value = withTiming(1, { duration: 200 });
    scale.value = withSequence(
      withSpring(1.08, { damping: 8, stiffness: 180 }),
      withSpring(1.0, { damping: 12, stiffness: 150 })
    );
    badgeScale.value = withDelay(
      300,
      withSequence(
        withSpring(1.15, { damping: 6, stiffness: 200 }),
        withSpring(1.0, { damping: 10, stiffness: 150 })
      )
    );
    shimmer.value = withDelay(
      200,
      withTiming(1, { duration: 600, easing: Easing.out(Easing.ease) })
    );
  }, [visible]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const badgeStyle = useAnimatedStyle(() => ({
    transform: [{ scale: badgeScale.value }],
    opacity: badgeScale.value,
  }));

  const shimmerStyle = useAnimatedStyle(() => ({
    opacity: shimmer.value * 0.15,
  }));

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onDismiss}
    >
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Animated.View style={[styles.card, containerStyle]}>
          {/* Background shimmer */}
          <Animated.View
            style={[
              styles.shimmer,
              { backgroundColor: stage.primaryColor },
              shimmerStyle,
            ]}
          />

          {/* Title */}
          <Text style={[styles.eventLabel, { color: stage.primaryColor }]}>
            {evolved ? 'EVOLVED!' : 'LEVEL UP!'}
          </Text>

          {/* Level badge */}
          <Animated.View style={[styles.levelBadge, { borderColor: stage.primaryColor }, badgeStyle]}>
            <Text style={styles.levelBadgePre}>LV</Text>
            <Text style={[styles.levelBadgeNum, { color: stage.primaryColor }]}>
              {companion.level}
            </Text>
          </Animated.View>

          {/* Companion name + stage */}
          <View style={styles.nameBlock}>
            <Text style={styles.companionName}>{definition.name}</Text>
            {evolved && (
              <Text style={[styles.stageName, { color: stage.primaryColor }]}>
                → {stage.label}
              </Text>
            )}
          </View>

          {/* Evolution flavor text */}
          {evolved ? (
            <Text style={styles.flavorText}>
              {definition.name} has evolved into {stage.label}!
            </Text>
          ) : (
            <Text style={styles.flavorText}>
              {definition.name} grows stronger.
            </Text>
          )}

          <Pressable
            style={[styles.dismissBtn, { backgroundColor: stage.primaryColor }]}
            onPress={onDismiss}
          >
            <Text style={styles.dismissText}>Continue</Text>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.pagePadding,
  },
  card: {
    width: '100%',
    backgroundColor: Colors.surface,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    gap: 16,
    overflow: 'hidden',
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  eventLabel: {
    fontSize: FontSize.label,
    fontWeight: '700',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
    borderWidth: 2,
    borderRadius: 20,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  levelBadgePre: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textTertiary,
    letterSpacing: 1,
  },
  levelBadgeNum: {
    fontSize: 48,
    fontWeight: '700',
    fontFamily: 'serif',
    letterSpacing: -1,
  },
  nameBlock: {
    alignItems: 'center',
    gap: 4,
  },
  companionName: {
    fontSize: 22,
    fontWeight: '600',
    fontFamily: 'serif',
    color: Colors.textPrimary,
  },
  stageName: {
    fontSize: FontSize.label,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  flavorText: {
    fontSize: FontSize.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  dismissBtn: {
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderRadius: Spacing.cardRadius,
    marginTop: 8,
  },
  dismissText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
});
