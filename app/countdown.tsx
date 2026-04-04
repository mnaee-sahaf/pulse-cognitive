import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
  runOnJS,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useGameStore } from '../store/gameStore';
import { Colors, FontSize } from '../constants/theme';
import { loadPlayerProfile } from '../db/playerProfile';
import { loadEngineConfig } from '../db/engineConfig';

export default function CountdownScreen() {
  const router = useRouter();
  const startSession = useGameStore((s) => s.startSession);
  const [count, setCount] = useState(3);
  const scale = useSharedValue(0.5);
  const opacity = useSharedValue(0);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  useEffect(() => {
    Promise.all([loadPlayerProfile(), loadEngineConfig()])
      .then(([profile, config]) => startSession(profile, config))
      .catch(() => startSession(null));
    animateTick(3);
  }, []);

  function animateTick(n: number) {
    setCount(n);
    scale.value = 0.5;
    opacity.value = 0;

    scale.value = withSequence(
      withSpring(1.1, { damping: 8, stiffness: 200 }),
      withTiming(1.0, { duration: 200 })
    );
    opacity.value = withTiming(1, { duration: 150 });

    if (n > 1) {
      setTimeout(() => animateTick(n - 1), 800);
    } else {
      setTimeout(() => {
        opacity.value = withTiming(0, { duration: 200 });
        setTimeout(() => {
          router.replace('/game');
        }, 220);
      }, 700);
    }
  }

  return (
    <View style={styles.overlay}>
      <Animated.Text style={[styles.countText, animStyle]}>
        {count}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    fontSize: 96,
    fontWeight: '600',
    fontFamily: 'serif',
    color: Colors.textPrimary,
    letterSpacing: -2,
  },
});
