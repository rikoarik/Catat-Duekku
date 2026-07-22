import { Text } from '@/components/ui/text';
import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ActivityIndicator,
  useColorScheme,
  Alert,
  Dimensions,
  Image,
  Modal,
  Pressable,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
  Easing,
  FadeInDown,
  FadeInUp,
  ZoomIn,
} from 'react-native-reanimated';
import {
  ArrowLeft,
  Camera as CameraIcon,
  Gallery,
  Receipt2,
  Card as CardIcon,
  Category,
  Calendar,
  DocumentText,
  DollarCircle,
  Image as ImageIcon,
  Flash,
  FlashSlash,
  Refresh,
  Magicpen,
  CloseCircle,
  TickCircle,
  Scan,
  Setting4,
} from 'iconsax-react-native';
import { router } from 'expo-router';
import { CameraView, useCameraPermissions, FlashMode } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';

import { ScreenWrapper } from '@/components/common/screen-wrapper';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusModal } from '@/components/ui/status-modal';
import { getTheme } from '@/core/theme/colors';
import { financeStore } from '@/core/lib/finance-store';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const VIEWFINDER_HEIGHT = SCREEN_HEIGHT * 0.73; // Make camera taller without going full screen

interface MockReceipt {
  name: string;
  vendor: string;
  amount: number;
  category: string;
  accountName: string;
}

const MOCK_RECEIPTS: MockReceipt[] = [
  {
    name: 'Makan Harian (Warung Bu Edi)',
    vendor: 'Warung Nasi Bu Edi',
    amount: 45000,
    category: 'Makan & Harian',
    accountName: 'Cash',
  },
  {
    name: 'Bensin Pertamax (SPBU Menteng)',
    vendor: 'Pertamina SPBU 31.102',
    amount: 120000,
    category: 'Transportasi',
    accountName: 'Bank',
  },
  {
    name: 'Belanja Mingguan (Indomaret)',
    vendor: 'Indomaret Point Kemang',
    amount: 284500,
    category: 'Belanja',
    accountName: 'E-Wallet',
  },
];

type ScanState = 'camera' | 'scanning' | 'result';

