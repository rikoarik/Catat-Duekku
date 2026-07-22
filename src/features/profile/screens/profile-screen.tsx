import React, { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { Image } from 'expo-image';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  Camera,
  Global,
  Lock,
  Logout,
  Scan,
  Trash,
  User,
} from 'iconsax-react-native';
import { router } from 'expo-router';

import { ScreenWrapper } from '@/components/common/screen-wrapper';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { StatusModal } from '@/components/ui/status-modal';
import { Text } from '@/components/ui/text';
import { useLanguage } from '@/core/i18n/language-context';
import { getTheme } from '@/core/theme/colors';
import { useProfileSettings } from '@/features/profile/hooks/use-profile-settings';
import { getProfileInitials } from '@/features/profile/lib/profile-formatters';
import { pickAndUploadAvatar } from '@/features/profile/lib/avatar-uploader';

import { LanguageBottomSheet } from '@/components/ui/language-bottom-sheet';

const white = '#FFFFFF';
const versionText = 'Catat Duekku v1.0.0';

export function ProfileScreen() {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);
  const isDark = colorScheme === 'dark';
  const { language, t } = useLanguage();
  const [languageSheetVisible, setLanguageSheetVisible] = useState(false);
  const {
    user,
    loadingUser,
    pinSet,
    biometricsAvailable,
    biometricsEnabled,
    statusModal,
    confirmation,
    localTimezone,
    closeStatusModal,
    closeConfirmation,
    confirmAction,
    handlePinToggle,
    handleBiometricToggle,
    handleResetData,
    handleLogout,
  } = useProfileSettings();

  const [uploadedAvatarUrl, setUploadedAvatarUrl] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const avatarUrl = uploadedAvatarUrl ?? user?.avatar_url ?? null;

  const handleAvatarPress = async () => {
    setUploadingAvatar(true);
    const res = await pickAndUploadAvatar();
    setUploadingAvatar(false);
    if (res.success && res.publicUrl) {
      setUploadedAvatarUrl(res.publicUrl);
    }
  };

  const fullName = user?.full_name || t('profile.defaultUserName');
  const emailAddress = user?.email || t('profile.defaultEmail');
  const initials = getProfileInitials(fullName, emailAddress);
  const biometricDescription = biometricsAvailable
    ? t('profile.biometricDescription')
    : t('profile.biometricUnsupported');

  return (
    <KeyboardAwareScrollView
        enableOnAndroid
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <Animated.View entering={FadeInDown.duration(350)} style={styles.headerRow}>
          <Text style={[styles.screenTitle, { color: theme.textPrimary }]} weight="bold">
            {t('profile.title')}
          </Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(50).duration(350)}>
          <Card variant="default" style={styles.profileCard}>
            {loadingUser ? (
              <ActivityIndicator color={theme.primary} size="small" style={styles.spinner} />
            ) : (
              <View style={styles.profileRow}>
                <TouchableOpacity
                  activeOpacity={0.8}
                  disabled={uploadingAvatar}
                  style={styles.avatarTouchable}
                  onPress={handleAvatarPress}
                >
                  {avatarUrl ? (
                    <Image contentFit="cover" source={{ uri: avatarUrl }} style={styles.avatarImage} />
                  ) : (
                    <View style={[styles.avatar, { backgroundColor: theme.softLime }]}>
                      <Text style={[styles.avatarText, { color: theme.deepTeal }]} weight="bold">
                        {initials}
                      </Text>
                    </View>
                  )}
                  <View style={[styles.cameraBadge, { backgroundColor: theme.primary }]}>
                    {uploadingAvatar ? (
                      <ActivityIndicator color={theme.onPrimary} size="small" />
                    ) : (
                      <Camera color={theme.onPrimary} size={11} variant="Bold" />
                    )}
                  </View>
                </TouchableOpacity>

                <View style={styles.profileDetails}>
                  <Text style={[styles.profileName, { color: theme.textPrimary }]} weight="semibold">
                    {fullName}
                  </Text>
                  <Text style={[styles.profileEmail, { color: theme.textMuted }]}>{emailAddress}</Text>
                  <View style={styles.syncBadge}>
                    <View style={[styles.syncDot, { backgroundColor: theme.income }]} />
                    <Text style={[styles.syncText, { color: theme.textSecondary }]}>
                      {t('profile.cloudSyncActive')}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(75).duration(350)}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]} weight="semibold">
              {t('profile.sectionProfile')}
            </Text>
          </View>
          <Card variant="default" style={styles.settingsCard}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.settingRow}
              onPress={() => router.push('/edit-profile')}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: theme.surfaceElement }]}>
                  <User color={theme.textPrimary} size={20} variant="Outline" />
                </View>
                <View>
                  <Text style={[styles.settingLabel, { color: theme.textPrimary }]} weight="medium">
                    {t('profile.editProfileLabel')}
                  </Text>
                  <Text style={[styles.settingSub, { color: theme.textMuted }]}>
                    {t('profile.editProfileDescription')}
                  </Text>
                </View>
              </View>
              <Text style={[styles.actionLink, { color: theme.primary }]} weight="semibold">
                {t('common.edit')}
              </Text>
            </TouchableOpacity>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(100).duration(350)}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]} weight="semibold">
              {t('profile.sectionSecurity')}
            </Text>
          </View>
          <Card variant="default" style={styles.settingsCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: theme.surfaceElement }]}>
                  <Lock color={theme.textPrimary} size={20} variant="Outline" />
                </View>
                <View>
                  <Text style={[styles.settingLabel, { color: theme.textPrimary }]} weight="medium">
                    {t('profile.pinLockLabel')}
                  </Text>
                  <Text style={[styles.settingSub, { color: theme.textMuted }]}>
                    {t('profile.pinLockDescription')}
                  </Text>
                </View>
              </View>
              <Switch
                value={pinSet}
                onValueChange={handlePinToggle}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor={isDark ? theme.softLime : white}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <View style={[styles.settingRow, !biometricsAvailable && styles.disabledRow]}>
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: theme.surfaceElement }]}>
                  <Scan color={theme.textPrimary} size={20} variant="Outline" />
                </View>
                <View>
                  <Text style={[styles.settingLabel, { color: theme.textPrimary }]} weight="medium">
                    {t('profile.biometricLabel')}
                  </Text>
                  <Text style={[styles.settingSub, { color: theme.textMuted }]}>
                    {biometricDescription}
                  </Text>
                </View>
              </View>
              <Switch
                disabled={!biometricsAvailable}
                value={biometricsEnabled}
                onValueChange={handleBiometricToggle}
                trackColor={{ false: theme.border, true: theme.primary }}
                thumbColor={isDark ? theme.softLime : white}
              />
            </View>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.settingRow}
              onPress={() => router.push('/change-password')}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: theme.surfaceElement }]}>
                  <Lock color={theme.textPrimary} size={20} variant="Outline" />
                </View>
                <View>
                  <Text style={[styles.settingLabel, { color: theme.textPrimary }]} weight="medium">
                    Ubah Kata Sandi
                  </Text>
                  <Text style={[styles.settingSub, { color: theme.textMuted }]}>
                    Verifikasi dan perbarui kata sandi akun
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {pinSet ? (
              <>
                <View style={[styles.divider, { backgroundColor: theme.border }]} />
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.settingRow}
                  onPress={() => router.push({ pathname: '/setup-pin', params: { mode: 'change' } })}
                >
                  <View style={styles.settingLeft}>
                    <View style={[styles.iconContainer, { backgroundColor: theme.surfaceElement }]}>
                      <Lock color={theme.textPrimary} size={20} variant="Bold" />
                    </View>
                    <View>
                      <Text style={[styles.settingLabel, { color: theme.textPrimary }]} weight="medium">
                        {t('profile.changePinLabel')}
                      </Text>
                      <Text style={[styles.settingSub, { color: theme.textMuted }]}>
                        {t('profile.changePinDescription')}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              </>
            ) : null}
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(150).duration(350)}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]} weight="semibold">
              {t('profile.sectionPreferences')}
            </Text>
          </View>
          <Card variant="default" style={styles.settingsCard}>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: theme.surfaceElement }]}>
                  <Global color={theme.textPrimary} size={20} variant="Outline" />
                </View>
                <View>
                  <Text style={[styles.settingLabel, { color: theme.textPrimary }]} weight="medium">
                    {t('profile.timezoneLabel')}
                  </Text>
                  <Text style={[styles.settingSub, { color: theme.textMuted }]}>
                    {t('profile.timezoneDescription')}
                  </Text>
                </View>
              </View>
              <Text style={[styles.settingValue, { color: theme.textSecondary }]} weight="semibold">
                {localTimezone}
              </Text>
            </View>

            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.settingRow}
              onPress={() => setLanguageSheetVisible(true)}
            >
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: theme.surfaceElement }]}>
                  <Global color={theme.primary} size={20} variant="Bold" />
                </View>
                <View>
                  <Text style={[styles.settingLabel, { color: theme.textPrimary }]} weight="medium">
                    {t('profile.languageLabel')}
                  </Text>
                  <Text style={[styles.settingSub, { color: theme.textMuted }]}>
                    {t('profile.languageDescription')}
                  </Text>
                </View>
              </View>
              <Text style={[styles.settingValue, { color: theme.primary }]} weight="semibold">
                {language === 'id' ? t('profile.languageIndonesian') : t('profile.languageEnglish')}
              </Text>
            </TouchableOpacity>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(200).duration(350)}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.textSecondary }]} weight="semibold">
              {t('profile.sectionData')}
            </Text>
          </View>
          <Card variant="default" style={styles.settingsCard}>
            <TouchableOpacity activeOpacity={0.7} style={styles.settingRow} onPress={handleResetData}>
              <View style={styles.settingLeft}>
                <View style={[styles.iconContainer, { backgroundColor: theme.expenseSurface }]}>
                  <Trash color={theme.expense} size={20} variant="Outline" />
                </View>
                <View>
                  <Text style={[styles.settingLabel, { color: theme.expense }]} weight="medium">
                    {t('profile.resetLabel')}
                  </Text>
                  <Text style={[styles.settingSub, { color: theme.textMuted }]}>
                    {t('profile.resetDescription')}
                  </Text>
                </View>
              </View>
              <Text style={[styles.actionLink, { color: theme.expense }]} weight="semibold">
                {t('common.reset')}
              </Text>
            </TouchableOpacity>
          </Card>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(250).duration(350)} style={styles.logoutWrapper}>
          <Button
            title={t('profile.logoutLabel')}
            variant="outline"
            size="large"
            icon={<Logout color={theme.textPrimary} size={20} variant="Outline" />}
            style={[styles.logoutBtn, { borderColor: theme.border }]}
            onPress={handleLogout}
          />
          <Text style={[styles.versionText, { color: theme.textMuted }]}>{versionText}</Text>
        </Animated.View>

        <ConfirmationModal
          visible={confirmation.action !== null}
          title={confirmation.title}
          message={confirmation.message}
          cancelLabel={t('common.cancel')}
          confirmLabel={confirmation.confirmLabel}
          destructive={confirmation.destructive}
          busy={confirmation.busy}
          error={confirmation.error}
          onCancel={closeConfirmation}
          onConfirm={confirmAction}
        />

        <StatusModal
          visible={statusModal.visible}
          type={statusModal.type}
          title={statusModal.title}
          message={statusModal.message}
          buttonText={t('common.understand')}
          onConfirm={closeStatusModal}
        />

        <LanguageBottomSheet
          visible={languageSheetVisible}
          onClose={() => setLanguageSheetVisible(false)}
        />
      </KeyboardAwareScrollView>
  );
}

