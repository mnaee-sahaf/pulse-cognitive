import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Colors } from '../constants/theme';
import { loadAppSettings } from '../db/appSettings';
import { useAppSettings } from '../store/appSettingsStore';

export default function RootLayout() {
  const setAnimatedBackground = useAppSettings((s) => s.setAnimatedBackground);

  useEffect(() => {
    loadAppSettings()
      .then((s) => setAnimatedBackground(s.animatedBackground))
      .catch(console.error);
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" backgroundColor={Colors.background} />
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
    </SafeAreaProvider>
  );
}
