import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Colors } from '../constants/theme';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="dark" backgroundColor={Colors.background} />
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
    </SafeAreaProvider>
  );
}
