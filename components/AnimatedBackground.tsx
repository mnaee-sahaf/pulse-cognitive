import React, { useEffect } from 'react';
import { useWindowDimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
} from 'react-native-reanimated';

interface BlobConfig {
  color: string;
  size: number;
  x0: number;
  y0: number;
  dx: number;  // x drift distance
  dy: number;  // y drift distance (different from dx so blobs move diagonally)
  duration: number;
  delay: number;
  opacity: number;
}

function makeBlobs(w: number, h: number): BlobConfig[] {
  return [
    {
      color: '#C4B5FD', // lavender
      size: 320,
      x0: -80, y0: -100,
      dx: 80, dy: 100,
      duration: 20000, delay: 0, opacity: 0.28,
    },
    {
      color: '#FED7AA', // peach
      size: 280,
      x0: w - 200, y0: h - 240,
      dx: -90, dy: -80,
      duration: 24000, delay: 3200, opacity: 0.30,
    },
    {
      color: '#A7F3D0', // mint
      size: 240,
      x0: w * 0.3, y0: h * 0.35,
      dx: 70, dy: -70,
      duration: 18000, delay: 6500, opacity: 0.24,
    },
    {
      color: '#BAE6FD', // sky
      size: 300,
      x0: -60, y0: h - 180,
      dx: 100, dy: -90,
      duration: 22000, delay: 1800, opacity: 0.26,
    },
    {
      color: '#FECDD3', // rose
      size: 260,
      x0: w - 180, y0: -80,
      dx: -80, dy: 90,
      duration: 26000, delay: 9000, opacity: 0.28,
    },
  ];
}

function Blob({ config }: { config: BlobConfig }) {
  const x = useSharedValue(config.x0);
  const y = useSharedValue(config.y0);

  const ease = Easing.bezier(0.45, 0, 0.55, 1);

  useEffect(() => {
    x.value = withDelay(
      config.delay,
      withRepeat(
        withSequence(
          withTiming(config.x0 + config.dx, { duration: config.duration, easing: ease }),
          withTiming(config.x0, { duration: config.duration, easing: ease })
        ),
        -1
      )
    );
    // Y runs on a slightly different period so the path is elliptical, not linear
    y.value = withDelay(
      config.delay,
      withRepeat(
        withSequence(
          withTiming(config.y0 + config.dy, { duration: config.duration + 4000, easing: ease }),
          withTiming(config.y0, { duration: config.duration + 4000, easing: ease })
        ),
        -1
      )
    );
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }],
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          width: config.size,
          height: config.size,
          borderRadius: config.size / 2,
          backgroundColor: config.color,
          opacity: config.opacity,
        },
        style,
      ]}
    />
  );
}

export function AnimatedBackground() {
  const { width, height } = useWindowDimensions();
  const blobs = makeBlobs(width, height);

  return (
    <>
      {blobs.map((b, i) => (
        <Blob key={i} config={b} />
      ))}
    </>
  );
}
