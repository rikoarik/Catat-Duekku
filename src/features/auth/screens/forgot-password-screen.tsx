import { Text } from '@/components/ui/text';
import React, { useState } from 'react';
import { StyleSheet, View, TouchableOpacity, useColorScheme, Platform, ActivityIndicator } from 'react-native';
;
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Sms } from 'iconsax-react-native';
import { router } from 'expo-router';
import { ArrowLeft } from 'iconsax-react-native';
import { ScreenWrapper } from '@/components/common/screen-wrapper';
import { Input } from '@/components/ui/input';
import { StatusModal } from '@/components/ui/status-modal';
import { getTheme } from '@/core/theme/colors';
import { supabase } from '@/core/lib/supabase';

export function ForgotPasswordScreen() {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalState, setModalState] = useState<{
    visible: boolean;
    type: 'success' | 'error';
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ visible: false, type: 'success', title: '', message: '', onConfirm: () => {} });

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

  const handleSubmit = async () => {
    if (!email.trim()) {
      triggerModal('error', 'Email Kosong', 'Masukkan alamat email Anda terlebih dahulu.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: 'catatduekku://reset-password',
      });

      if (error) {
        triggerModal(
          'error',
          'Gagal Mengirim Email',
          error.message || 'Terjadi kesalahan. Silakan coba lagi.'
        );
      } else {
        triggerModal(
          'success',
          'Email Terkirim!',
          `Link reset kata sandi telah dikirimkan ke ${email.trim()}. Periksa inbox atau folder spam Anda.`,
          () => router.back()
        );
      }
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

        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>Lupa Kata Sandi?</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            Masukkan email akun Anda. Kami akan mengirimkan link untuk membuat kata sandi baru.
          </Text>
        </View>

        {/* Email Input */}
        <Input
          autoCapitalize="none"
          keyboardType="email-address"
          label="Alamat Email"
          leftIcon={<Sms color={theme.textMuted} size={20} variant="Outline" />}
          placeholder="nama@email.com"
          value={email}
          onChangeText={setEmail}
        />

        {/* Submit Button */}
        <TouchableOpacity
          activeOpacity={0.88}
          disabled={loading}
          style={[styles.submitBtn, { backgroundColor: theme.primary, opacity: loading ? 0.7 : 1 }]}
          onPress={handleSubmit}>
          {loading ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.submitBtnText}>Kirim Link Reset</Text>
          )}
        </TouchableOpacity>

        {/* Back to login link */}
        <TouchableOpacity
          activeOpacity={0.7}
          style={styles.backToLoginBtn}
          onPress={() => router.back()}>
          <Text style={[styles.backToLoginText, { color: theme.textMuted }]}>
            Kembali ke halaman masuk
          </Text>
        </TouchableOpacity>

      </KeyboardAwareScrollView>

      <StatusModal
        visible={modalState.visible}
        type={modalState.type}
        title={modalState.title}
        message={modalState.message}
        buttonText={modalState.type === 'success' ? 'Oke, Mengerti' : 'Coba Lagi'}
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
    gap: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleSection: {
    gap: 8,
    marginBottom: 8,
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
  backToLoginBtn: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  backToLoginText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
