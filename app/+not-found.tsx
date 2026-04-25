import { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';
import { Colors, FontSize, Spacing, Pressed } from '../constants/theme';
import { log } from '../lib/devLog';

export default function NotFoundScreen() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    log.warn('Unmatched route hit', { pathname });
  }, [pathname]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Route not found</Text>
      <Text style={styles.path}>{pathname}</Text>
      <Pressable
        style={({ pressed }) => [styles.btn, pressed && Pressed]}
        onPress={() => router.replace('/')}
      >
        <Text style={styles.btnText}>Go Home</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    padding: Spacing.pagePadding,
  },
  title: {
    fontSize: FontSize.display,
    fontWeight: '600',
    fontFamily: 'serif',
    color: Colors.textPrimary,
  },
  path: {
    fontSize: FontSize.body,
    color: Colors.danger,
    fontFamily: 'monospace',
  },
  btn: {
    backgroundColor: Colors.accent,
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: Spacing.cardRadius,
  },
  btnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
