import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, TouchableOpacity, View, useColorScheme } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import * as Linking from 'expo-linking';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Lock } from 'iconsax-react-native';

import { ScreenWrapper } from '@/components/common/screen-wrapper';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { StatusModal } from '@/components/ui/status-modal';
import { Text } from '@/components/ui/text';
import { useLanguage } from '@/core/i18n/language-context';
import { supabase } from '@/core/lib/supabase';
import { getTheme } from '@/core/theme/colors';

export function ResetPasswordScreen() {
  const theme = getTheme(useColorScheme());
  const { t } = useLanguage();
  const url = Linking.useURL();
  const routeParams = useLocalSearchParams();
  const processed = useRef('');
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState({ visible: false, type: 'error' as 'success' | 'error', title: '', message: '' });

  useEffect(() => {
    const establishSession = async () => {
      const rawParams = new URLSearchParams();
      if (url) {
        const parsed = new URL(url);
        parsed.searchParams.forEach((value, key) => rawParams.set(key, value));
        new URLSearchParams(parsed.hash.replace(/^#/, '')).forEach((value, key) => rawParams.set(key, value));
      }
      Object.entries(routeParams).forEach(([key, value]) => {
        if (typeof value === 'string') rawParams.set(key, value);
      });
      const signature = rawParams.toString();
      if (!signature || processed.current === signature) return;
      processed.current = signature;

      try {
        const code = rawParams.get('code');
        const accessToken = rawParams.get('access_token');
        const refreshToken = rawParams.get('refresh_token');
        const type = rawParams.get('type');
        if (type && type !== 'recovery') throw new Error(t('auth.resetPasswordInvalidRecoveryType'));
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          if (error) throw error;
        } else {
          throw new Error(t('auth.resetPasswordIncompleteLink'));
        }
        setReady(true);
      } catch (error) {
        setModal({ visible: true, type: 'error', title: t('auth.resetPasswordInvalidLinkTitle'), message: error instanceof Error ? error.message : t('auth.resetPasswordInvalidLinkMessage') });
      }
    };
    establishSession();
  }, [routeParams, t, url]);

  const handleReset = async () => {
    if (password.length < 8) return setModal({ visible: true, type: 'error', title: t('auth.resetPasswordWeakTitle'), message: t('auth.resetPasswordWeakMessage') });
    if (password !== confirmPassword) return setModal({ visible: true, type: 'error', title: t('auth.resetPasswordMismatchTitle'), message: t('auth.resetPasswordMismatchMessage') });
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      await supabase.auth.signOut();
      setModal({ visible: true, type: 'success', title: t('auth.resetPasswordSuccessTitle'), message: t('auth.resetPasswordSuccessMessage') });
    } catch (error) {
      setModal({ visible: true, type: 'error', title: t('auth.resetPasswordFailedTitle'), message: error instanceof Error ? error.message : t('auth.resetPasswordFailedMessage') });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper withSafeArea style={{ backgroundColor: theme.background }}>
      <KeyboardAwareScrollView enableOnAndroid extraScrollHeight={Platform.OS === 'ios' ? 20 : 40} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <TouchableOpacity accessibilityLabel={t('auth.resetPasswordBackAccessibility')} style={[styles.back, { backgroundColor: theme.surfaceButton, borderColor: theme.border }]} onPress={() => router.replace('/auth')}><ArrowLeft color={theme.textPrimary} size={22} /></TouchableOpacity>
        <View style={styles.heading}><Text style={[styles.title, { color: theme.textPrimary }]} weight="bold">{t('auth.resetPasswordTitle')}</Text><Text style={{ color: theme.textMuted }}>{t('auth.resetPasswordSubtitle')}</Text></View>
        <Card variant="default" style={styles.card}>
          <Input label={t('auth.resetPasswordNewLabel')} value={password} onChangeText={setPassword} isPassword leftIcon={<Lock color={theme.textMuted} size={20} />} autoCapitalize="none" />
          <Input label={t('auth.resetPasswordConfirmLabel')} value={confirmPassword} onChangeText={setConfirmPassword} isPassword leftIcon={<Lock color={theme.textMuted} size={20} />} autoCapitalize="none" />
          <Button title={loading ? t('auth.resetPasswordUpdating') : t('auth.resetPasswordSubmit')} size="large" disabled={!ready || loading} onPress={handleReset} />
        </Card>
      </KeyboardAwareScrollView>
      <StatusModal visible={modal.visible} type={modal.type} title={modal.title} message={modal.message} onConfirm={() => modal.type === 'success' ? router.replace('/auth') : setModal((value) => ({ ...value, visible: false }))} onClose={() => setModal((value) => ({ ...value, visible: false }))} />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({ content: { flexGrow: 1, padding: 20, gap: 24 }, back: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' }, heading: { gap: 8 }, title: { fontSize: 26 }, card: { padding: 20, gap: 16 } });
