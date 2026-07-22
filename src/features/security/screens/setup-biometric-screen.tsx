import { Text } from '@/components/ui/text';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View, TouchableOpacity, useColorScheme, ActivityIndicator } from 'react-native';
;
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import * as LocalAuthentication from 'expo-local-authentication';
import { Scan } from 'iconsax-react-native';
import { router } from 'expo-router';
import { ScreenWrapper } from '@/components/common/screen-wrapper';
import { getTheme } from '@/core/theme/colors';
import { setBiometricEnabled } from '@/core/lib/pin-storage';

export function SetupBiometricScreen() {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);

  const [hasHardware, setHasHardware] = useState<boolean | null>(null);
  const [biometricType, setBiometricType] = useState<'fingerprint' | 'face' | 'none'>('none');
  const [loading, setLoading] = useState(false);

  // Entry animation
  const cardScale = useSharedValue(0.85);
  const cardOpacity = useSharedValue(0);
  const iconScale = useSharedValue(0.5);

  // Idle pulse on the fingerprint icon
  const pulse = useSharedValue(1);

  useEffect(() => {
    // Subtle entry animation
    cardOpacity.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.quad) });
    cardScale.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.quad) });
    iconScale.value = withTiming(1, { duration: 220, easing: Easing.out(Easing.quad) });

    // Check hardware
    (async () => {
      const hardware = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (!hardware || !enrolled) {
        // No biometric available — auto-skip
        setHasHardware(false);
        await setBiometricEnabled(false);
        setTimeout(() => router.replace('/(main)'), 800);
        return;
      }

      const types = await LocalAuthentication.supportedAuthenticationTypesAsync();
      const hasFace = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION);
      setBiometricType(hasFace ? 'face' : 'fingerprint');
      setHasHardware(true);
    })();
  }, []);

  const cardAnimStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ scale: cardScale.value }],
  }));

  const iconAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const handleEnable = async () => {
    setLoading(true);
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Konfirmasi identitas Anda',
        cancelLabel: 'Batal',
        fallbackLabel: 'Gunakan PIN',
        disableDeviceFallback: false,
      });

      if (result.success) {
        await setBiometricEnabled(true);
      }
    } catch {
      // ignore, just skip
    } finally {
      setLoading(false);
      router.replace('/(main)');
    }
  };

  const handleSkip = async () => {
    await setBiometricEnabled(false);
    router.replace('/(main)');
  };

  const label = biometricType === 'face' ? 'Face ID' : 'Fingerprint';
  const iconNode = (
    <Scan
      color={theme.primary}
      size={64}
      variant="Outline"
    />
  );

  if (hasHardware === null) {
    return (
      <ScreenWrapper withSafeArea style={{ backgroundColor: '#FFFFFF' }}>
        <View style={styles.center}>
          <ActivityIndicator color={theme.primary} size="large" />
        </View>
      </ScreenWrapper>
    );
  }

  if (!hasHardware) {
    return (
      <ScreenWrapper withSafeArea style={{ backgroundColor: '#FFFFFF' }}>
        <View style={styles.center}>
          <Text style={{ color: theme.textMuted, fontSize: 14 }}>Mengalihkan…</Text>
        </View>
      </ScreenWrapper>
    );
  }

  return (
    <ScreenWrapper withSafeArea style={{ backgroundColor: '#FFFFFF' }}>
      <View style={styles.container}>
        <Animated.View style={[styles.card, { shadowColor: theme.primary }, cardAnimStyle]}>

          {/* Icon */}
          <Animated.View style={[styles.iconBadge, { backgroundColor: 'rgba(12, 59, 58, 0.08)' }, iconAnimStyle]}>
            {iconNode}
          </Animated.View>

          {/* Text */}
          <Text style={[styles.title, { color: theme.textPrimary }]}>
            Aktifkan {label}
          </Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            Masuk lebih cepat dan aman dengan {label} — tanpa perlu memasukkan PIN setiap kali.
          </Text>

          {/* Buttons */}
          <TouchableOpacity
            activeOpacity={0.85}
            disabled={loading}
            style={[styles.primaryBtn, { backgroundColor: theme.primary, opacity: loading ? 0.7 : 1 }]}
            onPress={handleEnable}>
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.primaryBtnText}>Aktifkan {label}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            disabled={loading}
            style={styles.skipBtn}
            onPress={handleSkip}>
            <Text style={[styles.skipBtnText, { color: theme.textMuted }]}>
              Lewati, gunakan PIN saja
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 48,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    alignItems: 'center',
    gap: 16,
  },
  iconBadge: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  primaryBtn: {
    width: '100%',
    height: 54,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  skipBtn: {
    paddingVertical: 14,
  },
  skipBtnText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
