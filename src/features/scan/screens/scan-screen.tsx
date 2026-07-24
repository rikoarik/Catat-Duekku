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
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import Animated, { FadeInDown, FadeInUp } from 'react-native-reanimated';
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
} from 'iconsax-react-native';
import { router } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';

import { ScreenWrapper } from '@/components/common/screen-wrapper';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { StatusModal } from '@/components/ui/status-modal';
import { getTheme } from '@/core/theme/colors';
import { edgeApi, idempotencyKey, type Account, type Category as ApiCategory, type ParserResponse } from '@/core/lib/edge-api';
import { t } from '@/core/i18n/strings';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const VIEWFINDER_HEIGHT = SCREEN_HEIGHT * 0.73; // Make camera taller without going full screen

type ScanState = 'camera' | 'scanning' | 'result';

export function ScanScreen() {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);

  // Camera hooks & state
  const cameraRef = useRef<any>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [torchEnabled, setTorchEnabled] = useState(false);

  // UI state
  const [state, setState] = useState<ScanState>('camera');
  const [capturedUri, setCapturedUri] = useState<string | null>(null);

  // Result form state
  const [amount, setAmount] = useState('');
  const [vendor, setVendor] = useState('');
  const [category, setCategory] = useState('Makan & Harian');
  const [accountId, setAccountId] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountKind, setAccountKind] = useState<Account['kind']>('BANK');
  const [note, setNote] = useState('');
  const [transactionType, setTransactionType] = useState<'INCOME' | 'EXPENSE'>('EXPENSE');
  const [draftIntent, setDraftIntent] = useState<ParserResponse['intent']>('unknown');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [referencesLoading, setReferencesLoading] = useState(true);
  const [referencesError, setReferencesError] = useState('');
  const [amountError, setAmountError] = useState('');
  const [accountError, setAccountError] = useState('');
  const [categoryError, setCategoryError] = useState('');

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

  const parseImage = async (imageBase64: string) => {
    const { data } = await edgeApi.parseImage(imageBase64);
    return data;
  };

  const applyDraft = (data: ParserResponse, uri: string | null) => {
    setCapturedUri(uri);
    setDraftIntent(data.intent);
    setTransactionType(data.intent === 'create_income' ? 'INCOME' : 'EXPENSE');
    setAmount(String(data.fields.amount ?? data.fields.new_balance));
    setAccountName(data.fields.account_name ?? '');
    setAccountKind(data.fields.account_kind ?? 'BANK');
    setVendor(data.fields.description ?? data.fields.debt_name ?? data.fields.goal_name ?? '');
    const inferredType = data.intent === 'create_income' ? 'INCOME' : 'EXPENSE';
    const inferredCategory = categories.find(({ name, type }) => type === inferredType && name.toLocaleLowerCase('id-ID') === data.fields.category_name?.toLocaleLowerCase('id-ID'));
    setCategory(inferredCategory?.name ?? categories.find(({ type }) => type === inferredType)?.name ?? '');
    const parsedAccount = accounts.find(({ id, name }) => id === data.fields.account_id || name.toLocaleLowerCase('id-ID') === data.fields.account_name?.toLocaleLowerCase('id-ID'));
    setAccountId(parsedAccount?.id ?? accounts.find((item) => item.is_default)?.id ?? accounts[0]?.id ?? '');
    setNote('');
    setAmountError('');
    setAccountError('');
    setCategoryError('');
    setState('result');
    return true;
  };

  const [saving, setSaving] = useState(false);
  const transactionKey = useRef<string | null>(null);
  const loadReferences = async () => {
    setReferencesLoading(true);
    setReferencesError('');
    try {
      const [accountResponse, categoryResponse] = await Promise.all([edgeApi.accounts(), edgeApi.categories()]);
      setAccounts(accountResponse.data);
      setCategories(categoryResponse.data);
      setAccountId((current) => current || accountResponse.data.find((item) => item.is_default)?.id || accountResponse.data[0]?.id || '');
    } catch (error) {
      setReferencesError(error instanceof Error ? error.message : t('scan.loadAccountFailedFallback'));
    } finally {
      setReferencesLoading(false);
    }
  };

  useEffect(() => {
    const task = setTimeout(() => void loadReferences(), 0);
    return () => clearTimeout(task);
  }, []);

  // Flash toggle
  const toggleFlash = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTorchEnabled((prev) => !prev);
  };

  // Capture photo via custom CameraView
  const handleSnapPhoto = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      if (cameraRef.current) {
        const photo = await cameraRef.current.takePictureAsync({ quality: 0.5, base64: true });
        if (photo?.uri && photo.base64) {
          setCapturedUri(photo.uri);
          processScannedPhoto(photo.uri, photo.base64);
          return;
        }
      }

      throw new Error(t('scan.cameraSnapFailed'));
    } catch (err: any) {
      Alert.alert(t('scan.cameraSnapErrorTitle'), err?.message || t('scan.cameraSnapFailed'));
    }
  };

  // Pick photo from Gallery
  const handlePickGallery = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(t('scan.galleryPermissionTitle'), t('scan.galleryPermissionMessage'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.5,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const uri = result.assets[0].uri;
        setCapturedUri(uri);
        if (!result.assets[0].base64) throw new Error(t('scan.extractFailedMessage'));
        processScannedPhoto(uri, result.assets[0].base64);
      }
    } catch (err: any) {
      Alert.alert(t('scan.galleryErrorTitle'), err.message || t('scan.galleryErrorTitle'));
    }
  };

  const processScannedPhoto = async (uri: string | null, imageBase64: string) => {
    if (!uri) return;
    setState('scanning');
    try {
      const data = await parseImage(imageBase64);
      if (data.intent === 'unknown' || (data.fields.amount == null && data.fields.new_balance == null)) {
        setState('camera');
        setStatusModal({ visible: true, type: 'error', title: t('scan.extractFailedTitle'), message: t('scan.extractFailedMessage') });
      } else applyDraft(data, uri);
    } catch (cause) {
      setState('camera');
      setStatusModal({
        visible: true,
        type: 'error',
        title: t('scan.extractFailedTitle'),
        message: cause instanceof Error ? cause.message : t('scan.extractFailedMessage'),
      });
    }
  };

  const handleSaveTransaction = async () => {
    if (!['create_income', 'create_expense', 'create_account', 'set_balance'].includes(draftIntent)) {
      setStatusModal({ visible: true, type: 'error', title: t('scan.unsupportedIntentTitle'), message: 'Jenis tindakan ini belum dapat disimpan.' });
      return;
    }
    setAmountError('');
    setAccountError('');
    setCategoryError('');
    const parsedAmount = Number(amount.replace(/[^\d]/g, ''));
    const amountInvalid = !Number.isSafeInteger(parsedAmount) || parsedAmount < 0 || (!['set_balance', 'create_account'].includes(draftIntent) && parsedAmount === 0);
    const selectedAccount = accounts.find(({ id }) => id === accountId);
    const accountInvalid = draftIntent === 'create_account' ? !accountName.trim() : !selectedAccount;
    const selectedCategory = categories.find(({ name, type }) => type === transactionType && name === category);
    const categoryInvalid = !['set_balance', 'create_account'].includes(draftIntent) && !selectedCategory;
    if (amountInvalid || accountInvalid || categoryInvalid) {
      if (amountInvalid) setAmountError(t('scan.invalidAmountMessage'));
      if (accountInvalid) setAccountError(t('scan.accountRequiredMessage'));
      if (categoryInvalid) setCategoryError('Pilih kategori yang sesuai dengan jenis transaksi.');
      return;
    }

    setSaving(true);
    try {
      transactionKey.current ??= idempotencyKey(draftIntent === 'create_account' ? 'scan-account' : draftIntent === 'set_balance' ? 'scan-balance' : 'scan-transaction');
      if (draftIntent === 'create_account') await edgeApi.createAccount({ name: accountName.trim(), kind: accountKind, opening_balance: parsedAmount }, transactionKey.current);
      else if (draftIntent === 'set_balance') await edgeApi.setAccountBalance(selectedAccount!.id, parsedAmount, selectedAccount!.version, transactionKey.current);
      else if (transactionType === 'EXPENSE') {
        const input = { account_id: accountId, amount: parsedAmount, category_name: selectedCategory?.name ?? null, description: vendor.trim() || t('scan.defaultDescription') };
        const preview = await edgeApi.parserFinancePreview(accountId, parsedAmount, 'EXPENSE');
        if (preview.protected_shortfall > 0) {
          await new Promise<void>((resolve, reject) => Alert.alert('Dana terlindungi akan terpakai', `${preview.protected_shortfall.toLocaleString('id-ID')} rupiah perlu dilepas dari dana terlindungi.`, [{ text: 'Batal', style: 'cancel', onPress: () => reject(new Error('Penyimpanan dibatalkan.')) }, { text: 'Tetap simpan', style: 'destructive', onPress: () => { void edgeApi.createParserExpense({ ...input, override_protected: true }, transactionKey.current!).then(() => resolve(), reject); } }]));
        } else await edgeApi.createParserExpense({ ...input, override_protected: false }, transactionKey.current);
      } else await edgeApi.createTransaction({
        type: transactionType,
        amount: parsedAmount,
        account_id: accountId,
        category_name: selectedCategory?.name ?? null,
        description: vendor.trim() || t('scan.defaultDescription'),
        note: note.trim() || null,
        source: 'RECEIPT',
      }, transactionKey.current);
      setStatusModal({
        visible: true,
        type: 'success',
        title: draftIntent === 'create_account' ? 'Akun berhasil dibuat' : draftIntent === 'set_balance' ? 'Saldo berhasil diperbarui' : t('scan.saveSuccessTitle'),
        message: draftIntent === 'create_account' ? `${accountName.trim()} dibuat dengan saldo Rp ${parsedAmount.toLocaleString('id-ID')}` : draftIntent === 'set_balance' ? `Saldo ${selectedAccount!.name} kini Rp ${parsedAmount.toLocaleString('id-ID')}` : `Rp ${parsedAmount.toLocaleString('id-ID')} — ${t('scan.saveSuccessMessage')}`,
      });
    } catch (err) {
      setStatusModal({ visible: true, type: 'error', title: t('scan.saveFailedTitle'), message: err instanceof Error ? err.message : t('scan.genericError') });
    } finally {
      setSaving(false);
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
          {t('scan.headerTitle')}
        </Text>

        {/* Right Header Action Controls */}
        <View style={styles.headerRightActions}>
          {state === 'camera' && permission?.granted && (
              <TouchableOpacity
                activeOpacity={0.7}
                style={[
                  styles.iconBtn,
                  {
                    borderColor: torchEnabled ? theme.primary : theme.border,
                    backgroundColor: torchEnabled ? theme.primary + '20' : theme.surface,
                  },
                ]}
                onPress={toggleFlash}
              >
                {torchEnabled ? (
                  <Flash color={theme.primary} size={20} variant="Bold" />
                ) : (
                  <FlashSlash color={theme.textMuted} size={20} variant="Outline" />
                )}
              </TouchableOpacity>
          )}
        </View>
      </View>

      <KeyboardAwareScrollView
        contentContainerStyle={styles.scrollContent}
        enableOnAndroid
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {referencesError ? <Card variant="surface" style={styles.referenceError}><Text style={{ color: theme.expense }} weight="bold">Data akun belum siap</Text><Text style={[styles.referenceErrorText, { color: theme.textMuted }]}>{referencesError}</Text><Button title="Coba lagi" size="small" variant="outline" onPress={() => void loadReferences()} /></Card> : null}
        {/* CAMERA STATE: LARGE CUSTOM CAMERA VIEWFINDER & MOTION SCAN */}
        {state === 'camera' && (
          <Animated.View entering={FadeInDown.duration(300)} style={styles.stateContainer}>
            {/* Large Viewfinder Container */}
            <View style={[styles.cameraFrame, { borderColor: theme.border }]}>
              {permission?.granted ? (
                <CameraView
                  ref={cameraRef}
                  facing="back"
                  enableTorch={torchEnabled}
                  style={StyleSheet.absoluteFill}
                />
              ) : (
                <View style={[styles.permissionBox, { backgroundColor: theme.surface }]}>
                  <CameraIcon color={theme.primary} size={48} variant="Bulk" />
                  <Text style={[styles.permTitle, { color: theme.textPrimary }]} weight="bold">
                    {t('scan.cameraPermTitle')}
                  </Text>
                  <Text style={[styles.permSub, { color: theme.textMuted }]}>
                    {t('scan.cameraPermSub')}
                  </Text>
                  <Button
                    title={t('scan.cameraPermBtn')}
                    variant="lime"
                    size="medium"
                    onPress={requestPermission}
                    style={{ marginTop: 12 }}
                  />
                </View>
              )}

              <View style={styles.cornerOverlay}>
                <View style={[styles.corner, styles.topLeft, { borderColor: theme.primary }]} />
                <View style={[styles.corner, styles.topRight, { borderColor: theme.primary }]} />
                <View style={[styles.corner, styles.bottomLeft, { borderColor: theme.primary }]} />
                <View style={[styles.corner, styles.bottomRight, { borderColor: theme.primary }]} />
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
                <Text style={[styles.controlLabel, { color: theme.textMuted }]}>{t('scan.galleryLabel')}</Text>
              </TouchableOpacity>

              {/* Main Shutter Button */}
              <TouchableOpacity
                activeOpacity={0.85}
                 style={[styles.shutterOuterRing, { borderColor: theme.primary }]}
                 onPress={handleSnapPhoto}
               >
                 <View style={[styles.shutterInnerBtn, { backgroundColor: theme.primary }]}>
                  <CameraIcon color="#0F3D3E" size={28} variant="Bold" />
                </View>
              </TouchableOpacity>

              <View style={styles.sideControlBtn} />
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

              <View style={styles.scanningOverlay}>
                <ActivityIndicator color="#FFFFFF" size="large" />
              </View>
            </View>

            <View style={styles.scanStatusTextWrapper}>
              <Text style={[styles.scanStatusTitle, { color: theme.textPrimary }]} weight="bold">
                {t('scan.scanningTitle')}
              </Text>
              <Text style={[styles.scanStatusSub, { color: theme.textMuted }]}>
                {t('scan.scanningSub')}
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
                    {t('scan.photoBadge')}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.resultHeaderRow}>
              <Text style={[styles.sectionTitle, { color: theme.textSecondary }]} weight="semibold">
                {t('scan.resultTitle')}
              </Text>
              <TouchableOpacity
                activeOpacity={0.7}
                style={styles.retakeInlineBtn}
                onPress={() => {
                  transactionKey.current = null;
                  setState('camera');
                  setCapturedUri(null);
                }}
              >
                <Refresh color={theme.primary} size={16} />
                <Text style={[styles.retakeText, { color: theme.primary }]} weight="medium">
                  {t('scan.retakeBtn')}
                </Text>
              </TouchableOpacity>
            </View>

            <Card variant="default" style={styles.formCard}>
              <View style={styles.formContent}>
                {/* Nominal Input */}
                <Input
                  keyboardType="numeric"
                  label={`${draftIntent === 'create_account' ? 'Saldo awal' : draftIntent === 'set_balance' ? 'Saldo baru' : t('scan.amountLabel')} · Wajib`}
                  leftIcon={<DollarCircle color={theme.textMuted} size={20} variant="Outline" />}
                  value={amount}
                  error={amountError}
                  onChangeText={(val) => { setAmount(val.replace(/[^\d]/g, '')); setAmountError(''); transactionKey.current = null; }}
                />

                {draftIntent === 'create_account' && <>
                  <Input label="Nama akun" leftIcon={<CardIcon color={theme.textMuted} size={20} variant="Outline" />} value={accountName} onChangeText={setAccountName} />
                  <View style={styles.dropdownSection}>
                    <Text style={[styles.fieldLabel, { color: theme.textPrimary }]}>Jenis akun</Text>
                    <View style={styles.actionRow}>{(['CASH', 'BANK', 'E_WALLET', 'INVESTMENT'] as const).map((kind) => <Button key={kind} title={{ CASH: 'Tunai', BANK: 'Bank', E_WALLET: 'E-Wallet', INVESTMENT: 'Investasi' }[kind]} variant={accountKind === kind ? 'lime' : 'outline'} size="small" style={styles.flexBtn} onPress={() => setAccountKind(kind)} />)}</View>
                  </View>
                </>}

                {!['set_balance', 'create_account'].includes(draftIntent) && <Input
                  label={transactionType === 'INCOME' ? 'Sumber pemasukan' : t('scan.merchantLabel')}
                  leftIcon={<DocumentText color={theme.textMuted} size={20} variant="Outline" />}
                  value={vendor}
                  onChangeText={setVendor}
                />}

                {!['set_balance', 'create_account'].includes(draftIntent) && <View style={styles.typeRow}>{(['EXPENSE', 'INCOME'] as const).map((type) => <Button key={type} title={type === 'EXPENSE' ? 'Pengeluaran' : 'Pemasukan'} size="small" variant={transactionType === type ? 'lime' : 'outline'} style={styles.flexBtn} onPress={() => { setTransactionType(type); setDraftIntent(type === 'EXPENSE' ? 'create_expense' : 'create_income'); setCategory(categories.find((item) => item.type === type)?.name ?? ''); setCategoryError(''); transactionKey.current = null; }} />)}</View>}

                {!['set_balance', 'create_account'].includes(draftIntent) && <View style={styles.dropdownSection}>
                  <Text style={[styles.fieldLabel, { color: theme.textPrimary }]}>{t('scan.categoryLabel')} · Wajib</Text>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={[styles.dropdownBtn, { backgroundColor: theme.surfaceElement, borderColor: theme.border }]}
                    onPress={() => setShowCategoryPicker(!showCategoryPicker)}
                  >
                    <View style={styles.dropdownLeft}>
                      <Category color={theme.textMuted} size={20} variant="Outline" />
                       <Text style={{ color: category ? theme.textPrimary : theme.textMuted }} weight="medium">
                         {category || (referencesLoading ? 'Memuat kategori…' : 'Pilih kategori')}
                       </Text>
                    </View>
                  </TouchableOpacity>

                  {showCategoryPicker && (
                    <Card variant="outline" style={styles.dropdownList}>
                      {categories.filter(({ type }) => type === transactionType).map((item) => (
                        <TouchableOpacity
                          key={item.id}
                          activeOpacity={0.7}
                          style={styles.dropdownOption}
                          onPress={() => {
                             setCategory(item.name);
                             setCategoryError('');
                             transactionKey.current = null;
                             setShowCategoryPicker(false);
                          }}
                        >
                          <Text style={{ color: theme.textPrimary }}>{item.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </Card>
                   )}
                  {categoryError ? <Text style={[styles.fieldError, { color: theme.expense }]}>{categoryError}</Text> : null}
                 </View>}

                 {/* Akun Pembayaran Dropdown */}
                {draftIntent !== 'create_account' && <View style={styles.dropdownSection}>
                   <Text style={[styles.fieldLabel, { color: theme.textPrimary }]}>{draftIntent === 'set_balance' ? 'Akun' : t('scan.paymentSourceLabel')} · Wajib</Text>
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={[styles.dropdownBtn, { backgroundColor: theme.surfaceElement, borderColor: theme.border }]}
                    onPress={() => setShowAccountPicker(!showAccountPicker)}
                  >
                    <View style={styles.dropdownLeft}>
                      <CardIcon color={theme.textMuted} size={20} variant="Outline" />
                      <Text style={{ color: theme.textPrimary }} weight="medium">
                         {accounts.find((a) => a.id === accountId)?.name || (referencesLoading ? 'Memuat akun…' : accounts.length ? t('scan.selectAccount') : 'Belum ada akun')}
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
                             setAccountError('');
                             transactionKey.current = null;
                             setShowAccountPicker(false);
                          }}
                        >
                          <Text style={{ color: theme.textPrimary }}>{acc.name}</Text>
                        </TouchableOpacity>
                      ))}
                    </Card>
                   )}
                  {accountError ? <Text style={[styles.fieldError, { color: theme.expense }]}>{accountError}</Text> : null}
                 </View>}

                 {!['set_balance', 'create_account'].includes(draftIntent) && <Input
                   label={`${t('scan.noteLabel')} · Opsional`}
                  leftIcon={<Calendar color={theme.textMuted} size={20} variant="Outline" />}
                  value={note}
                  onChangeText={setNote}
                />}
              </View>
            </Card>

            {/* Bottom Actions */}
            <View style={styles.resultActions}>
              <Button
                 title={saving ? t('scan.savingBtn') : draftIntent === 'create_account' ? 'Buat akun' : draftIntent === 'set_balance' ? 'Perbarui saldo' : transactionType === 'INCOME' ? 'Simpan pemasukan' : 'Simpan pengeluaran'}
                disabled={saving || referencesLoading || !!referencesError}
                icon={saving ? <ActivityIndicator color={theme.deepTeal} size="small" /> : undefined}
                variant="lime"
                size="large"
                onPress={handleSaveTransaction}
              />
              <Button
                title={t('scan.rescanBtn')}
                disabled={saving}
                variant="outline"
                size="medium"
                onPress={() => {
                  transactionKey.current = null;
                  setState('camera');
                  setCapturedUri(null);
                }}
              />
            </View>
          </Animated.View>
        )}
      </KeyboardAwareScrollView>


      {/* Success Modal */}
      <StatusModal
        visible={statusModal.visible}
        type={statusModal.type}
        title={statusModal.title}
        message={statusModal.message}
        buttonText={statusModal.type === 'success' ? t('scan.btnDone') : t('scan.btnTryAgain')}
        onConfirm={() => {
          setStatusModal((prev) => ({ ...prev, visible: false }));
          if (statusModal.type === 'success') router.back();
        }}
         onClose={() => {
           setStatusModal((prev) => ({ ...prev, visible: false }));
           if (statusModal.type === 'success') router.back();
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
  referenceError: { marginHorizontal: 0, marginBottom: 14, padding: 16, gap: 8 },
  referenceErrorText: { fontSize: 12, lineHeight: 18 },
  typeRow: { flexDirection: 'row', gap: 10 },
  resultActions: { gap: 10 },
  fieldError: { fontSize: 12, lineHeight: 17, paddingHorizontal: 2 },
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

