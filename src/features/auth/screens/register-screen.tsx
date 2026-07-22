import { Text } from '@/components/ui/text';
import React, { useState } from 'react';
import { StyleSheet, View, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView, useColorScheme } from 'react-native';
;
import { Image } from 'expo-image';
import { Sms, Lock, TickSquare } from 'iconsax-react-native';
import { ScreenWrapper } from '@/components/common/screen-wrapper';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getTheme } from '@/core/theme/colors';

interface RegisterScreenProps {
  onRegisterSuccess?: () => void;
  onNavigateToLogin?: () => void;
}

export function RegisterScreen({
  onRegisterSuccess,
  onNavigateToLogin,
}: RegisterScreenProps) {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleRegister = () => {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onRegisterSuccess?.();
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
          {/* Header Brand Logo */}
          <View style={styles.header}>
            <Image
              contentFit="contain"
              source={require('@/assets/images/Logo-Catat.png')}
              style={styles.brandLogo}
            />
            <Text style={[styles.welcomeTitle, { color: theme.textPrimary }]}>
              Buat Akun Baru
            </Text>
            <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
              Catat cepat. Uang lebih jelas.
            </Text>
          </View>

          {/* Form Card */}
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

              <Input
                isPassword
                label="Konfirmasi Kata Sandi"
                leftIcon={<Lock color={theme.textMuted} size={20} variant="Outline" />}
                placeholder="••••••••"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
              />

              {/* Agree Terms Checkbox */}
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.agreeBtn}
                onPress={() => setAgreeTerms(!agreeTerms)}>
                <TickSquare
                  color={agreeTerms ? theme.primary : theme.textMuted}
                  size={20}
                  variant={agreeTerms ? 'Bold' : 'Outline'}
                />
                <Text style={[styles.agreeText, { color: theme.textSecondary }]}>
                  Saya setuju dengan Syarat & Ketentuan
                </Text>
              </TouchableOpacity>

              {/* Main Register Button */}
              <Button
                disabled={loading || !agreeTerms}
                size="large"
                title={loading ? 'Membuat Akun...' : 'Daftar Akun'}
                variant="primary"
                style={styles.registerBtn}
                onPress={handleRegister}
              />
            </View>
          </Card>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
            <Text style={[styles.dividerText, { color: theme.textMuted }]}>atau</Text>
            <View style={[styles.dividerLine, { backgroundColor: theme.border }]} />
          </View>

          {/* Social Buttons Row */}
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

          {/* Footer Login Navigation */}
          <View style={styles.footerRow}>
            <Text style={[styles.footerText, { color: theme.textSecondary }]}>
              Sudah punya akun?{' '}
            </Text>
            <TouchableOpacity activeOpacity={0.7} onPress={onNavigateToLogin}>
              <Text style={[styles.loginText, { color: theme.primary }]}>
                Masuk
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
    paddingTop: 32,
    paddingBottom: 24,
    justifyContent: 'center',
    gap: 16,
  },
  header: {
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  brandLogo: {
    width: 84,
    height: 84,
    marginBottom: 6,
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
    gap: 14,
  },
  agreeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  agreeText: {
    fontSize: 13,
    fontWeight: '500',
  },
  registerBtn: {
    marginTop: 6,
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
    marginTop: 8,
  },
  footerText: {
    fontSize: 14,
  },
  loginText: {
    fontSize: 14,
    fontWeight: '800',
  },
});
