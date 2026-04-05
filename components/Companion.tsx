import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import {
  COMPANIONS,
  getCurrentStage,
  getNextEvolution,
  xpForLevel,
  type CompanionState,
} from '../db/companion';
import { Colors, FontSize } from '../constants/theme';

interface CompanionProps {
  state: CompanionState;
  size?: number;
  showInfo?: boolean;
  celebrating?: boolean; // triggers level-up animation
}

export function Companion({ state, size = 72, showInfo = true, celebrating = false }: CompanionProps) {
  const companion = COMPANIONS[state.companionId];
  const stage = getCurrentStage(companion, state.level);
  const nextEvo = getNextEvolution(companion, state.level);

  const floatY = useSharedValue(0);
  const scale = useSharedValue(1);
  const rotate = useSharedValue(0);

  // Idle float animation
  useEffect(() => {
    floatY.value = withRepeat(
      withSequence(
        withTiming(-6, { duration: 1800, easing: Easing.inOut(Easing.sin) }),
        withTiming(0, { duration: 1800, easing: Easing.inOut(Easing.sin) })
      ),
      -1,
      false
    );
  }, []);

  // Celebration animation on level-up
  useEffect(() => {
    if (!celebrating) return;
    scale.value = withSequence(
      withSpring(1.4, { damping: 6, stiffness: 200 }),
      withSpring(1.0, { damping: 10, stiffness: 150 })
    );
    rotate.value = withSequence(
      withTiming(-15, { duration: 120 }),
      withTiming(15, { duration: 120 }),
      withTiming(-10, { duration: 100 }),
      withTiming(10, { duration: 100 }),
      withTiming(0, { duration: 150 })
    );
  }, [celebrating]);

  const shapeStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: floatY.value },
      { scale: scale.value },
      { rotate: `${rotate.value}deg` },
    ],
  }));

  const xpPercent = Math.min(1, state.xp / state.xpToNext);

  return (
    <View style={styles.container}>
      <Animated.View style={shapeStyle}>
        <CompanionShape
          shape={stage.shape}
          size={size}
          primaryColor={stage.primaryColor}
          secondaryColor={stage.secondaryColor}
        />
      </Animated.View>

      {showInfo && (
        <View style={styles.info}>
          <View style={styles.nameRow}>
            <Text style={styles.name}>{companion.name}</Text>
            <Text style={[styles.stageName, { color: stage.primaryColor }]}>
              {stage.label}
            </Text>
          </View>
          <View style={styles.levelRow}>
            <Text style={styles.levelLabel}>LV</Text>
            <Text style={[styles.level, { color: stage.primaryColor }]}>{state.level}</Text>
            {nextEvo && (
              <Text style={styles.evoHint}>→ {nextEvo.label} at {nextEvo.level}</Text>
            )}
            {!nextEvo && state.level === 100 && (
              <Text style={[styles.evoHint, { color: stage.primaryColor }]}>MAX</Text>
            )}
          </View>
          <View style={styles.xpBarTrack}>
            <View
              style={[
                styles.xpBarFill,
                { width: `${xpPercent * 100}%`, backgroundColor: stage.primaryColor },
              ]}
            />
          </View>
          <Text style={styles.xpText}>{state.xp} / {state.xpToNext} XP</Text>
        </View>
      )}
    </View>
  );
}

