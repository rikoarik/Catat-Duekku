import { Text } from '@/components/ui/text';
import React, { useState } from 'react';
import { StyleSheet, View, TouchableOpacity, useColorScheme, Platform } from 'react-native';
;
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Sms, Lock, ArrowLeft } from 'iconsax-react-native';
import { router } from 'expo-router';
import { ScreenWrapper } from '@/components/common/screen-wrapper';
import { Input } from '@/components/ui/input';
import { StatusModal } from '@/components/ui/status-modal';
import { getTheme } from '@/core/theme/colors';
import { supabase } from '@/core/lib/supabase';
import { clearPin } from '@/core/lib/pin-storage';

/**
 * Forgot PIN Screen
 *
 * Flow: Re-authenticate with email + password
 *       → if successful, clear existing PIN → navigate to /setup-pin
 *
 * This proves the user owns the account before letting them reset the PIN.
 */
export function ForgotPinScreen() {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);

  const [account, setAccount] = useState<{ id: string; email: string } | null>(null);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalState, setModalState] = useState<{
    visible: boolean;
    type: 'success' | 'error';
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ visible: false, type: 'error', title: '', message: '', onConfirm: () => {} });

  // Entry card animation
  const cardOpacity = useSharedValue(0);
  const cardY = useSharedValue(12);
  React.useEffect(() => {
    cardOpacity.value = withTiming(1, { duration: 200, easing: Easing.out(Easing.quad) });
    cardY.value = withTiming(0, { duration: 200, easing: Easing.out(Easing.quad) });
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user.id && session.user.email) {
        setAccount({ id: session.user.id, email: session.user.email });
      } else {
        router.replace('/auth');
      }
    }).catch(() => router.replace('/auth'));
  }, []);
  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardY.value }],
  }));

  const triggerModal = (
    type: 'success' | 'error',
    title: string,
    message: string,
    onConfirmCallback?: () => void
  ) => {
    setModalState({
      visible: true,
      type,
      title,
      message,
      onConfirm: () => {
        setModalState((prev) => ({ ...prev, visible: false }));
        onConfirmCallback?.();
      },
    });
  };

  const handleReset = async () => {
    if (!account || !password) {
      triggerModal('error', 'Data Tidak Lengkap', 'Masukkan kata sandi Anda.');
      return;
    }

    setLoading(true);
    try {
      const originalUserId = account.id;
      const { data, error } = await supabase.auth.signInWithPassword({
        email: account.email,
        password,
      });

      if (error || data.user?.id !== originalUserId) {
        triggerModal(
          'error',
          'Verifikasi Gagal',
          'Email atau kata sandi tidak sesuai. Pastikan data yang Anda masukkan benar.'
        );
        return;
      }

      await clearPin();

      triggerModal(
        'success',
        'Identitas Terverifikasi',
        'Sekarang buat PIN baru untuk akun Anda.',
        () => router.replace({ pathname: '/setup-pin', params: { mode: 'reset' } })
      );
    } catch {
      triggerModal('error', 'Verifikasi Gagal', 'Tidak dapat mereset PIN. Pastikan sesi dan kata sandi Anda valid.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper withSafeArea style={{ backgroundColor: '#FFFFFF' }}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContent}
        enableOnAndroid
        extraScrollHeight={Platform.OS === 'ios' ? 20 : 40}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>

        {/* Back Button */}
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.backBtn}
          onPress={() => router.back()}>
          <ArrowLeft color={theme.textPrimary} size={22} variant="Outline" />
        </TouchableOpacity>

        <Animated.View style={[styles.content, cardStyle]}>

          {/* Title */}
          <View style={styles.titleSection}>
            <Text style={[styles.title, { color: theme.textPrimary }]}>Lupa PIN?</Text>
            <Text style={[styles.subtitle, { color: theme.textMuted }]}>
              Untuk mereset PIN, verifikasi terlebih dahulu bahwa Anda pemilik akun ini
              dengan memasukkan email dan kata sandi.
            </Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Input
              autoCapitalize="none"
              keyboardType="email-address"
              label="Alamat Email"
              leftIcon={<Sms color={theme.textMuted} size={20} variant="Outline" />}
              editable={false}
              value={account?.email ?? ''}
            />
            <Input
              secureTextEntry
              label="Kata Sandi"
              leftIcon={<Lock color={theme.textMuted} size={20} variant="Outline" />}
              placeholder="Kata sandi akun Anda"
              value={password}
              onChangeText={setPassword}
            />
          </View>

          {/* CTA */}
          <TouchableOpacity
            activeOpacity={0.88}
            disabled={loading}
            style={[styles.submitBtn, { backgroundColor: theme.primary, opacity: loading ? 0.7 : 1 }]}
            onPress={handleReset}>
            <Text style={styles.submitBtnText}>
              {loading ? 'Memverifikasi…' : 'Verifikasi & Reset PIN'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.backToLockBtn}
            onPress={() => router.back()}>
            <Text style={[styles.backToLockText, { color: theme.textMuted }]}>
              Kembali ke layar PIN
            </Text>
          </TouchableOpacity>

        </Animated.View>
      </KeyboardAwareScrollView>

      <StatusModal
        visible={modalState.visible}
        type={modalState.type}
        title={modalState.title}
        message={modalState.message}
        buttonText={modalState.type === 'success' ? 'Buat PIN Baru' : 'Coba Lagi'}
        onConfirm={modalState.onConfirm}
        onClose={() => setModalState((prev) => ({ ...prev, visible: false }))}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 12 : 20,
    paddingBottom: 36,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  content: {
    flex: 1,
    gap: 20,
  },
  titleSection: {
    gap: 8,
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 22,
  },
  form: {
    gap: 16,
  },
  submitBtn: {
    height: 54,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#0C3B3A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  backToLockBtn: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  backToLockText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
