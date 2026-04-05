import React, { useEffect, useMemo } from 'react';
import { View, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useAppSettings } from '../store/appSettingsStore';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { Colors } from '../constants/theme';

export type TileShape = 'circle' | 'triangle' | 'hexagon' | 'square';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);
const AnimatedView = Animated.createAnimatedComponent(View);

interface CellProps {
  index: number;
  size: number;
  isIlluminated: boolean;
  isPoison: boolean;
  tapState: 'idle' | 'correct' | 'wrong';
  onTap: (index: number, time: number) => void;
  disabled: boolean;
  themeColor: string;
  tileShape: TileShape;
  hideWhenIdle?: boolean;
}

export function Cell({
  index,
  size,
  isIlluminated,
  isPoison,
  tapState,
  onTap,
  disabled,
  themeColor,
  tileShape,
  hideWhenIdle = false,
}: CellProps) {
  const greenTileFeedback = useAppSettings((s) => s.greenTileFeedback);
  const hapticFeedback = useAppSettings((s) => s.hapticFeedback);

  const idleColor = useMemo(
    () => hideWhenIdle ? themeColor + '00' : themeColor + '30',
    [hideWhenIdle, themeColor]
  );
  const poisonColor = '#FFAAAA';

  const bgColor = useSharedValue(idleColor);
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const glowOpacity = useSharedValue(0);

  // Illumination
  useEffect(() => {
    if (isIlluminated) {
      bgColor.value = withTiming(themeColor, { duration: 130, easing: Easing.out(Easing.ease) });
      scale.value = withTiming(1.06, { duration: 130 });
      glowOpacity.value = withTiming(0.3, { duration: 130 });
    } else {
      bgColor.value = withTiming(isPoison ? poisonColor : idleColor, { duration: 180 });
      scale.value = withTiming(1.0, { duration: 150 });
      glowOpacity.value = withTiming(0, { duration: 180 });
    }
  }, [isIlluminated, isPoison, themeColor, idleColor]);

  // Tap feedback
  useEffect(() => {
    if (tapState === 'correct') {
      if (greenTileFeedback) {
        bgColor.value = withSequence(
          withTiming(Colors.success, { duration: 80 }),
          withTiming(idleColor, { duration: 280 })
        );
      }
      scale.value = withSequence(
        withSpring(1.13, { damping: 10, stiffness: 300 }),
        withSpring(1.0, { damping: 14, stiffness: 200 })
      );
    } else if (tapState === 'wrong') {
      bgColor.value = withSequence(
        withTiming(Colors.danger, { duration: 80 }),
        withTiming(idleColor, { duration: 320 })
      );
      translateX.value = withSequence(
        withTiming(-5, { duration: 45 }),
        withTiming(5, { duration: 45 }),
        withTiming(-5, { duration: 45 }),
        withTiming(5, { duration: 45 }),
        withTiming(0, { duration: 90 })
      );
    }
  }, [tapState, idleColor, greenTileFeedback]);

  // Shape-specific border radius
  const borderRadius = useMemo(() => {
    if (tileShape === 'circle') return size / 2;
    if (tileShape === 'hexagon') return size * 0.2;
    if (tileShape === 'square') return size * 0.12;
    return size * 0.08; // triangle-ish — slight rounding
  }, [tileShape, size]);

  const wrapperStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateX: translateX.value }],
    shadowOpacity: glowOpacity.value,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: glowOpacity.value > 0 ? 6 : 0,
  }));

  const tileStyle = useAnimatedStyle(() => ({
    backgroundColor: bgColor.value,
  }));

  const handlePress = () => {
    if (!disabled) {
      if (hapticFeedback) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onTap(index, performance.now());
    }
  };

  return (
    <AnimatedPressable
      style={[{ width: size, height: size, shadowColor: themeColor }, wrapperStyle]}
      onPress={handlePress}
      disabled={disabled}
    >
      <AnimatedView
        style={[
          {
            width: '100%',
            height: '100%',
            borderRadius,
            borderWidth: 1.5,
            borderColor: Colors.border,
          },
          tileStyle,
        ]}
      />
    </AnimatedPressable>
  );
}
