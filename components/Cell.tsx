import React, { useEffect, useMemo } from 'react';
import { Pressable } from 'react-native';
import Svg, { Polygon, Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useAppSettings } from '../store/appSettingsStore';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withTiming,
  withSequence,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { Colors } from '../constants/theme';

export type TileShape = 'circle' | 'triangle' | 'hexagon';

const AnimatedPolygon = Animated.createAnimatedComponent(Polygon);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Pointy-top hexagon vertices, inset within size×size viewBox
function hexPoints(size: number, inset = 0.86): string {
  const cx = size / 2;
  const cy = size / 2;
  const R = (size / 2) * inset;
  return Array.from({ length: 6 }, (_, i) => {
    const angle = -Math.PI / 2 + (Math.PI / 3) * i;
    return `${cx + R * Math.cos(angle)},${cy + R * Math.sin(angle)}`;
  }).join(' ');
}

// TODO: Ember tile shape needs to be reconsidered alongside Ember game mechanics
// refactor — triangle may not be the right choice once intercept flow is finalised.
// Equilateral triangle pointing up, centered in size×size viewBox
function triPoints(size: number, inset = 0.86): string {
  const margin = (size * (1 - inset)) / 2;
  const s = size - 2 * margin;
  const h = s * (Math.sqrt(3) / 2);
  const cx = size / 2;
  const topY = (size - h) / 2;
  const botY = topY + h;
  return `${cx},${topY} ${size - margin},${botY} ${margin},${botY}`;
}

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

  const shapePoints = useMemo(() => {
    if (tileShape === 'hexagon') return hexPoints(size);
    if (tileShape === 'triangle') return triPoints(size);
    return '';
  }, [tileShape, size]);

  const idleColor = useMemo(
    () => hideWhenIdle ? themeColor + '00' : themeColor + '30',
    [hideWhenIdle, themeColor]
  );
  const poisonColor = '#FFAAAA';

  const fillColor = useSharedValue(idleColor);
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const glowOpacity = useSharedValue(0);

  // Illumination
  useEffect(() => {
    if (isIlluminated) {
      fillColor.value = withTiming(themeColor, { duration: 130, easing: Easing.out(Easing.ease) });
      scale.value = withTiming(1.06, { duration: 130 });
      glowOpacity.value = withTiming(0.3, { duration: 130 });
    } else {
      fillColor.value = withTiming(isPoison ? poisonColor : idleColor, { duration: 180 });
      scale.value = withTiming(1.0, { duration: 150 });
      glowOpacity.value = withTiming(0, { duration: 180 });
    }
  }, [isIlluminated, isPoison, themeColor, idleColor]);

  // Tap feedback
  useEffect(() => {
    if (tapState === 'correct') {
      if (greenTileFeedback) {
        fillColor.value = withSequence(
          withTiming(Colors.success, { duration: 80 }),
          withTiming(idleColor, { duration: 280 })
        );
      }
      scale.value = withSequence(
        withSpring(1.13, { damping: 10, stiffness: 300 }),
        withSpring(1.0, { damping: 14, stiffness: 200 })
      );
    } else if (tapState === 'wrong') {
      fillColor.value = withSequence(
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

  // Wrapper handles scale, shake, and glow shadow
  const wrapperStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { translateX: translateX.value }],
    shadowOpacity: glowOpacity.value,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: glowOpacity.value > 0 ? 6 : 0,
  }));

  // SVG fill via animatedProps (the only clean way to drive SVG color)
  const shapeFill = useAnimatedProps(() => ({
    fill: fillColor.value,
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
      {/* pointerEvents="none" prevents the SVG subtree from consuming touches
          so they always reach the AnimatedPressable wrapper */}
      <Svg width={size} height={size} pointerEvents="none">
        {tileShape === 'circle' && (
          <AnimatedCircle
            cx={size / 2}
            cy={size / 2}
            r={(size / 2) * 0.86}
            animatedProps={shapeFill}
          />
        )}
        {(tileShape === 'hexagon' || tileShape === 'triangle') && (
          <AnimatedPolygon
            points={shapePoints}
            animatedProps={shapeFill}
          />
        )}
      </Svg>
    </AnimatedPressable>
  );
}
