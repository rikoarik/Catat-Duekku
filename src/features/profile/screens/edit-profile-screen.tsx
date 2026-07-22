import React from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { ArrowLeft, Sms, User } from 'iconsax-react-native';
import { router } from 'expo-router';

import { ScreenWrapper } from '@/components/common/screen-wrapper';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { StatusModal } from '@/components/ui/status-modal';
import { Text } from '@/components/ui/text';
import { t } from '@/core/i18n/strings';
import { getTheme } from '@/core/theme/colors';
import { useEditProfileForm } from '@/features/profile/hooks/use-edit-profile-form';

export function EditProfileScreen() {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);
  const { loading, fetching, fullName, email, statusModal, setFullName, handleSave } =
    useEditProfileForm();

  const saveButtonTitle = loading ? t('profile.saving') : t('profile.saveChanges');

  return (
    <ScreenWrapper withSafeArea style={{ backgroundColor: theme.surfaceHighlight }}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContent}
        enableOnAndroid
        extraScrollHeight={Platform.OS === 'ios' ? 20 : 40}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          activeOpacity={0.7}
          style={[styles.backBtn, { borderColor: theme.border }]}
          onPress={() => router.back()}
        >
          <ArrowLeft color={theme.textPrimary} size={22} variant="Outline" />
        </TouchableOpacity>

        <View style={styles.titleSection}>
          <Text style={[styles.title, { color: theme.textPrimary }]} weight="bold">
            {t('profile.editTitle')}
          </Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            {t('profile.editSubtitle')}
          </Text>
        </View>

        {fetching ? (
          <ActivityIndicator color={theme.primary} size="large" style={styles.loader} />
        ) : (
          <Card variant="default" style={styles.formCard}>
            <View style={styles.form}>
              <Input
                label={t('profile.fullNameLabel')}
                placeholder={t('profile.fullNamePlaceholder')}
                leftIcon={<User color={theme.textMuted} size={20} variant="Outline" />}
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
              />

              <Input
                editable={false}
                label={t('profile.emailReadOnlyLabel')}
                placeholder={t('auth.emailPlaceholder')}
                leftIcon={<Sms color={theme.textMuted} size={20} variant="Outline" />}
                value={email}
                onChangeText={() => {}}
                style={styles.disabledInput}
              />

              <Button
                title={saveButtonTitle}
                disabled={loading}
                variant="primary"
                size="large"
                onPress={handleSave}
                style={styles.saveBtn}
              />
            </View>
          </Card>
        )}

        <StatusModal
          visible={statusModal.visible}
          type={statusModal.type}
          title={statusModal.title}
          message={statusModal.message}
          buttonText={t('common.continue')}
          onConfirm={statusModal.onConfirm}
        />
      </KeyboardAwareScrollView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  titleSection: {
    marginBottom: 28,
  },
  title: {
    fontSize: 26,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 13,
    marginTop: 6,
    lineHeight: 18,
  },
  loader: {
    marginTop: 48,
  },
  formCard: {
    borderRadius: 24,
    padding: 20,
  },
  form: {
    gap: 16,
  },
  disabledInput: {
    opacity: 0.6,
  },
  saveBtn: {
    marginTop: 8,
  },
});