function CompanionShape({
  shape,
  size,
  primaryColor,
  secondaryColor,
}: {
  shape: 'circle' | 'triangle' | 'square' | 'diamond' | 'hexagon';
  size: number;
  primaryColor: string;
  secondaryColor: string;
}) {
  if (shape === 'circle') {
    return (
      <View
        style={[
          styles.circle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            backgroundColor: primaryColor,
            shadowColor: primaryColor,
          },
        ]}
      >
        <View
          style={[
            styles.circleInner,
            {
              width: size * 0.45,
              height: size * 0.45,
              borderRadius: size * 0.225,
              backgroundColor: secondaryColor,
            },
          ]}
        />
      </View>
    );
  }

  if (shape === 'square') {
    const s = size * 0.78;
    const innerS = s * 0.4;
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <View
          style={{
            width: s,
            height: s,
            borderRadius: s * 0.15,
            backgroundColor: primaryColor,
            shadowColor: primaryColor,
            shadowOpacity: 0.35,
            shadowRadius: 8,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View
            style={{
              width: innerS,
              height: innerS,
              borderRadius: innerS * 0.15,
              backgroundColor: secondaryColor,
            }}
          />
        </View>
      </View>
    );
  }

  if (shape === 'triangle') {
    // Equilateral triangle via borders
    const w = size * 0.9;
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <View
          style={{
            width: 0,
            height: 0,
            borderLeftWidth: w / 2,
            borderRightWidth: w / 2,
            borderBottomWidth: w * 0.866,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderBottomColor: primaryColor,
          }}
        />
        {/* Inner triangle (inverted, smaller) */}
        <View
          style={{
            position: 'absolute',
            width: 0,
            height: 0,
            borderLeftWidth: w * 0.22,
            borderRightWidth: w * 0.22,
            borderTopWidth: w * 0.22 * 0.866,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderTopColor: secondaryColor,
            bottom: size * 0.18,
          }}
        />
      </View>
    );
  }

  // Hexagon (pointy-top) built from two border-triangles + a rectangle
  if (shape === 'hexagon') {
    const w = size * 0.866; // flat-side width = side * sqrt(3), side = size/2
    const capH = size * 0.25; // top/bottom triangle cap height
    const midH = size * 0.5;  // middle rectangle height
    const innerW = w * 0.38;
    const innerCapH = capH * 0.38;
    const innerMidH = midH * 0.38;
    return (
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ alignItems: 'center' }}>
          <View style={{ width: 0, height: 0, borderLeftWidth: w / 2, borderRightWidth: w / 2, borderBottomWidth: capH, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: primaryColor }} />
          <View style={{ width: w, height: midH, backgroundColor: primaryColor }} />
          <View style={{ width: 0, height: 0, borderLeftWidth: w / 2, borderRightWidth: w / 2, borderTopWidth: capH, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: primaryColor }} />
        </View>
        {/* Inner accent hexagon */}
        <View style={{ position: 'absolute', alignItems: 'center' }}>
          <View style={{ width: 0, height: 0, borderLeftWidth: innerW / 2, borderRightWidth: innerW / 2, borderBottomWidth: innerCapH, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderBottomColor: secondaryColor }} />
          <View style={{ width: innerW, height: innerMidH, backgroundColor: secondaryColor }} />
          <View style={{ width: 0, height: 0, borderLeftWidth: innerW / 2, borderRightWidth: innerW / 2, borderTopWidth: innerCapH, borderLeftColor: 'transparent', borderRightColor: 'transparent', borderTopColor: secondaryColor }} />
        </View>
      </View>
    );
  }

  // Diamond
  const d = size * 0.72;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: d,
          height: d,
          backgroundColor: primaryColor,
          transform: [{ rotate: '45deg' }],
          shadowColor: primaryColor,
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 4,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <View
          style={{
            width: d * 0.38,
            height: d * 0.38,
            backgroundColor: secondaryColor,
            transform: [{ rotate: '0deg' }],
          }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 12,
  },
  circle: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  circleInner: {
    opacity: 0.9,
  },
  info: {
    alignItems: 'center',
    gap: 4,
    width: 180,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textPrimary,
    fontFamily: 'serif',
  },
  stageName: {
    fontSize: FontSize.label,
    fontWeight: '600',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  levelLabel: {
    fontSize: FontSize.label,
    fontWeight: '500',
    color: Colors.textTertiary,
    letterSpacing: 1,
  },
  level: {
    fontSize: 22,
    fontWeight: '600',
    fontFamily: 'serif',
  },
  evoHint: {
    fontSize: FontSize.label,
    color: Colors.textTertiary,
    letterSpacing: 0.5,
    marginLeft: 4,
  },
  xpBarTrack: {
    width: '100%',
    height: 3,
    backgroundColor: Colors.border,
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 4,
  },
  xpBarFill: {
    height: '100%',
    borderRadius: 2,
  },
  xpText: {
    fontSize: FontSize.label - 1,
    color: Colors.textTertiary,
    letterSpacing: 0.5,
  },
});