const styles =    StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 130,
    gap: 16,
  },
  headerRow: {
    marginBottom: 8,
  },
  screenTitle: {
    fontSize: 26,
    lineHeight: 34,
  },
  profileCard: {
    padding: 20,
    borderRadius: 24,
  },
  spinner: {
    paddingVertical: 12,
  },
  profileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarTouchable: {
    position: 'relative',
    width: 64,
    height: 64,
  },
  avatarImage: {
    width: 64,
    height: 64,
    borderRadius: 32,
  },
  cameraBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 22,
  },
  profileDetails: {
    flex: 1,
    gap: 2,
  },
  profileName: {
    fontSize: 18,
  },
  profileEmail: {
    fontSize: 13,
  },
  syncBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  syncDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  syncText: {
    fontSize: 11,
    fontWeight: '600',
  },
  sectionHeader: {
    marginTop: 8,
    marginBottom: 6,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  settingsCard: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 24,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  disabledRow: {
    opacity: 0.5,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  iconContainer: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingLabel: {
    fontSize: 14,
  },
  settingSub: {
    fontSize: 11,
    marginTop: 2,
    maxWidth: 220,
    lineHeight: 15,
  },
  settingValue: {
    fontSize: 13,
  },
  actionLink: {
    fontSize: 13,
  },
  divider: {
    height: 1,
    width: '100%',
  },
  logoutWrapper: {
    marginTop: 24,
    alignItems: 'center',
    gap: 12,
  },
  logoutBtn: {
    width: '100%',
  },
  versionText: {
    fontSize: 11,
    marginTop: 4,
  },
});
