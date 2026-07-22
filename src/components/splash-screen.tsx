import { Text } from '@/components/ui/text';
import React, { useEffect } from 'react';
import { StyleSheet, View, useColorScheme } from 'react-native';
;
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import * as SplashScreen from 'expo-splash-screen';
import { getTheme } from '@/core/theme/colors';

interface SplashScreenProps {
  onFinish?: () => void;
}

export function AnimatedSplashScreen({ onFinish }: SplashScreenProps) {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);

  // Animation values
  const bgOpacity = useSharedValue(1);
  const logoScale = useSharedValue(0.7);
  const logoOpacity = useSharedValue(0);
  
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(20);

  useEffect(() => {
    // Hide native splash screen immediately when animated splash mounts
    SplashScreen.hideAsync().catch(() => {});

    // Step 1: Brand Logo Scale & Spring Reveal
    logoScale.value = withSpring(1, {
      damping: 14,
      stiffness: 100,
      mass: 0.8,
    });
    logoOpacity.value = withTiming(1, { duration: 450 });

    // Step 2: Tagline Reveal ("Catat cepat. Uang lebih jelas.")
    textOpacity.value = withDelay(
      450,
      withTiming(1, { duration: 400, easing: Easing.out(Easing.quad) })
    );
    textTranslateY.value = withDelay(
      450,
      withSpring(0, { damping: 14, stiffness: 100 })
    );

    // Step 3: Finish Callback Transition
    if (onFinish) {
      const timer = setTimeout(() => {
        bgOpacity.value = withTiming(0, { duration: 400 });
        const finishTimer = setTimeout(() => {
          onFinish();
        }, 400);
        return () => clearTimeout(finishTimer);
      }, 1600);

      return () => clearTimeout(timer);
    }
  }, []);

  // Animated Styles
  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: bgOpacity.value,
  }));

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
    opacity: logoOpacity.value,
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  return (
    <Animated.View
      style={[
        styles.container,
        { backgroundColor: theme.background },
        containerAnimatedStyle,
      ]}>
      <View style={styles.logoWrapper}>
        <Animated.View style={logoAnimatedStyle}>
          <Image
            contentFit="contain"
            source={require('@/assets/images/Logo-Catat.png')}
            style={styles.logoImage}
          />
        </Animated.View>

        <Animated.View style={[styles.textContainer, textAnimatedStyle]}>
          <Text style={[styles.brandTitle, { color: theme.textPrimary }]}>
            Catat Duekku
          </Text>
          <Text style={[styles.taglineText, { color: theme.textSecondary }]}>
            Catat cepat. Uang lebih jelas.
          </Text>
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
  },
  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoImage: {
    width: 140,
    height: 140,
    marginBottom: 20,
  },
  textContainer: {
    alignItems: 'center',
    gap: 6,
  },
  brandTitle: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  taglineText: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
});
