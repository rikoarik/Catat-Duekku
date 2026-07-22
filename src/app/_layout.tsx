import { useState, useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme, View } from 'react-native';
import { useFonts } from 'expo-font';
import { AnimatedSplashScreen } from '@/components/splash-screen';
import { getTheme } from '@/core/theme/colors';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);
  const [splashFinished, setSplashFinished] = useState(false);
  
  const [fontsLoaded] = useFonts({
    'ClashDisplay-Regular': require('../../assets/fonts/ClashDisplay-Regular.otf'),
    'ClashDisplay-Medium': require('../../assets/fonts/ClashDisplay-Medium.otf'),
    'ClashDisplay-Semibold': require('../../assets/fonts/ClashDisplay-Semibold.otf'),
    'ClashDisplay-Bold': require('../../assets/fonts/ClashDisplay-Bold.otf'),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return null; // Keep splash screen visible until fonts load
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.background }}>
      <Stack screenOptions={{ headerShown: false }} />
      {!splashFinished && (
        <AnimatedSplashScreen onFinish={() => setSplashFinished(true)} />
      )}
    </View>
  );
}
