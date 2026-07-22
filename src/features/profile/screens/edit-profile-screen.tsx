import { Text } from '@/components/ui/text';
import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  useColorScheme,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { ArrowLeft, User, Sms } from 'iconsax-react-native';
import { router } from 'expo-router';

import { ScreenWrapper } from '@/components/common/screen-wrapper';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusModal } from '@/components/ui/status-modal';
import { getTheme } from '@/core/theme/colors';
import { supabase } from '@/core/lib/supabase';

export function EditProfileScreen() {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');

  const [statusModal, setStatusModal] = useState<{
    visible: boolean;
    type: 'success' | 'error';
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    visible: false,
    type: 'success',
    title: '',
    message: '',
    onConfirm: () => {},
  });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setFullName(user.user_metadata?.full_name || '');
          setEmail(user.email || '');
        }
      } catch (err) {
        console.error('Error fetching user for edit:', err);
      } finally {
        setFetching(false);
      }
    };
    fetchUser();
  }, []);

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('Input Tidak Lengkap', 'Nama lengkap wajib diisi.');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: fullName.trim() },
      });

      if (error) {
        setStatusModal({
          visible: true,
          type: 'error',
          title: 'Gagal Memperbarui',
          message: error.message || 'Terjadi kesalahan saat menyimpan profil Anda.',
          onConfirm: () => setStatusModal(prev => ({ ...prev, visible: false })),
        });
      } else {
        setStatusModal({
          visible: true,
          type: 'success',
          title: 'Profil Diperbarui',
          message: 'Nama lengkap profil Anda telah berhasil diubah.',
          onConfirm: () => {
            setStatusModal(prev => ({ ...prev, visible: false }));
            router.back();
          },
        });
      }
    } catch (err: any) {
      setStatusModal({
        visible: true,
        type: 'error',
        title: 'Error',
        message: err.message || 'Terjadi kesalahan sistem.',
        onConfirm: () => setStatusModal(prev => ({ ...prev, visible: false })),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenWrapper withSafeArea style={{ backgroundColor: theme.surfaceHighlight }}>
      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContent}
        enableOnAndroid
        extraScrollHeight={Platform.OS === 'ios' ? 20 : 40}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Back Button */}
        <TouchableOpacity
          activeOpacity={0.7}
          style={[styles.backBtn, { borderColor: theme.border }]}
          onPress={() => router.back()}
        >
          <ArrowLeft color={theme.textPrimary} size={22} variant="Outline" />
        </TouchableOpacity>

        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={[styles.title, { color: theme.textPrimary }]} weight="bold">
            Edit Profil
          </Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>
            Perbarui data diri Anda yang terhubung dengan cloud
          </Text>
        </View>

        {fetching ? (
          <ActivityIndicator color={theme.primary} size="large" style={styles.loader} />
        ) : (
          <Card variant="default" style={styles.formCard}>
            <View style={styles.form}>
              {/* Full Name Input */}
              <Input
                label="Nama Lengkap"
                placeholder="Masukkan nama lengkap Anda"
                leftIcon={<User color={theme.textMuted} size={20} variant="Outline" />}
                value={fullName}
                onChangeText={setFullName}
                autoCapitalize="words"
              />

              {/* Email (Read-Only) */}
              <Input
                editable={false}
                label="Alamat Email (Tidak dapat diubah)"
                placeholder="email@domain.com"
                leftIcon={<Sms color={theme.textMuted} size={20} variant="Outline" />}
                value={email}
                onChangeText={() => {}}
                style={styles.disabledInput}
              />

              {/* Save Button */}
              <Button
                title={loading ? 'Menyimpan...' : 'Simpan Perubahan'}
                disabled={loading}
                variant="primary"
                size="large"
                onPress={handleSave}
                style={styles.saveBtn}
              />
            </View>
          </Card>
        )}

        {/* Status Feedback */}
        <StatusModal
          visible={statusModal.visible}
          type={statusModal.type}
          title={statusModal.title}
          message={statusModal.message}
          buttonText="Lanjutkan"
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
