import React from 'react';
import {
  ActivityIndicator,
  LayoutChangeEvent,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Lock, Sms, User } from 'iconsax-react-native';

import { ScreenWrapper } from '@/components/common/screen-wrapper';
import { Input } from '@/components/ui/input';
import { StatusModal } from '@/components/ui/status-modal';
import { Text } from '@/components/ui/text';
import { t } from '@/core/i18n/strings';
import { getTheme } from '@/core/theme/colors';
import { useAuthForm } from '@/features/auth/hooks/use-auth-form';

interface AuthScreenProps {
  initialMode?: 'login' | 'register';
  onAuthSuccess?: () => void;
  onRegisterSuccess?: () => void;
}

export function AuthScreen({
  initialMode = 'login',
  onAuthSuccess,
  onRegisterSuccess,
}: AuthScreenProps) {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);
  const isDark = colorScheme === 'dark';
  const {
    mode,
    setMode,
    name,
    email,
    password,
    loading,
    googleLoading,
    modalState,
    setName,
    setEmail,
    setPassword,
    closeModal,
    handleAction,
    handleGoogleSignIn,
  } = useAuthForm({ initialMode, onAuthSuccess, onRegisterSuccess });

  const tabContainerWidth = useSharedValue(0);
  const tabProgress = useSharedValue(initialMode === 'login' ? 0 : 1);
  const formOpacity = useSharedValue(1);
  const formTranslateX = useSharedValue(0);

  const titleText = mode === 'login' ? t('auth.welcomeBack') : t('auth.createAccount');
  const subtitleText = mode === 'login' ? t('auth.loginSubtitle') : t('auth.registerSubtitle');
  const submitText = mode === 'login' ? t('auth.tabLogin') : t('auth.tabRegister');
  const tabSurfaceColor = isDark ? theme.surfaceMuted : theme.surfaceButton;
  const socialSurfaceColor = isDark ? theme.surfaceMuted : theme.surfaceButton;

  const switchTab = (targetMode: 'login' | 'register') => {
    if (mode === targetMode) {
      return;
    }

    const isLogin = targetMode === 'login';

    tabProgress.value = withSpring(isLogin ? 0 : 1, {
      damping: 18,
      stiffness: 160,
      mass: 0.8,
    });

    formOpacity.value = 0;
    formTranslateX.value = isLogin ? -20 : 20;

    setMode(targetMode);

    formOpacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.quad) });
    formTranslateX.value = withSpring(0, { damping: 18, stiffness: 140 });
  };

  const activePillStyle = useAnimatedStyle(() => {
    const halfWidth = (tabContainerWidth.value - 8) / 2;
    return {
      width: halfWidth > 0 ? halfWidth : '50%',
      transform: [{ translateX: tabProgress.value * (halfWidth > 0 ? halfWidth : 160) }],
    };
  });

  const formAnimatedStyle = useAnimatedStyle(() => ({
    opacity: formOpacity.value,
    transform: [{ translateX: formTranslateX.value }],
  }));

  const onTabContainerLayout = (event: LayoutChangeEvent) => {
    tabContainerWidth.value = event.nativeEvent.layout.width;
  };

  return (
    <ScreenWrapper withSafeArea style={{ backgroundColor: theme.background }}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContent}
        enableOnAndroid
        extraScrollHeight={Platform.OS === 'ios' ? 20 : 40}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topNavRow}>
          <Image
            contentFit="contain"
            source={require('@/assets/images/Logo-Catat.png')}
            style={styles.topLogo}
          />
        </View>

        <Animated.View style={[styles.titleSection, formAnimatedStyle]}>
          <Text style={[styles.mainTitle, { color: theme.textPrimary }]}>{titleText}</Text>
          <Text style={[styles.subTitle, { color: theme.textMuted }]}>{subtitleText}</Text>
        </Animated.View>

        <View
          onLayout={onTabContainerLayout}
          style={[styles.tabSegmentBg, { backgroundColor: tabSurfaceColor }]}
        >
          <Animated.View
            style={[
              styles.slidingActivePill,
              { backgroundColor: theme.primary, shadowColor: theme.primary },
              activePillStyle,
            ]}
          />

          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.tabPillButton}
            onPress={() => switchTab('login')}
          >
            <Text
              style={[
                styles.tabLabel,
                {
                  color: mode === 'login' ? theme.onPrimary : theme.textMuted,
                  fontWeight: mode === 'login' ? '700' : '500',
                },
              ]}
            >
              {t('auth.tabLogin')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.tabPillButton}
            onPress={() => switchTab('register')}
          >
            <Text
              style={[
                styles.tabLabel,
                {
                  color: mode === 'register' ? theme.onPrimary : theme.textMuted,
                  fontWeight: mode === 'register' ? '700' : '500',
                },
              ]}
            >
              {t('auth.tabRegister')}
            </Text>
          </TouchableOpacity>
        </View>

        <Animated.View style={[styles.formFieldsGap, formAnimatedStyle]}>
          {mode === 'register' ? (
            <Input
              autoCapitalize="words"
              label={t('auth.fullNameLabel')}
              leftIcon={<User color={theme.textMuted} size={20} variant="Outline" />}
              placeholder={t('auth.fullNamePlaceholder')}
              value={name}
              onChangeText={setName}
            />
          ) : null}

          <Input
            autoCapitalize="none"
            keyboardType="email-address"
            label={t('auth.emailLabel')}
            leftIcon={<Sms color={theme.textMuted} size={20} variant="Outline" />}
            placeholder={t('auth.emailPlaceholder')}
            value={email}
            onChangeText={setEmail}
          />

          <Input
            isPassword
            label={t('auth.passwordLabel')}
            leftIcon={<Lock color={theme.textMuted} size={20} variant="Outline" />}
            placeholder="••••••••"
            value={password}
            onChangeText={setPassword}
          />

          {mode === 'login' ? (
            <View style={styles.rememberForgotRow}>
              <TouchableOpacity activeOpacity={0.7} onPress={() => router.push('/forgot-password')}>

                <Text style={[styles.forgotLabel, { color: theme.expense }]}>
                  {t('auth.forgotPassword')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <TouchableOpacity
            activeOpacity={0.88}
            disabled={loading}
            style={[
              styles.mainSubmitBtn,
              { backgroundColor: theme.primary, opacity: loading ? 0.8 : 1, shadowColor: theme.primary },
            ]}
            onPress={handleAction}
          >
            {loading ? (
              <ActivityIndicator color={theme.onPrimary} size="small" />
            ) : (
              <Text style={[styles.mainSubmitBtnText, { color: theme.onPrimary }]}>{submitText}</Text>
            )}
          </TouchableOpacity>

          <View style={styles.dividerBox}>
            <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
            <Text style={[styles.dividerLabel, { color: theme.textMuted }]}>{t('auth.socialDivider')}</Text>
            <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
          </View>

          <TouchableOpacity
            accessibilityLabel={t('auth.socialGoogleAccessibility')}
            activeOpacity={0.8}
            disabled={loading || googleLoading}
            onPress={handleGoogleSignIn}
            style={[styles.googleFullPillBtn, { backgroundColor: socialSurfaceColor, opacity: loading || googleLoading ? 0.7 : 1 }]}
          >
            {googleLoading ? (
              <ActivityIndicator color={theme.textPrimary} size="small" />
            ) : (
              <Image
                contentFit="contain"
                source={require('@/assets/images/google_icon.png')}
                style={styles.socialIcon}
              />
            )}
            <Text style={[styles.socialBtnText, { color: theme.textPrimary }]}>
              {t('auth.socialGoogle')}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      </KeyboardAwareScrollView>

      <StatusModal
        visible={modalState.visible}
        type={modalState.type}
        title={modalState.title}
        message={modalState.message}
        buttonText={modalState.buttonText}
        onConfirm={modalState.onConfirm}
        onClose={closeModal}
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
  topNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginBottom: 24,
  },
  topLogo: {
    width: 64,
    height: 64,
  },
  titleSection: {
    marginBottom: 24,
    gap: 8,
  },
  mainTitle: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  subTitle: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '400',
  },
  tabSegmentBg: {
    flexDirection: 'row',
    borderRadius: 100,
    padding: 4,
    marginBottom: 20,
    position: 'relative',
    height: 52,
    alignItems: 'center',
  },
  slidingActivePill: {
    position: 'absolute',
    left: 4,
    top: 4,
    bottom: 4,
    borderRadius: 100,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  tabPillButton: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 100,
    zIndex: 2,
  },
  tabLabel: {
    fontSize: 15,
  },
  formFieldsGap: {
    gap: 16,
  },
  rememberForgotRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginVertical: 4,
  },
  forgotLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  mainSubmitBtn: {
    height: 54,
    borderRadius: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  mainSubmitBtnText: {
    fontSize: 16,
    fontWeight: '700',
  },
  dividerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 8,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  googleFullPillBtn: {
    width: '100%',
    height: 50,
    borderRadius: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  socialIcon: {
    width: 20,
    height: 20,
  },
  socialBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
