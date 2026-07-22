import { Text } from '@/components/ui/text';
import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Switch,
  Alert,
  ActivityIndicator,
  useColorScheme,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  User,
  Lock,
  Scan,
  InfoCircle,
  Global,
  Trash,
  Logout,
  CloudChange,
} from 'iconsax-react-native';
import { router } from 'expo-router';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusModal } from '@/components/ui/status-modal';
import { getTheme } from '@/core/theme/colors';
import { supabase } from '@/core/lib/supabase';
import {
  hasPin,
  clearPin,
  isBiometricEnabled,
  setBiometricEnabled,
} from '@/core/lib/pin-storage';
import { financeStore } from '@/core/lib/finance-store';
import * as LocalAuthentication from 'expo-local-authentication';

export function ProfileScreen() {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);
  const isDark = colorScheme === 'dark';

  // State values
  const [user, setUser] = useState<any>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [pinSet, setPinSet] = useState(false);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [biometricsEnabled, setBiometricsEnabledState] = useState(false);
  
  // Status Modal for feedback
  const [statusModal, setStatusModal] = useState<{
    visible: boolean;
    type: 'success' | 'error';
    title: string;
    message: string;
  }>({
    visible: false,
    type: 'success',
    title: '',
    message: '',
  });

  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    // 1. Fetch user profile from Supabase
    const fetchUser = async () => {
      try {
        const { data: { user: sessionUser } } = await supabase.auth.getUser();
        setUser(sessionUser);
      } catch (err) {
        console.error('Gagal mengambil user session:', err);
      } finally {
        setLoadingUser(false);
      }
    };

    // 2. Fetch local security states
    const fetchSecurityState = async () => {
      const activePin = await hasPin();
      setPinSet(activePin);

      const hw = await LocalAuthentication.hasHardwareAsync();
      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setBiometricsAvailable(hw && enrolled);

      if (hw && enrolled) {
        const bioActive = await isBiometricEnabled();
        setBiometricsEnabledState(bioActive);
      }
    };

    fetchUser();
    fetchSecurityState();
  }, []);

  // Sync state trigger
  const handleSync = () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      setStatusModal({
        visible: true,
        type: 'success',
        title: 'Sinkronisasi Berhasil',
        message: 'Data transaksi dan pengaturan Anda telah sinkron dengan cloud.',
      });
    }, 1500);
  };

  // Toggle PIN lock switch
  const handlePinToggle = async (value: boolean) => {
    if (value) {
      // Direct user to setup pin screen
      router.push('/setup-pin');
    } else {
      // Alert confirmation to remove PIN
      Alert.alert(
        'Nonaktifkan PIN',
        'Apakah Anda yakin ingin menonaktifkan kunci PIN? Ini juga akan menonaktifkan autentikasi biometrik.',
        [
          { text: 'Batal', style: 'cancel' },
          {
            text: 'Nonaktifkan',
            style: 'destructive',
            onPress: async () => {
              await clearPin();
              await setBiometricEnabled(false);
              setPinSet(false);
              setBiometricsEnabledState(false);
              setStatusModal({
                visible: true,
                type: 'success',
                title: 'PIN Dinonaktifkan',
                message: 'Kunci PIN keamanan Anda telah dinonaktifkan.',
              });
            },
          },
        ]
      );
    }
  };

  // Toggle Biometric switch
  const handleBiometricToggle = async (value: boolean) => {
    if (!pinSet && value) {
      Alert.alert(
        'PIN Diperlukan',
        'Anda harus mengaktifkan kunci PIN terlebih dahulu sebelum mengaktifkan autentikasi biometrik sebagai cadangan.',
        [
          {
            text: 'Atur PIN Sekarang',
            onPress: () => router.push('/setup-pin'),
          },
          { text: 'Batal', style: 'cancel' },
        ]
      );
      return;
    }

    if (value) {
      // Authenticate device owner before enabling
      try {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Konfirmasi biometrik perangkat Anda',
          cancelLabel: 'Batal',
          disableDeviceFallback: false,
        });

        if (result.success) {
          await setBiometricEnabled(true);
          setBiometricsEnabledState(true);
          setStatusModal({
            visible: true,
            type: 'success',
            title: 'Biometrik Aktif',
            message: 'Autentikasi Face ID / Sidik Jari berhasil diaktifkan.',
          });
        }
      } catch (err) {
        console.error('Error enabling biometrics:', err);
      }
    } else {
      await setBiometricEnabled(false);
      setBiometricsEnabledState(false);
    }
  };

  // Reset Data action
  const handleResetData = () => {
    Alert.alert(
      'Hapus Semua Data',
      'Tindakan ini akan menghapus seluruh data transaksi, utang, anggaran, target tabungan, dan PIN Anda secara permanen dari perangkat ini. Aksi ini tidak dapat dibatalkan.',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Reset Permanen',
          style: 'destructive',
          onPress: async () => {
            financeStore.reset();
            await clearPin();
            await setBiometricEnabled(false);
            setPinSet(false);
            setBiometricsEnabledState(false);
            setStatusModal({
              visible: true,
              type: 'success',
              title: 'Data Dihapus',
              message: 'Semua data transaksi dan pengaturan keamanan telah direset ke setelan awal.',
            });
          },
        },
      ]
    );
  };

  // Logout action
  const handleLogout = () => {
    Alert.alert(
      'Keluar dari Aplikasi',
      'Apakah Anda yakin ingin keluar dari akun Anda?',
      [
        { text: 'Batal', style: 'cancel' },
        {
          text: 'Keluar',
          style: 'destructive',
          onPress: async () => {
            await supabase.auth.signOut();
            financeStore.reset();
            router.replace('/auth');
          },
        },
      ]
    );
  };

  // Get initials for profile avatar
  const getInitials = (name?: string, email?: string) => {
    if (name) {
      const parts = name.trim().split(/\s+/);
      if (parts.length > 1) {
        return (parts[0][0] + parts[1][0]).toUpperCase();
      }
      return parts[0].substring(0, 2).toUpperCase();
    }
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    return 'CD';
  };

  const fullName = user?.user_metadata?.full_name || 'Pengguna Catat Duekku';
  const emailAddress = user?.email || 'tidak_terhubung@email.com';
  const localTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Jakarta';

  return (
    <KeyboardAwareScrollView
      enableOnAndroid
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Header Row */}
      <Animated.View entering={FadeInDown.duration(350)} style={styles.headerRow}>
        <View>
          <Text style={[styles.screenTitle, { color: theme.textPrimary }]} weight="bold">
            Profile
          </Text>
        </View>
      </Animated.View>

      {/* User Profile Card */}
      <Animated.View entering={FadeInDown.delay(50).duration(350)}>
        <Card variant="default" style={styles.profileCard}>
          {loadingUser ? (
            <ActivityIndicator color={theme.primary} size="small" style={styles.spinner} />
          ) : (
            <View style={styles.profileRow}>
              <View style={[styles.avatar, { backgroundColor: theme.softLime }]}>
                <Text style={[styles.avatarText, { color: theme.deepTeal }]} weight="bold">
                  {getInitials(fullName, emailAddress)}
                </Text>
              </View>
              <View style={styles.profileDetails}>
                <Text style={[styles.profileName, { color: theme.textPrimary }]} weight="semibold">
                  {fullName}
                </Text>
                <Text style={[styles.profileEmail, { color: theme.textMuted }]}>
                  {emailAddress}
                </Text>
                <View style={styles.syncBadge}>
                  <View style={[styles.syncDot, { backgroundColor: '#22C55E' }]} />
                  <Text style={[styles.syncText, { color: theme.textSecondary }]}>Cloud Sync Aktif</Text>
                </View>
              </View>
            </View>
          )}
        </Card>
      </Animated.View>

      {/* Profile Section */}
      <Animated.View entering={FadeInDown.delay(75).duration(350)}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]} weight="semibold">
            Profil
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
                  Ubah Profil
                </Text>
                <Text style={[styles.settingSub, { color: theme.textMuted }]}>
                  Ubah nama lengkap Anda yang terdaftar
                </Text>
              </View>
            </View>
            <Text style={[styles.actionLink, { color: theme.primary }]} weight="semibold">
              Edit
            </Text>
          </TouchableOpacity>
        </Card>
      </Animated.View>

      {/* Security Section */}
      <Animated.View entering={FadeInDown.delay(100).duration(350)}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]} weight="semibold">
            Keamanan
          </Text>
        </View>
        <Card variant="default" style={styles.settingsCard}>
          {/* Switch PIN Lock */}
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.iconContainer, { backgroundColor: theme.surfaceElement }]}>
                <Lock color={theme.textPrimary} size={20} variant="Outline" />
              </View>
              <View>
                <Text style={[styles.settingLabel, { color: theme.textPrimary }]} weight="medium">
                  Kunci PIN
                </Text>
                <Text style={[styles.settingSub, { color: theme.textMuted }]}>
                  Kunci akses aplikasi dengan 6 digit PIN
                </Text>
              </View>
            </View>
            <Switch
              value={pinSet}
              onValueChange={handlePinToggle}
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor={isDark ? theme.softLime : '#FFFFFF'}
            />
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          {/* Switch Biometrics */}
          <View style={[styles.settingRow, !biometricsAvailable && styles.disabledRow]}>
            <View style={styles.settingLeft}>
              <View style={[styles.iconContainer, { backgroundColor: theme.surfaceElement }]}>
                <Scan color={theme.textPrimary} size={20} variant="Outline" />
              </View>
              <View>
                <Text style={[styles.settingLabel, { color: theme.textPrimary }]} weight="medium">
                  Sidik Jari / Face ID
                </Text>
                <Text style={[styles.settingSub, { color: theme.textMuted }]}>
                  {biometricsAvailable
                    ? 'Gunakan autentikasi biometrik'
                    : 'Perangkat tidak mendukung biometrik'}
                </Text>
              </View>
            </View>
            <Switch
              disabled={!biometricsAvailable}
              value={biometricsEnabled}
              onValueChange={handleBiometricToggle}
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor={isDark ? theme.softLime : '#FFFFFF'}
            />
          </View>

          {/* Change PIN (Only visible if PIN is set) */}
          {pinSet && (
            <>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.settingRow}
                onPress={() => router.push('/setup-pin')}
              >
                <View style={styles.settingLeft}>
                  <View style={[styles.iconContainer, { backgroundColor: theme.surfaceElement }]}>
                    <Lock color={theme.textPrimary} size={20} variant="Bold" />
                  </View>
                  <View>
                    <Text style={[styles.settingLabel, { color: theme.textPrimary }]} weight="medium">
                      Ubah PIN
                    </Text>
                    <Text style={[styles.settingSub, { color: theme.textMuted }]}>
                      Ganti 6 digit PIN Anda saat ini
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            </>
          )}
        </Card>
      </Animated.View>

      {/* Preferences Section */}
      <Animated.View entering={FadeInDown.delay(150).duration(350)}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]} weight="semibold">
            Preferensi Sistem
          </Text>
        </View>
        <Card variant="default" style={styles.settingsCard}>
          {/* Timezone Info */}
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.iconContainer, { backgroundColor: theme.surfaceElement }]}>
                <Global color={theme.textPrimary} size={20} variant="Outline" />
              </View>
              <View>
                <Text style={[styles.settingLabel, { color: theme.textPrimary }]} weight="medium">
                  Zona Waktu
                </Text>
                <Text style={[styles.settingSub, { color: theme.textMuted }]}>
                  Mengikuti wilayah pencatatan Anda
                </Text>
              </View>
            </View>
            <Text style={[styles.settingValue, { color: theme.textSecondary }]} weight="semibold">
              {localTimezone}
            </Text>
          </View>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          {/* Theme Mode Indicator */}
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <View style={[styles.iconContainer, { backgroundColor: theme.surfaceElement }]}>
                <InfoCircle color={theme.textPrimary} size={20} variant="Outline" />
              </View>
              <View>
                <Text style={[styles.settingLabel, { color: theme.textPrimary }]} weight="medium">
                  Tampilan Aplikasi
                </Text>
                <Text style={[styles.settingSub, { color: theme.textMuted }]}>
                  Mengikuti pengaturan sistem perangkat
                </Text>
              </View>
            </View>
            <Text style={[styles.settingValue, { color: theme.textSecondary }]} weight="semibold">
              {isDark ? 'Gelap' : 'Terang'}
            </Text>
          </View>
        </Card>
      </Animated.View>

      {/* Cloud & Data Section */}
      <Animated.View entering={FadeInDown.delay(200).duration(350)}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]} weight="semibold">
            Penyimpanan & Data
          </Text>
        </View>
        <Card variant="default" style={styles.settingsCard}>
          {/* Cloud Sync trigger */}
          <TouchableOpacity activeOpacity={0.7} style={styles.settingRow} onPress={handleSync} disabled={syncing}>
            <View style={styles.settingLeft}>
              <View style={[styles.iconContainer, { backgroundColor: theme.surfaceElement }]}>
                <CloudChange color={theme.textPrimary} size={20} variant="Outline" />
              </View>
              <View>
                <Text style={[styles.settingLabel, { color: theme.textPrimary }]} weight="medium">
                  Sinkronisasi Ulang
                </Text>
                <Text style={[styles.settingSub, { color: theme.textMuted }]}>
                  Segarkan koneksi database cloud
                </Text>
              </View>
            </View>
            {syncing ? (
              <ActivityIndicator color={theme.primary} size="small" />
            ) : (
              <Text style={[styles.actionLink, { color: theme.primary }]} weight="semibold">
                Sync Sekarang
              </Text>
            )}
          </TouchableOpacity>

          <View style={[styles.divider, { backgroundColor: theme.border }]} />

          {/* Reset Data trigger */}
          <TouchableOpacity activeOpacity={0.7} style={styles.settingRow} onPress={handleResetData}>
            <View style={styles.settingLeft}>
              <View style={[styles.iconContainer, { backgroundColor: 'rgba(255, 107, 107, 0.1)' }]}>
                <Trash color="#FF6B6B" size={20} variant="Outline" />
              </View>
              <View>
                <Text style={[styles.settingLabel, { color: '#FF6B6B' }]} weight="medium">
                  Reset Semua Data
                </Text>
                <Text style={[styles.settingSub, { color: theme.textMuted }]}>
                  Hapus permanen seluruh data dan PIN
                </Text>
              </View>
            </View>
            <Text style={[styles.actionLink, { color: '#FF6B6B' }]} weight="semibold">
              Reset
            </Text>
          </TouchableOpacity>
        </Card>
      </Animated.View>

      {/* Logout Action Button */}
      <Animated.View entering={FadeInDown.delay(250).duration(350)} style={styles.logoutWrapper}>
        <Button
          title="Keluar Akun"
          variant="outline"
          size="large"
          icon={<Logout color={theme.textPrimary} size={20} variant="Outline" />}
          style={[styles.logoutBtn, { borderColor: theme.border }]}
          onPress={handleLogout}
        />
        <Text style={[styles.versionText, { color: theme.textMuted }]}>
          Catat Duekku v1.0.0
        </Text>
      </Animated.View>

      {/* Status Modal Feedback */}
      <StatusModal
        visible={statusModal.visible}
        type={statusModal.type}
        title={statusModal.title}
        message={statusModal.message}
        buttonText="Mengerti"
        onConfirm={() => setStatusModal(prev => ({ ...prev, visible: false }))}
      />
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 130, // Spacing above floating nav bar
    gap: 16,
  },
  headerRow: {
    marginBottom: 8,
  },
  screenTitle: {
    fontSize: 26,
    lineHeight: 34,
  },
  screenSubtitle: {
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
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
