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
import { useGameStoreV2, type GameMode } from '../store/gameStoreV2';
import { Colors, FontSize } from '../constants/theme';
import { loadAppSettings } from '../db/appSettings';
import { loadCompanion } from '../db/companion';
import { GameExplainer } from '../components/GameExplainer';

export default function CountdownScreen() {
  const router = useRouter();
  const startRun = useGameStoreV2((s) => s.startRun);
  const [count, setCount] = useState(3);
  const [showExplainer, setShowExplainer] = useState(true);
  const [dataLoaded, setDataLoaded] = useState(false);
  const [gameMode, setGameMode] = useState<GameMode>('arc');
  const sessionStarted = useRef(false);
  const pendingDismissRef = useRef(false);
  const scale = useSharedValue(0.5);
  const opacity = useSharedValue(0);
  const startRunRef = useRef<() => void>(() => {});

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  function beginCountdown() {
    setShowExplainer(false);
    startRunRef.current();
    animateTick(3);
  }

  useEffect(() => {
    Promise.all([loadAppSettings(), loadCompanion()])
      .then(([_appSettings, companion]) => {
        const mode = (companion?.companionId ?? 'arc') as GameMode;
        setGameMode(mode);
        sessionStarted.current = false;
        startRunRef.current = () => {
          if (!sessionStarted.current) {
            sessionStarted.current = true;
            // v2: simple call. Daily trial flag will be set by the home
            // screen's daily-trial entry in a later iteration; default false.
            startRun(mode, false);
          }
        };
        setDataLoaded(true);
      })
      .catch(() => {
        startRunRef.current = () => {
          if (!sessionStarted.current) {
            sessionStarted.current = true;
            startRun('arc', false);
          }
        };
        setDataLoaded(true);
      });
  }, []);

  // If user dismissed the explainer before data loaded, start now
  useEffect(() => {
    if (dataLoaded && pendingDismissRef.current) {
      pendingDismissRef.current = false;
      beginCountdown();
    }
  }, [dataLoaded]);

  function handleDismissExplainer() {
    if (!dataLoaded) {
      pendingDismissRef.current = true;
      return;
    }
    beginCountdown();
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
