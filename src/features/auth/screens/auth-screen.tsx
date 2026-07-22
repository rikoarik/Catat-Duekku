import { Text } from '@/components/ui/text';
import React, { useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Platform, useColorScheme, Alert, LayoutChangeEvent, ActivityIndicator } from 'react-native';
;
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { Image } from 'expo-image';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Sms, Lock, User, TickSquare, FingerScan } from 'iconsax-react-native';
import { ScreenWrapper } from '@/components/common/screen-wrapper';
import { Input } from '@/components/ui/input';
import { StatusModal } from '@/components/ui/status-modal';
import { getTheme } from '@/core/theme/colors';
import { supabase } from '@/core/lib/supabase';
import * as LocalAuthentication from 'expo-local-authentication';
import { useEffect } from 'react';
import { router } from 'expo-router';

interface AuthScreenProps {
  initialMode?: 'login' | 'register';
  /** Called on successful login — typically navigates to /pin-lock */
  onAuthSuccess?: () => void;
  /** Called on successful register — typically navigates to /setup-pin */
  onRegisterSuccess?: () => void;
  /** Called on successful biometric login — skips PIN, goes directly to main */
  onBiometricSuccess?: () => void;
}

export function AuthScreen({
  initialMode = 'login',
  onAuthSuccess,
  onRegisterSuccess,
  onBiometricSuccess,
}: AuthScreenProps) {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);

  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  useEffect(() => {
    (async () => {
      const hw = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricAvailable(hw && enrolled);
    })();
  }, []);

  const handleBiometric = async () => {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Masuk ke Catat Duekku',
      cancelLabel: 'Batal',
      disableDeviceFallback: true,
    });
    if (result.success) {
      // Direct navigation to main dashboard
      if (onBiometricSuccess) {
        onBiometricSuccess();
      } else {
        router.replace('/(main)');
      }
    }
  };

  // Status Modal State
  const [modalState, setModalState] = useState<{
    visible: boolean;
    type: 'success' | 'error';
    title: string;
    message: string;
    buttonText?: string;
    onConfirm: () => void;
  }>({
    visible: false,
    type: 'success',
    title: '',
    message: '',
    onConfirm: () => {},
  });

  // Reanimated Shared Values for Tab Indicator & Form Motion
  const tabContainerWidth = useSharedValue(0);
  const tabProgress = useSharedValue(initialMode === 'login' ? 0 : 1);
  const formOpacity = useSharedValue(1);
  const formTranslateX = useSharedValue(0);

  const switchTab = (targetMode: 'login' | 'register') => {
    if (mode === targetMode) return;

    const isLogin = targetMode === 'login';

    // 1. Animate active tab indicator pill
    tabProgress.value = withSpring(isLogin ? 0 : 1, {
      damping: 18,
      stiffness: 160,
      mass: 0.8,
    });

    // 2. Animate form entrance (slide & fade motion)
    formOpacity.value = 0;
    formTranslateX.value = isLogin ? -20 : 20;

    setMode(targetMode);

    formOpacity.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.quad) });
    formTranslateX.value = withSpring(0, { damping: 18, stiffness: 140 });
  };

  const triggerModal = (
    type: 'success' | 'error',
    title: string,
    message: string,
    buttonText: string = 'Lanjutkan',
    onConfirmCallback?: () => void
  ) => {
    setModalState({
      visible: true,
      type,
      title,
      message,
      buttonText,
      onConfirm: () => {
        setModalState((prev) => ({ ...prev, visible: false }));
        onConfirmCallback?.();
      },
    });
  };

  const handleAction = async () => {
    if (!email || !password) {
      triggerModal(
        'error',
        'Input Belum Lengkap',
        'Email dan kata sandi wajib diisi.',
        'Coba Lagi'
      );
      return;
    }

    if (mode === 'register' && !name) {
      triggerModal(
        'error',
        'Input Belum Lengkap',
        'Nama lengkap wajib diisi.',
        'Coba Lagi'
      );
      return;
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          triggerModal(
            'error',
            'Gagal Masuk',
            error.message || 'Periksa kembali email dan kata sandi Anda.',
            'Coba Lagi'
          );
        } else if (data.session) {
          triggerModal(
            'success',
            'Berhasil Masuk!',
            'Selamat datang kembali di Catat Duekku.',
            'Masuk Aplikasi',
            () => onAuthSuccess?.()
          );
        }
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              full_name: name.trim(),
            },
          },
        });

        if (error) {
          triggerModal(
            'error',
            'Pendaftaran Gagal',
            error.message || 'Gagal membuat akun baru. Silakan coba lagi.',
            'Coba Lagi'
          );
        } else {
          triggerModal(
            'success',
            'Akun Berhasil Dibuat!',
            'Selamat datang! Akun Anda telah terdaftar.',
            'Lanjutkan',
            () => onRegisterSuccess?.() ?? onAuthSuccess?.()
          );
        }
      }
    } catch (err: any) {
      triggerModal(
        'error',
        'Terjadi Kesalahan',
        err.message || 'Terjadi kesalahan pada sistem.',
        'Mengerti'
      );
    } finally {
      setLoading(false);
    }
  };

  const isDark = colorScheme === 'dark';
  const pageBg = isDark ? theme.background : '#FFFFFF';

  // Animated style for active sliding tab pill
  const activePillStyle = useAnimatedStyle(() => {
    const halfWidth = (tabContainerWidth.value - 8) / 2;
    return {
      width: halfWidth > 0 ? halfWidth : '50%',
      transform: [
        {
          translateX: tabProgress.value * (halfWidth > 0 ? halfWidth : 160),
        },
      ],
    };
  });

  // Animated style for form transition
  const formAnimatedStyle = useAnimatedStyle(() => ({
    opacity: formOpacity.value,
    transform: [{ translateX: formTranslateX.value }],
  }));

  const onTabContainerLayout = (e: LayoutChangeEvent) => {
    tabContainerWidth.value = e.nativeEvent.layout.width;
  };

  return (
    <ScreenWrapper withSafeArea style={{ backgroundColor: pageBg }}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContent}
        enableOnAndroid={true}
        extraScrollHeight={Platform.OS === 'ios' ? 20 : 40}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
          
          {/* Top Header Row with Small Logo */}
          <View style={styles.topNavRow}>
            <Image
              contentFit="contain"
              source={require('@/assets/images/Logo-Catat.png')}
              style={styles.topLogo}
            />
          </View>

          {/* Animated Header Section */}
          <Animated.View style={[styles.titleSection, formAnimatedStyle]}>
            <Text style={[styles.mainTitle, { color: theme.textPrimary }]}>
              {mode === 'login' ? 'Selamat Datang,' : 'Buat Akun Baru'}
            </Text>
            <Text style={[styles.subTitle, { color: theme.textMuted }]}>
              {mode === 'login'
                ? 'Senang melihat Anda kembali. Masukkan email dan kata sandi Anda.'
                : 'Mulai perjalanan keuanganmu. Hanya membutuhkan waktu beberapa detik.'}
            </Text>
          </Animated.View>

          {/* Segmented Control Tab Switcher with Sliding Motion */}
          <View
            onLayout={onTabContainerLayout}
            style={[styles.tabSegmentBg, { backgroundColor: isDark ? theme.surfaceMuted : '#F4F5F7' }]}>
            
            {/* Sliding Active Pill */}
            <Animated.View
              style={[
                styles.slidingActivePill,
                { backgroundColor: theme.primary },
                activePillStyle,
              ]}
            />

            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.tabPillButton}
              onPress={() => switchTab('login')}>
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: mode === 'login' ? '#FFFFFF' : theme.textMuted,
                    fontWeight: mode === 'login' ? '700' : '500',
                  },
                ]}>
                Masuk
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.tabPillButton}
              onPress={() => switchTab('register')}>
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: mode === 'register' ? '#FFFFFF' : theme.textMuted,
                    fontWeight: mode === 'register' ? '700' : '500',
                  },
                ]}>
                Daftar
              </Text>
            </TouchableOpacity>
          </View>



          {/* Animated Form Fields */}
          <Animated.View style={[styles.formFieldsGap, formAnimatedStyle]}>
            {mode === 'register' && (
              <Input
                autoCapitalize="words"
                label="Nama Lengkap"
                leftIcon={<User color={theme.textMuted} size={20} variant="Outline" />}
                placeholder="Masukkan nama lengkap"
                value={name}
                onChangeText={setName}
              />
            )}

            <Input
              autoCapitalize="none"
              keyboardType="email-address"
              label="Alamat Email"
              leftIcon={<Sms color={theme.textMuted} size={20} variant="Outline" />}
              placeholder="nama@email.com"
              value={email}
              onChangeText={setEmail}
            />

            <Input
              isPassword
              label="Kata Sandi"
              leftIcon={<Lock color={theme.textMuted} size={20} variant="Outline" />}
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
            />

            {/* Login Options Row */}
            {mode === 'login' && (
              <View style={styles.rememberForgotRow}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.checkboxRow}
                  onPress={() => setRememberMe(!rememberMe)}>
                  <TickSquare
                    color={rememberMe ? theme.primary : theme.textMuted}
                    size={20}
                    variant={rememberMe ? 'Bold' : 'Outline'}
                  />
                  <Text style={[styles.rememberLabel, { color: theme.textMuted }]}>
                    Ingat saya
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity activeOpacity={0.7}>
                  <Text style={[styles.forgotLabel, { color: theme.expense }]}>
                    Lupa Kata Sandi?
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Main Action Button */}
            {mode === 'login' && biometricAvailable ? (
              <View style={styles.actionRow}>
                <TouchableOpacity
                  activeOpacity={0.88}
                  disabled={loading}
                  style={[
                    styles.mainSubmitBtn,
                    styles.actionRowBtn,
                    { backgroundColor: theme.primary, opacity: loading ? 0.8 : 1 },
                  ]}
                  onPress={handleAction}>
                  {loading ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <Text style={styles.mainSubmitBtnText}>Masuk</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.8}
                  style={[styles.biometricBtn, { backgroundColor: theme.primary }]}
                  onPress={handleBiometric}>
                  <FingerScan color={theme.onPrimary} size={34} variant="Broken" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                activeOpacity={0.88}
                disabled={loading}
                style={[
                  styles.mainSubmitBtn,
                  { backgroundColor: theme.primary, opacity: loading ? 0.8 : 1 },
                ]}
                onPress={handleAction}>
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.mainSubmitBtnText}>
                    {mode === 'login' ? 'Masuk' : 'Daftar'}
                  </Text>
                )}
              </TouchableOpacity>
            )}

            {/* Social Login Divider */}
            <View style={styles.dividerBox}>
              <View style={[styles.dividerLine, { backgroundColor: isDark ? theme.border : '#E5E7EB' }]} />
              <Text style={[styles.dividerLabel, { color: theme.textMuted }]}>
                Atau masuk dengan
              </Text>
              <View style={[styles.dividerLine, { backgroundColor: isDark ? theme.border : '#E5E7EB' }]} />
            </View>

            {/* Social Buttons */}
            <View style={styles.socialButtonsRow}>
              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.socialPillBtn, { backgroundColor: isDark ? theme.surfaceMuted : '#F4F5F7' }]}>
                <Image
                  contentFit="contain"
                  source={require('@/assets/images/google_icon.png')}
                  style={styles.socialIcon}
                />
                <Text style={[styles.socialBtnText, { color: theme.textPrimary }]}>
                  Google
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.socialPillBtn, { backgroundColor: isDark ? theme.surfaceMuted : '#F4F5F7' }]}>
                <Image
                  contentFit="contain"
                  source={require('@/assets/images/apple_icon.png')}
                  style={styles.socialIcon}
                />
                <Text style={[styles.socialBtnText, { color: theme.textPrimary }]}>
                  Apple
                </Text>
              </TouchableOpacity>
            </View>

            {/* Facebook Button */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={[styles.facebookPillBtn, { backgroundColor: isDark ? theme.surfaceMuted : '#F4F5F7' }]}>
              <Image
                contentFit="contain"
                source={require('@/assets/images/facebook_icon.png')}
                style={styles.socialIcon}
              />
              <Text style={[styles.socialBtnText, { color: theme.textPrimary }]}>
                Lanjutkan dengan Facebook
              </Text>
            </TouchableOpacity>

          </Animated.View>

      </KeyboardAwareScrollView>

      {/* Reusable Animated Status Modal (Berhasil / Gagal) */}
      <StatusModal
        visible={modalState.visible}
        type={modalState.type}
        title={modalState.title}
        message={modalState.message}
        buttonText={modalState.buttonText}
        onConfirm={modalState.onConfirm}
        onClose={() => setModalState((prev) => ({ ...prev, visible: false }))}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
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
    width: 44,
    height: 44,
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
    shadowColor: '#000',
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
  errorBox: {
    backgroundColor: '#FDECEC',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#FF8585',
  },
  errorText: {
    color: '#D65B5B',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
  },
  formFieldsGap: {
    gap: 16,
  },
  rememberForgotRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 4,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rememberLabel: {
    fontSize: 13,
    fontWeight: '500',
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
    shadowColor: '#0C3B3A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  actionRowBtn: {
    flex: 1,
    marginTop: 0,
  },
  biometricBtn: {
    width: 54,
    height: 54,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.15)'
  },
  mainSubmitBtnText: {
    color: '#FFFFFF',
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
  socialButtonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  socialPillBtn: {
    flex: 1,
    height: 50,
    borderRadius: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  facebookPillBtn: {
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