export function ScanScreen() {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);

  // Camera hooks & state
  const cameraRef = useRef<any>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [flashMode, setFlashMode] = useState<FlashMode>('off');

  // UI state
  const [state, setState] = useState<ScanState>('camera');
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [selectedReceipt, setSelectedReceipt] = useState<MockReceipt | null>(null);

  // Auto-detection state & Target Lock simulation
  const [autoScanEnabled, setAutoScanEnabled] = useState(true);
  const [targetDetected, setTargetDetected] = useState(false);
  const [detectCountdown, setDetectCountdown] = useState(3);
  const autoScanTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Modal bottom sheet state for preset receipts
  const [presetModalVisible, setPresetModalVisible] = useState(false);

  // Result form state
  const [amount, setAmount] = useState('');
  const [vendor, setVendor] = useState('');
  const [category, setCategory] = useState('Makan & Harian');
  const [accountId, setAccountId] = useState('');
  const [note, setNote] = useState('');

  // Dropdowns
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showAccountPicker, setShowAccountPicker] = useState(false);

  // Status modal
  const [statusModal, setStatusModal] = useState({
    visible: false,
    type: 'success' as 'success' | 'error',
    title: '',
    message: '',
  });

  // Reanimated values for laser motion scan & lock ring
  const laserY = useSharedValue(0);
  const laserOpacity = useSharedValue(0.4);
  const lockScale = useSharedValue(0.9);

  // Motion laser scan animation loop
  useEffect(() => {
    laserY.value = withRepeat(
      withTiming(VIEWFINDER_HEIGHT - 30, {
        duration: 1800,
        easing: Easing.inOut(Easing.quad),
      }),
      -1,
      true
    );

    laserOpacity.value = withRepeat(
      withSequence(
        withTiming(0.95, { duration: 900 }),
        withTiming(0.4, { duration: 900 })
      ),
      -1,
      true
    );
  }, []);

  // Handle Auto-detection timer when camera is active
  const handleBarcodeScanned = (scanningResult: any) => {
    if (state === 'camera' && permission?.granted && autoScanEnabled && !targetDetected) {
      setTargetDetected(true);
      lockScale.value = withSequence(
        withTiming(1.15, { duration: 200 }),
        withTiming(1, { duration: 150 })
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Auto trigger snap after target lock countdown
      if (autoScanTimerRef.current) clearTimeout(autoScanTimerRef.current);
      autoScanTimerRef.current = setTimeout(() => {
        handleSnapPhoto(scanningResult.data);
      }, 1000);
    }
  };

  useEffect(() => {
    if (!autoScanEnabled || state !== 'camera') {
      setTargetDetected(false);
      if (autoScanTimerRef.current) clearTimeout(autoScanTimerRef.current);
    }
    return () => {
      if (autoScanTimerRef.current) clearTimeout(autoScanTimerRef.current);
    };
  }, [state, autoScanEnabled]);

  const animatedLaserStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: laserY.value }],
    opacity: laserOpacity.value,
  }));

  const animatedLockStyle = useAnimatedStyle(() => ({
    transform: [{ scale: lockScale.value }],
  }));

  // Accounts store
  const accounts = financeStore.getAccounts();
  useEffect(() => {
    if (accounts.length > 0 && !accountId) {
      setAccountId(accounts[0].id);
    }
  }, [accounts]);

  // Flash toggle
  const toggleFlash = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFlashMode((prev) => (prev === 'off' ? 'on' : 'off'));
  };

  // Toggle auto scan mode
  const toggleAutoScan = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAutoScanEnabled((prev) => !prev);
    setTargetDetected(false);
  };

  // Capture photo via custom CameraView
  const handleSnapPhoto = async (scannedData?: string) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setTargetDetected(false);

      if (cameraRef.current) {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.85,
          skipProcessing: true,
        });

        if (photo?.uri) {
          setCapturedUri(photo.uri);
          processScannedPhoto(photo.uri, scannedData ? `Deteksi Barcode AI` : 'Foto Kamera Live');
          return;
        }
      }

      processScannedPhoto(null, 'Simulasi Struk Auto-Detect');
    } catch (err: any) {
      console.log('Camera snap note:', err?.message);
      processScannedPhoto(null, 'Struk Terpindai');
    }
  };

  // Pick photo from Gallery
  const handlePickGallery = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Izin Galeri', 'Aplikasi membutuhkan akses galeri.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.85,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setCapturedUri(uri);
        processScannedPhoto(uri, 'Foto dari Galeri');
      }
    } catch (err: any) {
      Alert.alert('Error Galeri', err.message || 'Gagal membuka galeri.');
    }
  };

  // Start AI extraction simulation flow
  const processScannedPhoto = (uri: string | null, label: string) => {
    const mock = MOCK_RECEIPTS[Math.floor(Math.random() * MOCK_RECEIPTS.length)];
    setSelectedReceipt({
      ...mock,
      name: label,
    });
    setState('scanning');

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    setTimeout(() => {
      setAmount(mock.amount.toString());
      setVendor(mock.vendor);
      setCategory(mock.category);
      setNote(`Pindai AI: ${label}`);

      const matchedAcc = accounts.find(
        (a) => a.name.toLowerCase() === mock.accountName.toLowerCase()
      );
      setAccountId(matchedAcc ? matchedAcc.id : accounts[0]?.id || '');

      setState('result');
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    }, 2400);
  };

  // Quick simulate using presets from modal
  const handleSimulatePreset = (mock: MockReceipt) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPresetModalVisible(false);
    setCapturedUri(null);
    setSelectedReceipt(mock);
    setState('scanning');

    setTimeout(() => {
      setAmount(mock.amount.toString());
      setVendor(mock.vendor);
      setCategory(mock.category);
      setNote(`Pindai contoh: ${mock.vendor}`);

      const matchedAcc = accounts.find(
        (a) => a.name.toLowerCase() === mock.accountName.toLowerCase()
      );
      setAccountId(matchedAcc ? matchedAcc.id : accounts[0]?.id || '');

      setState('result');
    }, 2000);
  };

  // Save transaction to local store
  const handleSaveTransaction = () => {
    const parsedAmount = parseInt(amount.replace(/[^\d]/g, ''), 10);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Nominal Tidak Valid', 'Nominal pengeluaran harus lebih dari Rp 0.');
      return;
    }

    if (!accountId) {
      Alert.alert('Akun Belum Dipilih', 'Silakan pilih akun pembayaran.');
      return;
    }

    try {
      financeStore.recordTransaction({
        type: 'EXPENSE',
        amount: parsedAmount,
        accountId: accountId,
        categoryName: category,
        description: vendor.trim() || 'Struk Pemindaian AI',
        note: note.trim(),
      });

      setStatusModal({
        visible: true,
        type: 'success',
        title: 'Pengeluaran Dicatat!',
        message: `Nominal Rp ${parsedAmount.toLocaleString('id-ID')} berhasil tersimpan.`,
      });
    } catch (err: any) {
      Alert.alert('Gagal Menyimpan', err.message || 'Terjadi kesalahan sistem.');
    }
  };

  return (
    <ScreenWrapper withSafeArea style={{ backgroundColor: theme.background }}>
      {/* Header Bar */}
      <View style={styles.header}>
        <TouchableOpacity
          activeOpacity={0.7}
          style={[styles.backBtn, { borderColor: theme.border, backgroundColor: theme.surface }]}
          onPress={() => router.back()}
        >
          <ArrowLeft color={theme.textPrimary} size={22} variant="Outline" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]} weight="bold">
          Pindai Struk AI
        </Text>

        {/* Right Header Action Controls */}
        {state === 'camera' && permission?.granted && (
          <View style={styles.headerRightActions}>
            {/* Auto Detect Toggle */}
            <TouchableOpacity
              activeOpacity={0.7}
              style={[
                styles.iconBtn,
                {
                  borderColor: autoScanEnabled ? theme.primary : theme.border,
                  backgroundColor: autoScanEnabled ? theme.primary + '20' : theme.surface,
                },
              ]}
              onPress={toggleAutoScan}
            >
              <Scan color={autoScanEnabled ? theme.primary : theme.textMuted} size={20} variant={autoScanEnabled ? 'Bold' : 'Outline'} />
            </TouchableOpacity>

            {/* Flash Mode Toggle */}
            <TouchableOpacity
              activeOpacity={0.7}
              style={[
                styles.iconBtn,
                {
                  borderColor: flashMode === 'on' ? theme.primary : theme.border,
                  backgroundColor: flashMode === 'on' ? theme.primary + '20' : theme.surface,
                },
              ]}
              onPress={toggleFlash}
            >
              {flashMode === 'on' ? (
                <Flash color={theme.primary} size={20} variant="Bold" />
              ) : (
                <FlashSlash color={theme.textMuted} size={20} variant="Outline" />
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContent}
        enableOnAndroid
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* CAMERA STATE: LARGE CUSTOM CAMERA VIEWFINDER & MOTION SCAN */}
        {state === 'camera' && (
          <Animated.View entering={FadeInDown.duration(300)} style={styles.stateContainer}>
            {/* Large Viewfinder Container */}
            <View style={[styles.cameraFrame, { borderColor: targetDetected ? theme.primary : theme.border }]}>
              {permission?.granted ? (
                <CameraView
                  ref={cameraRef}
                  facing="back"
                  flash={flashMode}
                  style={StyleSheet.absoluteFill}
                  onBarcodeScanned={autoScanEnabled && !targetDetected ? handleBarcodeScanned : undefined}
                  barcodeScannerSettings={{
                    barcodeTypes: ["qr", "ean13", "ean8", "pdf417", "code128", "code39"],
                  }}
                />
              ) : (
                <View style={[styles.permissionBox, { backgroundColor: theme.surface }]}>
                  <CameraIcon color={theme.primary} size={48} variant="Bulk" />
                  <Text style={[styles.permTitle, { color: theme.textPrimary }]} weight="bold">
                    Izin Kamera Diperlukan
                  </Text>
                  <Text style={[styles.permSub, { color: theme.textMuted }]}>
                    Aktifkan kamera untuk pemindaian struk otomatis berbasis AI
                  </Text>
                  <Button
                    title="Izinkan Akses Kamera"
                    variant="lime"
                    size="medium"
                    onPress={requestPermission}
                    style={{ marginTop: 12 }}
                  />
                </View>
              )}

              {/* Custom Corner Framing Overlay */}
              <View style={styles.cornerOverlay}>
                <View style={[styles.corner, styles.topLeft, { borderColor: targetDetected ? '#22C55E' : theme.primary }]} />
                <View style={[styles.corner, styles.topRight, { borderColor: targetDetected ? '#22C55E' : theme.primary }]} />
                <View style={[styles.corner, styles.bottomLeft, { borderColor: targetDetected ? '#22C55E' : theme.primary }]} />
                <View style={[styles.corner, styles.bottomRight, { borderColor: targetDetected ? '#22C55E' : theme.primary }]} />
              </View>

              {/* Futuristic Motion Scan Laser Beam */}
              {permission?.granted && (
                <Animated.View
                  style={[
                    styles.motionLaserBeam,
                    { backgroundColor: targetDetected ? '#22C55E' : theme.primary },
                    animatedLaserStyle,
                  ]}
                />
              )}

              {/* Auto Target Lock Visual Indicator */}
              {targetDetected && (
                <Animated.View style={[styles.targetLockBox, animatedLockStyle]}>
                  <View style={styles.targetLockInner}>
                    <TickCircle color="#22C55E" size={32} variant="Bold" />
                    <Text style={styles.targetLockText} weight="bold">
                      STRUK TERDETEKSI!
                    </Text>
                    <Text style={styles.targetLockSub}>Mengambil foto otomatis...</Text>
                  </View>
                </Animated.View>
              )}

              {/* Live AI HUD Badge */}
              <View style={styles.hudBadge}>
                <View style={[styles.hudDot, { backgroundColor: autoScanEnabled ? '#22C55E' : theme.primary }]} />
                <Text style={styles.hudText} weight="medium">
                  {autoScanEnabled ? 'AUTO DETECT ACTIVE' : 'MANUAL SCAN MODE'}
                </Text>
              </View>
            </View>

            {/* Shutter & Controls Row */}
            <View style={styles.controlsRow}>
              {/* Gallery Pick Button */}
              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.sideControlBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
                onPress={handlePickGallery}
              >
                <Gallery color={theme.textPrimary} size={24} variant="Outline" />
                <Text style={[styles.controlLabel, { color: theme.textMuted }]}>Galeri</Text>
              </TouchableOpacity>

              {/* Main Shutter Button */}
              <TouchableOpacity
                activeOpacity={0.85}
                style={[
                  styles.shutterOuterRing,
                  { borderColor: targetDetected ? '#22C55E' : theme.primary },
                ]}
                onPress={() => handleSnapPhoto()}
              >
                <View style={[styles.shutterInnerBtn, { backgroundColor: targetDetected ? '#22C55E' : theme.primary }]}>
                  <CameraIcon color="#0F3D3E" size={28} variant="Bold" />
                </View>
              </TouchableOpacity>

              {/* Open Presets Modal Button */}
              <TouchableOpacity
                activeOpacity={0.8}
                style={[styles.sideControlBtn, { backgroundColor: theme.surface, borderColor: theme.border }]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setPresetModalVisible(true);
                }}
              >
                <Magicpen color={theme.primary} size={24} variant="Bold" />
                <Text style={[styles.controlLabel, { color: theme.textMuted }]}>Contoh</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}

        {/* SCANNING STATE: ACTIVE MOTION AI PROCESSING */}
        {state === 'scanning' && (
          <Animated.View entering={FadeInUp.duration(300)} style={styles.scanningWrapper}>
            <View style={[styles.cameraFrame, { borderColor: theme.border }]}>
              {capturedUri ? (
                <Image source={{ uri: capturedUri }} style={styles.previewImage} resizeMode="cover" />
              ) : (
                <View style={[styles.previewPlaceholder, { backgroundColor: theme.surface }]}>
                  <Receipt2 color={theme.primary} size={64} variant="Bulk" />
                </View>
              )}

              {/* Fast Laser Overlay */}
              <Animated.View
                style={[
                  styles.motionLaserBeam,
                  { backgroundColor: theme.primary },
                  animatedLaserStyle,
                ]}
              />

              <View style={styles.scanningOverlay}>
                <ActivityIndicator color="#FFFFFF" size="large" />
              </View>
            </View>

            <View style={styles.scanStatusTextWrapper}>
              <Text style={[styles.scanStatusTitle, { color: theme.textPrimary }]} weight="bold">
                Mengekstrak Data Struk...
              </Text>
              <Text style={[styles.scanStatusSub, { color: theme.textMuted }]}>
                Teknologi AI sedang membaca nominal, tanggal, dan nama toko
              </Text>
            </View>
          </Animated.View>
        )}

        {/* RESULT STATE: CONFIRMATION & EDIT FORM */}
        {state === 'result' && (
          <Animated.View entering={FadeInDown.duration(300)} style={styles.stateContainer}>
            {/* Image Thumbnail Banner if available */}
            {capturedUri && (
              <View style={[styles.resultBanner, { borderColor: theme.border }]}>
                <Image source={{ uri: capturedUri }} style={styles.bannerImage} resizeMode="cover" />
                <View style={[styles.bannerBadge, { backgroundColor: theme.primary }]}>
                  <ImageIcon color="#0F3D3E" size={14} />
                  <Text style={styles.bannerBadgeText} weight="bold">
                    Foto Terlampir
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.resultHeaderRow}>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]} weight="semibold">
                Hasil Pemindaian AI
              </Text>
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.retakeInlineBtn}
                onPress={() => {
                  setState('camera');
                  setCapturedUri(null);
                }}
              >
                <Refresh color={theme.primary} size={16} />
                <Text style={[styles.retakeText, { color: theme.primary }]} weight="medium">
                  Foto Ulang
                </Text>
              </TouchableOpacity>
            </View>

            <Card variant="default" style={styles.formCard}>
              <View style={styles.formContent}>
                {/* Nominal Input */}
                <Input
                  keyboardType="numeric"
                  label="Nominal Transaksi (Rp)"
                  leftIcon={<DollarCircle color={theme.textMuted} size={20} variant="Outline" />}
                  value={amount}
                  onChangeText={(val) => setAmount(val.replace(/[^\d]/g, ''))}
                />

                {/* Vendor / Toko */}
                <Input
                  label="Toko / Merchant"
                  leftIcon={<DocumentText color={theme.textMuted} size={20} variant="Outline" />}
                  value={vendor}
                  onChangeText={setVendor}
                />

                {/* Kategori Dropdown */}
                <View style={styles.dropdownSection}>
                  <Text style={[styles.fieldLabel, { color: theme.textPrimary }]}>Kategori</Text>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={[styles.dropdownBtn, { backgroundColor: theme.surfaceElement, borderColor: theme.border }]}
                    onPress={() => setShowCategoryPicker(!showCategoryPicker)}
                  >
                    <View style={styles.dropdownLeft}>
                      <Category color={theme.textMuted} size={20} variant="Outline" />
                      <Text style={{ color: theme.textPrimary }} weight="medium">
                        {category}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {showCategoryPicker && (
                    <Card variant="outline" style={styles.dropdownList}>
                      {[
                        'Makan & Harian',
                        'Transportasi',
                        'Belanja',
                        'Hiburan',
                        'Tagihan',
                        'Kesehatan',
                        'Lainnya',
                      ].map((item) => (
                        <TouchableOpacity
                          key={item}
                          activeOpacity={0.7}
                          style={styles.dropdownOption}
                          onPress={() => {
                            setCategory(item);
                            setShowCategoryPicker(false);
                          }}
                        >
                          <Text style={{ color: theme.textPrimary }}>{item}</Text>
                        </TouchableOpacity>
                      ))}
                    </Card>
                  )}
                </View>

                {/* Akun Pembayaran Dropdown */}
                <View style={styles.dropdownSection}>
                  <Text style={[styles.fieldLabel, { color: theme.textPrimary }]}>Sumber Pembayaran</Text>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={[styles.dropdownBtn, { backgroundColor: theme.surfaceElement, borderColor: theme.border }]}
                    onPress={() => setShowAccountPicker(!showAccountPicker)}
                  >
                    <View style={styles.dropdownLeft}>
                      <CardIcon color={theme.textMuted} size={20} variant="Outline" />
                      <Text style={{ color: theme.textPrimary }} weight="medium">
                        {accounts.find((a) => a.id === accountId)?.name || 'Pilih Akun'}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {showAccountPicker && (
                    <Card variant="outline" style={styles.dropdownList}>
                      {accounts.map((acc) => (
                        <TouchableOpacity
                          key={acc.id}
                          activeOpacity={0.7}
                          style={styles.dropdownOption}
                          onPress={() => {
                            setAccountId(acc.id);
                            setShowAccountPicker(false);
                          }}
                        >
                          <Text style={{ color: theme.textPrimary }}>{acc.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </Card>
                  )}
                </View>

                {/* Catatan Input */}
                <Input
                  label="Catatan Opsional"
                  leftIcon={<Calendar color={theme.textMuted} size={20} variant="Outline" />}
                  value={note}
                  onChangeText={setNote}
                />
              </View>
            </Card>

            {/* Bottom Actions */}
            <View style={styles.actionRow}>
              <Button
                title="Simpan Transaksi"
                variant="lime"
                size="large"
                style={styles.flexBtn}
                onPress={handleSaveTransaction}
              />
              <Button
                title="Pindai Ulang"
                variant="outline"
                size="large"
                style={styles.flexBtn}
                onPress={() => {
                  setState('camera');
                  setCapturedUri(null);
                }}
              />
            </View>
          </Animated.View>
        )}
      </KeyboardAwareScrollView>

      {/* COMPACT BOTTOM SHEET MODAL FOR PRESET SIMULATION */}
      <Modal
        visible={presetModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPresetModalVisible(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setPresetModalVisible(false)}>
          <Pressable
            style={[styles.bottomSheetContainer, { backgroundColor: theme.surface }]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Sheet Handle */}
            <View style={[styles.sheetHandle, { backgroundColor: theme.border }]} />

            <View style={styles.sheetHeader}>
              <View style={{ gap: 2 }}>
                <Text style={[styles.sheetTitle, { color: theme.textPrimary }]} weight="bold">
                  Simulasi Struk Contoh
                </Text>
                <Text style={[styles.sheetSub, { color: theme.textMuted }]}>
                  Pilih struk contoh untuk menguji ekstraksi AI cepat
                </Text>
              </View>
              <TouchableOpacity onPress={() => setPresetModalVisible(false)}>
                <CloseCircle color={theme.textMuted} size={24} variant="Outline" />
              </TouchableOpacity>
            </View>

            <View style={styles.sheetList}>
              {MOCK_RECEIPTS.map((receipt, idx) => (
                <TouchableOpacity
                  key={idx}
                  activeOpacity={0.8}
                  style={[styles.sheetItemCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
                  onPress={() => handleSimulatePreset(receipt)}
                >
                  <View style={[styles.sheetItemIcon, { backgroundColor: theme.surfaceElement }]}>
                    <Receipt2 color={theme.primary} size={24} variant="Outline" />
                  </View>
                  <View style={styles.sheetItemInfo}>
                    <Text style={[styles.sheetItemTitle, { color: theme.textPrimary }]} weight="medium">
                      {receipt.name}
                    </Text>
                    <Text style={[styles.sheetItemMeta, { color: theme.textMuted }]}>
                      Rp {receipt.amount.toLocaleString('id-ID')} • {receipt.category}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Success Modal */}
      <StatusModal
        visible={statusModal.visible}
        type={statusModal.type}
        title={statusModal.title}
        message={statusModal.message}
        buttonText="Selesai"
        onConfirm={() => {
          setStatusModal((prev) => ({ ...prev, visible: false }));
          router.back();
        }}
      />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 40,
  },
  stateContainer: {
    gap: 20,
  },
  cameraFrame: {
    height: VIEWFINDER_HEIGHT,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 2,
    position: 'relative',
    backgroundColor: '#071F20',
  },
  permissionBox: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  permTitle: {
    fontSize: 16,
    marginTop: 8,
  },
  permSub: {
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
  },
  cornerOverlay: {
    ...StyleSheet.absoluteFill,
    pointerEvents: 'none',
  },
  corner: {
    position: 'absolute',
    width: 32,
    height: 32,
    borderWidth: 4,
    zIndex: 10,
  },
  topLeft: {
    top: 18,
    left: 18,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 12,
  },
  topRight: {
    top: 18,
    right: 18,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 12,
  },
  bottomLeft: {
    bottom: 18,
    left: 18,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 12,
  },
  bottomRight: {
    bottom: 18,
    right: 18,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 12,
  },
  motionLaserBeam: {
    position: 'absolute',
    left: 14,
    right: 14,
    height: 3.5,
    borderRadius: 2,
    shadowColor: '#B7E36D',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 14,
    elevation: 10,
    zIndex: 15,
  },
  targetLockBox: {
    position: 'absolute',
    top: '30%',
    left: '15%',
    right: '15%',
    backgroundColor: 'rgba(7, 31, 32, 0.88)',
    borderRadius: 20,
    padding: 16,
    borderWidth: 2,
    borderColor: '#22C55E',
    alignItems: 'center',
    zIndex: 25,
  },
  targetLockInner: {
    alignItems: 'center',
    gap: 4,
  },
  targetLockText: {
    color: '#22C55E',
    fontSize: 13,
    letterSpacing: 1,
    marginTop: 4,
  },
  targetLockSub: {
    color: '#FAFCFB',
    fontSize: 11,
  },
  hudBadge: {
    position: 'absolute',
    top: 16,
    alignSelf: 'center',
    backgroundColor: 'rgba(7, 31, 32, 0.8)',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 100,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 20,
  },
  hudDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  hudText: {
    color: '#FAFCFB',
    fontSize: 10,
    letterSpacing: 1,
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 12,
  },
  sideControlBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  controlLabel: {
    fontSize: 10,
  },
  shutterOuterRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3.5,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
  },
  shutterInnerBtn: {
    width: '100%',
    height: '100%',
    borderRadius: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanningWrapper: {
    gap: 24,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanningOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(7, 31, 32, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanStatusTextWrapper: {
    alignItems: 'center',
    gap: 6,
  },
  scanStatusTitle: {
    fontSize: 18,
  },
  scanStatusSub: {
    fontSize: 13,
    textAlign: 'center',
  },
  resultBanner: {
    height: 150,
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    position: 'relative',
  },
  bannerImage: {
    width: '100%',
    height: '100%',
  },
  bannerBadge: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 100,
  },
  bannerBadgeText: {
    color: '#0F3D3E',
    fontSize: 11,
  },
  resultHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 13,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  retakeInlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  retakeText: {
    fontSize: 13,
  },
  formCard: {
    padding: 20,
    borderRadius: 24,
  },
  formContent: {
    gap: 16,
  },
  dropdownSection: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  dropdownBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  dropdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dropdownList: {
    borderRadius: 16,
    padding: 8,
    marginTop: 4,
    gap: 2,
  },
  dropdownOption: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
  },
  flexBtn: {
    flex: 1,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'flex-end',
  },
  bottomSheetContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
    gap: 16,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 4,
  },

  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetTitle: {
    fontSize: 18,
  },
  sheetSub: {
    fontSize: 12,
  },
  sheetList: {
    gap: 12,
    marginTop: 4,
  },
  sheetItemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
  },
  sheetItemIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetItemInfo: {
    flex: 1,
    gap: 2,
  },
  sheetItemTitle: {
    fontSize: 15,
  },
  sheetItemMeta: {
    fontSize: 12,
  },
});



