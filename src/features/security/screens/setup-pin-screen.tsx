import { Text } from '@/components/ui/text';
import React, { useState } from 'react';
import { StyleSheet, View, useColorScheme, ActivityIndicator } from 'react-native';
;
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withTiming,
  withSpring,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import { ScreenWrapper } from '@/components/common/screen-wrapper';
import { PinDots } from '@/components/ui/pin-dots';
import { PinPad } from '@/components/ui/pin-pad';
import { StatusModal } from '@/components/ui/status-modal';
import { getTheme } from '@/core/theme/colors';
import { savePin } from '@/core/lib/pin-storage';

const PIN_LENGTH = 6;

export function SetupPinScreen() {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);

  const [step, setStep] = useState<'create' | 'confirm'>('create');
  const [firstPin, setFirstPin] = useState('');
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalState, setModalState] = useState<{
    visible: boolean;
    type: 'success' | 'error';
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ visible: false, type: 'error', title: '', message: '', onConfirm: () => {} });

  // Shake animation for mismatch
  const shakeX = useSharedValue(0);
  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeX.value }],
  }));

  const triggerShake = () => {
    shakeX.value = withSequence(
      withTiming(-12, { duration: 60 }),
      withTiming(12, { duration: 60 }),
      withTiming(-10, { duration: 60 }),
      withTiming(10, { duration: 60 }),
      withSpring(0, { damping: 14 })
    );
  };

  const handleDigit = (digit: string) => {
    if (pin.length >= PIN_LENGTH) return;
    const next = pin + digit;
    setPin(next);

    if (next.length === PIN_LENGTH) {
      setTimeout(() => handleComplete(next), 150);
    }
  };

  const handleDelete = () => {
    setPin((p) => p.slice(0, -1));
  };

  const handleComplete = async (completed: string) => {
    if (step === 'create') {
      setFirstPin(completed);
      setPin('');
      setStep('confirm');
    } else {
      // Confirm step
      if (completed !== firstPin) {
        triggerShake();
        setPin('');
        setModalState({
          visible: true,
          type: 'error',
          title: 'PIN Tidak Cocok',
          message: 'PIN yang Anda masukkan tidak sama. Silakan coba lagi dari awal.',
          onConfirm: () => {
            setModalState((prev) => ({ ...prev, visible: false }));
            setFirstPin('');
            setPin('');
            setStep('create');
          },
        });
        return;
      }

      // Save PIN
      setLoading(true);
      try {
        await savePin(completed);
        // Navigate to biometric suggestion
        router.replace('/setup-biometric');
      } catch {
        setModalState({
          visible: true,
          type: 'error',
          title: 'Terjadi Kesalahan',
          message: 'Gagal menyimpan PIN. Silakan coba lagi.',
          onConfirm: () => setModalState((prev) => ({ ...prev, visible: false })),
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const title = step === 'create' ? 'Buat PIN Baru' : 'Konfirmasi PIN';
  const subtitle =
    step === 'create'
      ? 'Buat 6 digit PIN untuk keamanan akun Anda.'
      : 'Masukkan ulang PIN yang sama untuk konfirmasi.';

  return (
    <ScreenWrapper withSafeArea style={{ backgroundColor: '#FFFFFF' }}>
      <View style={styles.container}>

        {/* Step indicator dots */}
        <View style={styles.stepIndicator}>
          <View style={[styles.stepDot, { backgroundColor: theme.primary }]} />
          <View style={[styles.stepDot, step === 'confirm'
            ? { backgroundColor: theme.primary }
            : { backgroundColor: '#E5E7EB' }]} />
        </View>

        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>{subtitle}</Text>
        </View>

        {/* PIN Dots */}
        <Animated.View style={[styles.dotsWrapper, shakeStyle]}>
          <PinDots
            length={PIN_LENGTH}
            filled={pin.length}
            primaryColor={theme.primary}
          />
        </Animated.View>

        {/* Loading or Keypad */}
        {loading ? (
          <ActivityIndicator color={theme.primary} size="large" style={{ marginTop: 40 }} />
        ) : (
          <PinPad onDelete={handleDelete} onPress={handleDigit} />
        )}
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
    paddingTop: 48,
    paddingBottom: 32,
    justifyContent: 'space-between',
  },
  stepIndicator: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    marginBottom: 8,
  },
  stepDot: {
    width: 28,
    height: 5,
    borderRadius: 3,
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
    paddingVertical: 32,
  },
});
