import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useGameStore } from '../store/gameStore';
import { Colors, FontSize } from '../constants/theme';
import { loadPlayerProfile } from '../db/playerProfile';
import { loadEngineConfig } from '../db/engineConfig';
import { loadAppSettings } from '../db/appSettings';
import { loadCompanion } from '../db/companion';
import type { GameMode } from '../engine/gameStateMachine';
import { GameExplainer } from '../components/GameExplainer';

export default function CountdownScreen() {
  const router = useRouter();
  const startSession = useGameStore((s) => s.startSession);
  const [count, setCount] = useState(3);
  const [showExplainer, setShowExplainer] = useState(true);
  const [gameMode, setGameMode] = useState<GameMode>('arc');
  const sessionStarted = useRef(false);
  const scale = useSharedValue(0.5);
  const opacity = useSharedValue(0);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  // Load session data on mount, but wait for explainer dismissal to start countdown
  useEffect(() => {
    Promise.all([loadPlayerProfile(), loadEngineConfig(), loadAppSettings(), loadCompanion()])
      .then(([profile, config, appSettings, companion]) => {
        const mode = (companion?.companionId ?? 'arc') as GameMode;
        setGameMode(mode);
        // Stash session params for later — start session when explainer is dismissed
        sessionStarted.current = false;
        startSessionRef.current = () => {
          if (!sessionStarted.current) {
            sessionStarted.current = true;
            startSession(profile, config, appSettings.lives, mode);
          }
        };
      })
      .catch(() => {
        startSessionRef.current = () => {
          if (!sessionStarted.current) {
            sessionStarted.current = true;
            startSession(null);
          }
        };
      });
  }, []);

  const startSessionRef = useRef<() => void>(() => {});

  function handleDismissExplainer() {
    setShowExplainer(false);
    startSessionRef.current();
    animateTick(3);
  }

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

  if (showExplainer) {
    return <GameExplainer gameMode={gameMode} onDismiss={handleDismissExplainer} />;
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
