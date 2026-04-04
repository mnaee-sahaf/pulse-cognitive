import React, { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withSpring,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Colors, Spacing } from '../constants/theme';

interface CellProps {
  index: number;
  size: number; // pixel size of the cell
  isIlluminated: boolean;
  isPoison: boolean;
  tapState: 'idle' | 'correct' | 'wrong';
  onTap: (index: number, time: number) => void;
  disabled: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function Cell({
  index,
  size,
  isIlluminated,
  isPoison,
  tapState,
  onTap,
  disabled,
}: CellProps) {
  const bgColor = useSharedValue<string>(Colors.surface);
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const elevation = useSharedValue(0);

  // Illumination effect
  useEffect(() => {
    if (isIlluminated) {
      bgColor.value = withTiming(Colors.accent, { duration: 150, easing: Easing.out(Easing.ease) });
      scale.value = withTiming(1.03, { duration: 150 });
      elevation.value = withTiming(6, { duration: 150 });
    } else {
      bgColor.value = withTiming(isPoison ? '#FFE5E5' : Colors.surface, { duration: 150 });
      scale.value = withTiming(1.0, { duration: 150 });
      elevation.value = withTiming(0, { duration: 150 });
    }
  }, [isIlluminated, isPoison]);

  // Tap feedback effects
  useEffect(() => {
    if (tapState === 'correct') {
      bgColor.value = withSequence(
        withTiming(Colors.success, { duration: 80 }),
        withTiming(Colors.surface, { duration: 270 })
      );
      scale.value = withSequence(
        withSpring(1.1, { damping: 10, stiffness: 300 }),
        withSpring(1.0, { damping: 15, stiffness: 200 })
      );
    } else if (tapState === 'wrong') {
      bgColor.value = withSequence(
        withTiming(Colors.danger, { duration: 80 }),
        withTiming(Colors.surface, { duration: 320 })
      );
      // Shake: oscillate ±4px
      translateX.value = withSequence(
        withTiming(-4, { duration: 50 }),
        withTiming(4, { duration: 50 }),
        withTiming(-4, { duration: 50 }),
        withTiming(4, { duration: 50 }),
        withTiming(0, { duration: 100 })
      );
    }
  }, [tapState]);

  const animStyle = useAnimatedStyle(() => ({
    backgroundColor: bgColor.value,
    transform: [{ scale: scale.value }, { translateX: translateX.value }],
    shadowOpacity: elevation.value > 0 ? 0.18 : 0,
    shadowRadius: elevation.value,
    elevation: elevation.value,
  }));

  return (
    <AnimatedPressable
      style={[styles.cell, { width: size, height: size }, animStyle]}
      onPress={() => {
        if (!disabled) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onTap(index, performance.now());
        }
      }}
      disabled={disabled}
    />
  );
}

const styles = StyleSheet.create({
  cell: {
    borderRadius: Spacing.cellRadius,
    borderWidth: 1.5,
    borderColor: Colors.border,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 2 },
  },
});
