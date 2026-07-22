import { Text } from '@/components/ui/text';
import React, { useEffect, useState } from 'react';
import { StyleSheet, View, TouchableOpacity, useColorScheme, ActivityIndicator } from 'react-native';
;
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as LocalAuthentication from 'expo-local-authentication';
import { router } from 'expo-router';
import { ScreenWrapper } from '@/components/common/screen-wrapper';
import { PinDots } from '@/components/ui/pin-dots';
import { PinPad } from '@/components/ui/pin-pad';
import { StatusModal } from '@/components/ui/status-modal';
import { getTheme } from '@/core/theme/colors';
import { verifyPin, isBiometricEnabled, clearPin } from '@/core/lib/pin-storage';
import { supabase } from '@/core/lib/supabase';

const PIN_LENGTH = 6;

export function PinLockScreen() {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);

  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [errorCount, setErrorCount] = useState(0);
  const [modalState, setModalState] = useState<{
    visible: boolean;
    type: 'success' | 'error';
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ visible: false, type: 'error', title: '', message: '', onConfirm: () => {} });

  // Shake animation for wrong PIN
  const shakeX = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const triggerShake = () => {
    shakeX.value = withSequence(
      withTiming(-14, { duration: 60 }),
      withTiming(14, { duration: 60 }),
      withTiming(-10, { duration: 60 }),
      withTiming(10, { duration: 60 }),
      withSpring(0, { damping: 14 })
    );
  };

  // Check biometric availability & try auto on load
  useEffect(() => {
    (async () => {
      const enabled = await isBiometricEnabled();
      const hardware = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      if (enabled && hardware && enrolled) {
        setBiometricAvailable(true);
        // Auto-prompt biometric on launch
        await tryBiometric();
      }
    })();
  }, []);

  const tryBiometric = async () => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Masuk ke Catat Duekku',
        cancelLabel: 'Gunakan PIN',
        disableDeviceFallback: true,
      });
      if (result.success) {
        router.replace('/(main)');
      }
    } catch {
      // Fallback to PIN entry
    }
  };

  const handleDigit = (digit: string) => {
    if (pin.length >= PIN_LENGTH || loading) return;
    const next = pin + digit;
    setPin(next);
    if (next.length === PIN_LENGTH) {
      setTimeout(() => handleVerify(next), 150);
    }
  };

  const handleDelete = () => {
    if (!loading) setPin((p) => p.slice(0, -1));
  };

  const handleVerify = async (completed: string) => {
    setLoading(true);
    try {
      const correct = await verifyPin(completed);
      if (correct) {
        router.replace('/(main)');
      } else {
        triggerShake();
        const newCount = errorCount + 1;
        setErrorCount(newCount);
        setPin('');

        if (newCount >= 5) {
          setModalState({
            visible: true,
            type: 'error',
            title: 'Terlalu Banyak Percobaan',
            message: 'Anda telah salah memasukkan PIN sebanyak 5 kali. Silakan coba lagi setelah beberapa saat.',
            onConfirm: () => {
              setModalState((prev) => ({ ...prev, visible: false }));
              setErrorCount(0);
            },
          });
        } else {
          setModalState({
            visible: true,
            type: 'error',
            title: 'PIN Salah',
            message: `PIN yang Anda masukkan salah. Sisa percobaan: ${5 - newCount}.`,
            onConfirm: () => setModalState((prev) => ({ ...prev, visible: false })),
          });
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await clearPin();
    await supabase.auth.signOut();
    router.replace('/auth');
  };

  return (
    <ScreenWrapper withSafeArea style={{ backgroundColor: '#FFFFFF' }}>
      <View style={styles.container}>

        {/* Header */}
        <View style={styles.titleSection}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>Masukkan PIN</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            {biometricAvailable
              ? 'Masukkan PIN atau gunakan biometrik untuk masuk.'
              : 'Masukkan 6 digit PIN Anda untuk masuk.'}
          </Text>
        </View>

        {/* PIN Dots */}
        <Animated.View style={[styles.dotsWrapper, shakeStyle]}>
          <PinDots
            length={PIN_LENGTH}
            filled={pin.length}
            primaryColor={theme.primary}
          />
        </Animated.View>

        {/* Loading / Keypad */}
        {loading ? (
          <ActivityIndicator color={theme.primary} size="large" style={{ marginTop: 40 }} />
        ) : (
          <PinPad
            disabled={loading}
            onDelete={handleDelete}
            onPress={handleDigit}
            onBiometric={biometricAvailable ? tryBiometric : undefined}
          />
        )}

        {/* Bottom links */}
        <View style={styles.bottomLinks}>
          <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/forgot-pin')}>
            <Text style={[styles.linkText, { color: theme.expense }]}>Lupa PIN?</Text>
          </TouchableOpacity>
          <TouchableOpacity activeOpacity={0.7} onPress={handleLogout}>
            <Text style={[styles.linkText, { color: theme.textMuted }]}>Keluar &amp; Ganti Akun</Text>
          </TouchableOpacity>
        </View>
      </View>

      <StatusModal
        visible={modalState.visible}
        type={modalState.type}
        title={modalState.title}
        message={modalState.message}
        buttonText="Mengerti"
        onConfirm={modalState.onConfirm}
        onClose={() => setModalState((prev) => ({ ...prev, visible: false }))}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 56,
    paddingBottom: 32,
    justifyContent: 'space-between',
  },
  titleSection: {
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  dotsWrapper: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  bottomLinks: {
    alignItems: 'center',
    gap: 14,
    paddingBottom: 8,
  },
  linkText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
