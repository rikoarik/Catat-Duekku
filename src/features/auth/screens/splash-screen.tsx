import { Text } from '@/components/ui/text';
import React, { useEffect } from 'react';
import { StyleSheet, View, useColorScheme } from 'react-native';
;
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  runOnJS,
} from 'react-native-reanimated';
import { Image } from 'expo-image';
import { getTheme } from '@/core/theme/colors';

interface SplashScreenProps {
  onFinish: () => void;
}

export function SplashScreen({ onFinish }: SplashScreenProps) {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);

  // Animation values
  const logoScale = useSharedValue(0.5);
  const logoOpacity = useSharedValue(0);
  
  const textOpacity = useSharedValue(0);
  const textTranslateY = useSharedValue(20);

  const containerOpacity = useSharedValue(1);

  useEffect(() => {
    // 1. Fade in and scale up the main logo
    logoOpacity.value = withTiming(1, { duration: 800 });
    logoScale.value = withSpring(1, { damping: 12, stiffness: 90 });

    // 2. Fade in the text slightly after the logo
    textOpacity.value = withDelay(500, withTiming(1, { duration: 600 }));
    textTranslateY.value = withDelay(500, withSpring(0, { damping: 12, stiffness: 90 }));

    // 3. Fade out everything after a set duration and trigger onFinish
    const totalDuration = 2500; // Total time splash screen is visible
    setTimeout(() => {
      containerOpacity.value = withTiming(0, { duration: 400 }, (finished) => {
        if (finished) {
          runOnJS(onFinish)();
        }
      });
    }, totalDuration);
  }, []);

  const logoAnimatedStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
    transform: [{ scale: logoScale.value }],
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
    transform: [{ translateY: textTranslateY.value }],
  }));

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  return (
    <Animated.View style={[styles.container, { backgroundColor: theme.primary }, containerAnimatedStyle]}>
      {/* Soft Glow Background */}
      <View style={styles.glowBg} />

      <Animated.View style={[styles.logoContainer, logoAnimatedStyle]}>
        <Image
          source={require('@/assets/images/Logo-Catat.png')}
          style={styles.logo}
          contentFit="contain"
        />
      </Animated.View>

      <Animated.View style={textAnimatedStyle}>
        <Text style={styles.title}>Catat Duekku</Text>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowBg: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: '#BCEB82',
    opacity: 0.15,
  },
  logoContainer: {
    marginBottom: 24,
    shadowColor: '#BCEB82',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  logo: {
    width: 120,
    height: 120,
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
});
