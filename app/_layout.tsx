import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Colors } from '../constants/theme';
import { loadAppSettings } from '../db/appSettings';
import { useAppSettings } from '../store/appSettingsStore';

export default function RootLayout() {
  const setAnimatedBackground = useAppSettings((s) => s.setAnimatedBackground);
  const setBackgroundIntensity = useAppSettings((s) => s.setBackgroundIntensity);
  const setGreenTileFeedback = useAppSettings((s) => s.setGreenTileFeedback);
  const setHapticFeedback = useAppSettings((s) => s.setHapticFeedback);

  useEffect(() => {
    loadAppSettings()
      .then((s) => {
        setAnimatedBackground(s.animatedBackground);
        setBackgroundIntensity(s.backgroundIntensity);
        setGreenTileFeedback(s.greenTileFeedback);
        setHapticFeedback(s.hapticFeedback);
      })
      .catch(console.error);
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" backgroundColor={Colors.background} />
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
    </SafeAreaProvider>
  );
}
