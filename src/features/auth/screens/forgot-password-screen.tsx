import { useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, TouchableOpacity, View, useColorScheme } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { router } from 'expo-router';
import { ArrowLeft, Sms } from 'iconsax-react-native';

import { ScreenWrapper } from '@/components/common/screen-wrapper';
import { Input } from '@/components/ui/input';
import { StatusModal } from '@/components/ui/status-modal';
import { Text } from '@/components/ui/text';
import { useLanguage } from '@/core/i18n/language-context';
import { supabase } from '@/core/lib/supabase';
import { getTheme } from '@/core/theme/colors';

export function ForgotPasswordScreen() {
  const theme = getTheme(useColorScheme());
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [modalState, setModalState] = useState<{
    visible: boolean;
    type: 'success' | 'error';
    title: string;
    message: string;
    onConfirm: () => void;
  }>({ visible: false, type: 'success', title: '', message: '', onConfirm: () => {} });

  const triggerModal = (type: 'success' | 'error', title: string, message: string, onConfirmCallback?: () => void) => {
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
    const address = email.trim();
    if (!address) return triggerModal('error', t('auth.forgotPasswordEmptyTitle'), t('auth.forgotPasswordEmptyMessage'));
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(address, { redirectTo: 'https://web-auth-seven.vercel.app/reset-password' });
      if (error) throw error;
      triggerModal('success', t('auth.forgotPasswordSentTitle'), t('auth.forgotPasswordSentMessage').replace('{email}', address), () => router.back());
    } catch (error) {
      triggerModal('error', t('auth.forgotPasswordFailedTitle'), error instanceof Error ? error.message : t('auth.forgotPasswordFailedMessage'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper withSafeArea style={{ backgroundColor: theme.background }}>
      <KeyboardAwareScrollView contentContainerStyle={styles.scrollContent} enableOnAndroid extraScrollHeight={Platform.OS === 'ios' ? 20 : 40} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <TouchableOpacity accessibilityLabel={t('auth.forgotPasswordBackAccessibility')} activeOpacity={0.7} style={[styles.backBtn, { backgroundColor: theme.surfaceButton, borderColor: theme.border }]} onPress={() => router.back()}>
          <ArrowLeft color={theme.textPrimary} size={22} variant="Outline" />
        </TouchableOpacity>
        <View style={styles.titleSection}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>{t('auth.forgotPasswordTitle')}</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>{t('auth.forgotPasswordSubtitle')}</Text>
        </View>
        <Input autoCapitalize="none" keyboardType="email-address" label={t('auth.emailLabel')} leftIcon={<Sms color={theme.textMuted} size={20} variant="Outline" />} placeholder={t('auth.emailPlaceholder')} value={email} onChangeText={setEmail} />
        <TouchableOpacity activeOpacity={0.88} disabled={loading} style={[styles.submitBtn, { backgroundColor: theme.primary, opacity: loading ? 0.7 : 1 }]} onPress={handleSubmit}>
          {loading ? <ActivityIndicator color={theme.onPrimary} size="small" /> : <Text style={[styles.submitBtnText, { color: theme.onPrimary }]}>{t('auth.forgotPasswordSubmit')}</Text>}
        </TouchableOpacity>
        <TouchableOpacity activeOpacity={0.7} style={styles.backToLoginBtn} onPress={() => router.back()}>
          <Text style={[styles.backToLoginText, { color: theme.textMuted }]}>{t('auth.forgotPasswordBackToLogin')}</Text>
        </TouchableOpacity>
      </KeyboardAwareScrollView>
      <StatusModal visible={modalState.visible} type={modalState.type} title={modalState.title} message={modalState.message} buttonText={modalState.type === 'success' ? t('common.understand') : t('common.tryAgain')} onConfirm={modalState.onConfirm} onClose={() => setModalState((prev) => ({ ...prev, visible: false }))} />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingTop: Platform.OS === 'ios' ? 12 : 20, paddingBottom: 36, gap: 20 },
  backBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  titleSection: { gap: 8, marginBottom: 8 },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.6 },
  subtitle: { fontSize: 14, lineHeight: 22 },
  submitBtn: { height: 54, borderRadius: 100, alignItems: 'center', justifyContent: 'center' },
  submitBtnText: { fontSize: 16, fontWeight: '700' },
  backToLoginBtn: { alignItems: 'center', paddingVertical: 4 },
  backToLoginText: { fontSize: 14, fontWeight: '500' },
});
