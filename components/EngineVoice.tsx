import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Colors, FontSize, Spacing } from '../constants/theme';

interface EngineVoiceProps {
  /**
   * The line to surface. When this changes to a non-empty string the
   * overlay animates in, holds for `holdMs`, then animates out and calls
   * `onDismiss`. Set to null/empty between messages.
   */
  message: string | null;
  /** Called when the exit animation completes. Reset parent state here. */
  onDismiss: () => void;
  /** Hold time at full opacity (ms). Defaults to 1500. */
  holdMs?: number;
}

/**
 * Mid-session overlay that surfaces the engine's "voice" — a one-line
 * narrative pulled from the last engine decision. Replaces v1's silent
 * adaptation. Triggered on round transitions; the message is computed
 * upstream from `engineInsight.describeEngineDecision` (or any wave/
 * combo banner we choose).
 *
 * Pinned to the top center of the screen above the HUD. Doesn't block
 * taps — purely informational. Self-dismissing after `holdMs`.
 */
export function EngineVoice({ message, onDismiss, holdMs = 1500 }: EngineVoiceProps) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(-12);

  useEffect(() => {
    if (!message) return;

    // Fade + slide in
    opacity.value = withSequence(
      withTiming(1, { duration: 220, easing: Easing.out(Easing.cubic) }),
      withDelay(holdMs, withTiming(0, { duration: 260, easing: Easing.in(Easing.cubic) }, (finished) => {
        if (finished) runOnJS(onDismiss)();
      }))
    );
    translateY.value = withSequence(
      withTiming(0, { duration: 240, easing: Easing.out(Easing.cubic) }),
      withDelay(holdMs, withTiming(-8, { duration: 240, easing: Easing.in(Easing.cubic) }))
    );
  }, [message]);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!message) return null;

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.container, style]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
      accessibilityLabel={message}
    >
      <Animated.Text style={styles.text}>{message}</Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 8,
    left: Spacing.pagePadding,
    right: Spacing.pagePadding,
    backgroundColor: Colors.surface,
    borderRadius: Spacing.cardRadius,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: 16,
    paddingVertical: 10,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  text: {
    fontSize: FontSize.body,
    fontWeight: '500',
    color: Colors.textPrimary,
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 20,
  },
});
