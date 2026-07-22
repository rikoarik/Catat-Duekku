import { useState } from 'react';
import { Platform, StyleSheet, TouchableOpacity, View, useColorScheme } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { router } from 'expo-router';
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

export function ChangePasswordScreen() {
  const theme = getTheme(useColorScheme());
  const { t } = useLanguage();
  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState({ visible: false, type: 'error' as 'success' | 'error', title: '', message: '' });

  const handleChange = async () => {
    if (!currentPassword) return setModal({ visible: true, type: 'error', title: t('profile.changePasswordEmptyTitle'), message: t('profile.changePasswordEmptyMessage') });
    if (password.length < 8) return setModal({ visible: true, type: 'error', title: t('profile.changePasswordWeakTitle'), message: t('profile.changePasswordWeakMessage') });
    if (password !== confirmPassword) return setModal({ visible: true, type: 'error', title: t('profile.changePasswordMismatchTitle'), message: t('profile.changePasswordMismatchMessage') });
    setLoading(true);
    try {
      const { data: current, error: userError } = await supabase.auth.getUser();
      if (userError || !current.user.email) throw userError ?? new Error(t('profile.changePasswordEmailUnavailable'));
      const { data: reauthenticated, error: authError } = await supabase.auth.signInWithPassword({ email: current.user.email, password: currentPassword });
      if (authError) throw new Error(t('profile.changePasswordCurrentIncorrect'));
      if (reauthenticated.user.id !== current.user.id) {
        await supabase.auth.signOut();
        throw new Error(t('profile.changePasswordIdentityMismatch'));
      }
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      await supabase.auth.signOut();
      setModal({ visible: true, type: 'success', title: t('profile.changePasswordSuccessTitle'), message: t('profile.changePasswordSuccessMessage') });
    } catch (error) {
      setModal({ visible: true, type: 'error', title: t('profile.changePasswordFailedTitle'), message: error instanceof Error ? error.message : t('profile.changePasswordFailedMessage') });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper withSafeArea style={{ backgroundColor: theme.surfaceHighlight }}>
      <KeyboardAwareScrollView enableOnAndroid extraScrollHeight={Platform.OS === 'ios' ? 20 : 40} keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
        <TouchableOpacity accessibilityLabel={t('profile.changePasswordBackAccessibility')} style={[styles.back, { backgroundColor: theme.surfaceButton, borderColor: theme.border }]} onPress={() => router.back()}><ArrowLeft color={theme.textPrimary} size={22} /></TouchableOpacity>
        <View style={styles.heading}><Text style={[styles.title, { color: theme.textPrimary }]} weight="bold">{t('profile.changePasswordTitle')}</Text><Text style={{ color: theme.textMuted }}>{t('profile.changePasswordSubtitle')}</Text></View>
        <Card variant="default" style={styles.card}>
          <Input label={t('profile.changePasswordCurrentLabel')} value={currentPassword} onChangeText={setCurrentPassword} isPassword leftIcon={<Lock color={theme.textMuted} size={20} />} autoCapitalize="none" />
          <Input label={t('profile.changePasswordNewLabel')} value={password} onChangeText={setPassword} isPassword leftIcon={<Lock color={theme.textMuted} size={20} />} autoCapitalize="none" />
          <Input label={t('profile.changePasswordConfirmLabel')} value={confirmPassword} onChangeText={setConfirmPassword} isPassword leftIcon={<Lock color={theme.textMuted} size={20} />} autoCapitalize="none" />
          <Button title={loading ? t('profile.changePasswordUpdating') : t('profile.changePasswordSubmit')} size="large" disabled={loading} onPress={handleChange} />
        </Card>
      </KeyboardAwareScrollView>
      <StatusModal visible={modal.visible} type={modal.type} title={modal.title} message={modal.message} onConfirm={() => modal.type === 'success' ? router.replace('/auth') : setModal((value) => ({ ...value, visible: false }))} onClose={() => setModal((value) => ({ ...value, visible: false }))} />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({ content: { flexGrow: 1, padding: 20, gap: 24 }, back: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' }, heading: { gap: 8 }, title: { fontSize: 26 }, card: { padding: 20, gap: 16 } });
