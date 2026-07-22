import { Text } from '@/components/ui/text';
import React, { useState } from 'react';
import { StyleSheet, View, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, useColorScheme } from 'react-native';
;
import { Image } from 'expo-image';
import { Sms, Lock, TickSquare, Scan } from 'iconsax-react-native';
import { ScreenWrapper } from '@/components/common/screen-wrapper';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getTheme } from '@/core/theme/colors';
import * as LocalAuthentication from 'expo-local-authentication';
import { useEffect } from 'react';

interface LoginScreenProps {
  onLoginSuccess?: () => void;
  onNavigateToRegister?: () => void;
}

export function LoginScreen({
  onLoginSuccess,
  onNavigateToRegister,
}: LoginScreenProps) {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);

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
      onLoginSuccess?.();
    }
  };

  const handleLogin = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onLoginSuccess?.();
    }, 1200);
  };

  return (
    <ScreenWrapper bgVariant="background">
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* Header Brand Logo & Title */}
          <View style={styles.header}>
         
            <Text style={[styles.welcomeTitle, { color: theme.textPrimary }]}>
              Selamat Datang Kembali!
            </Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Catat cepat. Uang lebih jelas.
            </Text>
          </View>

          {/* White Form Card */}
          <Card style={styles.formCard} variant="default">
            <View style={styles.form}>
              <Input
                autoCapitalize="none"
                keyboardType="email-address"
                label="Email / No. HP"
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

              {/* Options Row */}
              <View style={styles.optionsRow}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  style={styles.rememberMeBtn}
                  onPress={() => setRememberMe(!rememberMe)}>
                  <TickSquare
                    color={rememberMe ? theme.primary : theme.textMuted}
                    size={20}
                    variant={rememberMe ? 'Bold' : 'Outline'}
                  />
                  <Text style={[styles.rememberText, { color: theme.textSecondary }]}>
                    Ingat Saya
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity activeOpacity={0.7}>
                  <Text style={[styles.forgotText, { color: theme.primary }]}>
                    Lupa Kata Sandi?
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Primary Action Button + Biometric */}
              <View style={styles.actionRow}>
                <View style={styles.loginBtnWrapper}>
                  <Button
                    disabled={loading}
                    size="large"
                    title={loading ? 'Memproses...' : 'Masuk'}
                    variant="primary"
                    style={styles.loginBtn}
                    onPress={handleLogin}
                  />
                </View>
                {biometricAvailable && (
                  <TouchableOpacity
                    activeOpacity={0.8}
                    style={[styles.biometricBtn, { backgroundColor: theme.surfaceMuted }]}
                    onPress={handleBiometric}>
                    <Scan color={theme.primary} size={24} variant="Outline" />
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </Card>

          {/* Social Divider */}
          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
            <Text style={[styles.dividerText, { color: theme.textMuted }]}>atau</Text>
            <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
          </View>

          {/* Social Buttons */}
          <View style={styles.socialRow}>
            <Button
              size="medium"
              style={styles.socialBtn}
              title="Google"
              variant="outline"
              onPress={() => {}}
            />
            <Button
              size="medium"
              style={styles.socialBtn}
              title="Apple"
              variant="outline"
              onPress={() => {}}
            />
          </View>

          {/* Footer Register Link */}
          <View style={styles.footerRow}>
            <Text style={[styles.footerText, { color: theme.textSecondary }]}>
              Belum punya akun?{' '}
            </Text>
            <TouchableOpacity activeOpacity={0.7} onPress={onNavigateToRegister}>
              <Text style={[styles.registerText, { color: theme.primary }]}>
                Daftar Sekarang
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 36,
    paddingBottom: 24,
    justifyContent: 'center',
    gap: 18,
  },
  header: {
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  brandLogo: {
    width: 90,
    height: 90,
    marginBottom: 8,
  },
  welcomeTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  formCard: {
    marginTop: 2,
  },
  form: {
    gap: 16,
  },
  optionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  rememberMeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  rememberText: {
    fontSize: 13,
    fontWeight: '500',
  },
  forgotText: {
    fontSize: 13,
    fontWeight: '700',
  },
  loginBtn: {
    marginTop: 6,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 6,
  },
  loginBtnWrapper: {
    flex: 1,
  },
  biometricBtn: {
    width: 54,
    height: 54,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginVertical: 2,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 13,
    fontWeight: '500',
  },
  socialRow: {
    flexDirection: 'row',
    gap: 12,
  },
  socialBtn: {
    flex: 1,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  footerText: {
    fontSize: 14,
  },
  registerText: {
    fontSize: 14,
    fontWeight: '800',
  },
});
