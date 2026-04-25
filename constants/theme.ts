import { Easing as ReanimatedEasing } from 'react-native-reanimated';

export const Colors = {
  background: '#F7F6F3',
  surface: '#FFFFFF',
  textPrimary: '#1A1A1A',
  textSecondary: '#6B6B6B',
  textTertiary: '#9E9E9E',
  accent: '#2D5BFF',
  accentSoft: '#EEF2FF',
  success: '#22C55E',
  danger: '#EF4444',
  warning: '#F59E0B',
  border: '#E8E6E1',
} as const;

export const Spacing = {
  base: 8,
  pagePadding: 20,
  gridGap: 10,
  cardRadius: 16,
  cellRadius: 10,
  badgeRadius: 8,
  pillRadius: 20,
  inputRadius: 8,
  maxWidth: 420,
} as const;

export const FontSize = {
  display: 28,
  body: 15,
  label: 11,
  mono: 15,
  logo: 22,
} as const;

/**
 * Standard pressed-state opacity. Use inside a Pressable's
 * style callback: `({ pressed }) => [styles.x, pressed && Pressed]`.
 */
export const Pressed = { opacity: 0.85 } as const;

/**
 * Standard easing curves. `standard` is the default for most UI motion.
 */
export const Easing = {
  standard: ReanimatedEasing.bezier(0.22, 1, 0.36, 1),
  out: ReanimatedEasing.out(ReanimatedEasing.ease),
} as const;

/**
 * Shadow tokens for cards and overlays. Cross-platform: iOS reads shadow*,
 * Android reads elevation.
 */
export const Shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
} as const;
