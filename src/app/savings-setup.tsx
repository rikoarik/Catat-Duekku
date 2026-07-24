import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, TouchableOpacity, View, useColorScheme } from 'react-native';
import { ArrowLeft, Calendar } from 'iconsax-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

import { ScreenWrapper } from '@/components/common/screen-wrapper';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CustomDatePickerModal } from '@/components/ui/custom-date-picker-modal';
import { Text } from '@/components/ui/text';
import { edgeApi, idempotencyKey, type Account } from '@/core/lib/edge-api';
import { formatLongDate, todayIso } from '@/core/lib/dates';
import { getTheme } from '@/core/theme/colors';
import { formatCurrency } from '@/core/utils/formatters';

const recurrenceOptions = [['', 'Tidak berulang'], ['MONTH_1', 'Setiap bulan'], ['MONTH_3', 'Setiap 3 bulan'], ['MONTH_6', 'Setiap 6 bulan'], ['YEAR_1', 'Setiap tahun']] as const;

export default function SavingsSetupPage() {
  const theme = getTheme(useColorScheme());
  const params = useLocalSearchParams<{ name?: string | string[]; amount?: string | string[] }>();
  const prefillName = typeof params.name === 'string' ? params.name : '';
  const prefillAmount = typeof params.amount === 'string' && /^\d+$/.test(params.amount) && Number.isSafeInteger(Number(params.amount)) ? params.amount : '';
  const [step, setStep] = useState(0);
  const [name, setName] = useState(prefillName);
  const [amount, setAmount] = useState(prefillAmount);
  const [targetDate, setTargetDate] = useState('');
  const [recurrence, setRecurrence] = useState<(typeof recurrenceOptions)[number][0]>('');
  const [initialAmount, setInitialAmount] = useState('');
  const [fundingMode, setFundingMode] = useState<'VIRTUAL_LOCK' | 'SEPARATE_ACCOUNT'>('VIRTUAL_LOCK');
  const [sourceAccountId, setSourceAccountId] = useState('');
  const [savingsAccountId, setSavingsAccountId] = useState('');
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [dateOpen, setDateOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    edgeApi.accounts().then(({ data }) => { setAccounts(data); setSourceAccountId(data.find((item) => item.is_default)?.id ?? data[0]?.id ?? ''); }).catch((cause) => setError(cause instanceof Error ? cause.message : 'Gagal memuat akun.')).finally(() => setLoading(false));
  }, []);

  const target = Number(amount);
  const initial = Number(initialAmount || 0);
  const validTarget = /^\d+$/.test(amount) && Number.isSafeInteger(target) && target > 0;
  const validInitial = initialAmount === '' || /^\d+$/.test(initialAmount) && Number.isSafeInteger(initial) && initial >= 0 && initial <= target;
  const fundingValid = initial === 0 || !!sourceAccountId && (fundingMode === 'VIRTUAL_LOCK' || !!savingsAccountId && savingsAccountId !== sourceAccountId);
  const canContinue = [!!name.trim() && validTarget, true, validInitial && fundingValid, true][step];

  const save = async () => {
    if (saving || !name.trim() || !validTarget || !validInitial || !fundingValid) return;
    setSaving(true);
    setError('');
    try {
      const [recurrenceUnit, interval] = recurrence.split('_') as ['MONTH' | 'YEAR', string];
      await edgeApi.createGoal({ name: name.trim(), target_amount: target, target_date: targetDate || null, recurrence_unit: recurrenceUnit || null, recurrence_interval: interval ? Number(interval) as 1 | 3 | 6 : null, initial_amount: initial, funding_mode: initial > 0 ? fundingMode : undefined, source_account_id: initial > 0 ? sourceAccountId : undefined, savings_account_id: initial > 0 && fundingMode === 'SEPARATE_ACCOUNT' ? savingsAccountId : null }, idempotencyKey('goal'));
      router.back();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal membuat target tabungan.');
    } finally {
      setSaving(false);
    }
  };

  return <ScreenWrapper withSafeArea style={{ backgroundColor: theme.surfaceHighlight }}>
    <View style={styles.header}><TouchableOpacity accessibilityLabel="Kembali" style={[styles.back, { borderColor: theme.border }]} onPress={() => router.back()}><ArrowLeft color={theme.textPrimary} size={22} /></TouchableOpacity><View><Text style={[styles.title, { color: theme.textPrimary }]} weight="bold">Target tabungan</Text><Text style={{ color: theme.textMuted }}>Rencanakan tujuan finansialmu.</Text></View></View>
    {loading ? <ActivityIndicator color={theme.primary} style={styles.loader} /> : <KeyboardAwareScrollView enableOnAndroid keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
      <View style={styles.stepHeader}><Text style={{ color: theme.textMuted }} weight="bold">Langkah {step + 1} dari 4</Text><View style={[styles.track, { backgroundColor: theme.surfaceMuted }]}><View style={[styles.fill, { width: `${(step + 1) * 25}%`, backgroundColor: theme.accent }]} /></View></View>
      {step === 0 ? <><Text style={[styles.sectionTitle, { color: theme.textPrimary }]} weight="bold">Tentukan tujuanmu</Text><Text style={{ color: theme.textMuted }}>Beri nama yang mudah dikenali, lalu tentukan jumlah yang ingin dikumpulkan.</Text><Field label="Nama target"><TextInput accessibilityLabel="Nama target tabungan" value={name} onChangeText={setName} placeholder="Contoh: Dana darurat" placeholderTextColor={theme.textMuted} style={[styles.input, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.cardBackground }]} /></Field><Field label="Jumlah yang ingin dicapai"><TextInput accessibilityLabel="Jumlah target tabungan" value={amount} onChangeText={(value) => setAmount(value.replace(/\D/g, ''))} keyboardType="numeric" placeholder="Rp 0" placeholderTextColor={theme.textMuted} style={[styles.input, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.cardBackground }]} /></Field>{amount ? <Text style={{ color: validTarget ? theme.income : theme.expense }}>{validTarget ? formatCurrency(target) : 'Nominal tidak valid.'}</Text> : null}</> : null}
      {step === 1 ? <><Text style={[styles.sectionTitle, { color: theme.textPrimary }]} weight="bold">Kapan ingin tercapai?</Text><Text style={{ color: theme.textMuted }}>Tanggal membantu menghitung ritme menabung. Kamu tetap bisa melanjutkan tanpa tanggal.</Text><TouchableOpacity accessibilityRole="button" accessibilityLabel="Pilih tanggal target" onPress={() => setDateOpen(true)} style={[styles.date, { borderColor: theme.border, backgroundColor: theme.cardBackground }]}><Calendar color={theme.deepTeal} size={20} /><Text style={{ color: targetDate ? theme.textPrimary : theme.textMuted }}>{targetDate ? formatLongDate(targetDate) : 'Pilih tanggal (opsional)'}</Text></TouchableOpacity>{targetDate ? <Button title="Hapus tanggal" variant="outline" size="small" onPress={() => setTargetDate('')} /> : null}<Text style={{ color: theme.textMuted }} weight="bold">Pengulangan</Text><View style={styles.choiceList}>{recurrenceOptions.map(([value, label]) => <Choice key={label} selected={recurrence === value} label={label} onPress={() => setRecurrence(value)} theme={theme} />)}</View></> : null}
      {step === 2 ? <><Text style={[styles.sectionTitle, { color: theme.textPrimary }]} weight="bold">Mulai dari berapa?</Text><Text style={{ color: theme.textMuted }}>Kosongkan jika kamu ingin mulai menabung nanti. Dana awal hanya dipindahkan setelah target dibuat.</Text><Field label="Dana awal (opsional)"><TextInput accessibilityLabel="Dana awal target tabungan" value={initialAmount} onChangeText={(value) => setInitialAmount(value.replace(/\D/g, ''))} keyboardType="numeric" placeholder="Rp 0" placeholderTextColor={theme.textMuted} style={[styles.input, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.cardBackground }]} /></Field>{initial > 0 ? <><Text style={{ color: theme.textMuted }} weight="bold">Cara menyimpan</Text><View style={styles.options}><Choice selected={fundingMode === 'VIRTUAL_LOCK'} label="Lindungi di akun" onPress={() => setFundingMode('VIRTUAL_LOCK')} theme={theme} /><Choice selected={fundingMode === 'SEPARATE_ACCOUNT'} label="Rekening terpisah" onPress={() => setFundingMode('SEPARATE_ACCOUNT')} theme={theme} /></View><Text style={{ color: theme.textMuted }} weight="bold">Akun sumber</Text><View style={styles.options}>{accounts.map((account) => <Choice key={account.id} selected={sourceAccountId === account.id} label={`${account.name} · ${formatCurrency(account.balance)}`} onPress={() => { setSourceAccountId(account.id); if (savingsAccountId === account.id) setSavingsAccountId(''); }} theme={theme} />)}</View>{fundingMode === 'SEPARATE_ACCOUNT' ? <><Text style={{ color: theme.textMuted }} weight="bold">Rekening tabungan</Text><View style={styles.options}>{accounts.filter((account) => account.id !== sourceAccountId).map((account) => <Choice key={account.id} selected={savingsAccountId === account.id} label={account.name} onPress={() => setSavingsAccountId(account.id)} theme={theme} />)}</View></> : null}</> : null}{!validInitial ? <Text style={{ color: theme.expense }}>Saldo awal harus berupa bilangan aman dan tidak melebihi target.</Text> : null}</> : null}
      {step === 3 ? <><Text style={[styles.sectionTitle, { color: theme.textPrimary }]} weight="bold">Pastikan semuanya benar</Text><Text style={{ color: theme.textMuted }}>Membuat target tidak mencatat pengeluaran. Jika ada dana awal, dana dipindahkan dari akun pilihan dan tetap menjadi milikmu.</Text><Card variant="teal" style={styles.review}><Text style={{ color: theme.onPrimary }}>{name.trim()}</Text><Text style={[styles.reviewAmount, { color: theme.accent }]} weight="bold">{formatCurrency(target)}</Text></Card><Card variant="surface" style={styles.review}><Text style={{ color: theme.textMuted }}>Target tanggal</Text><Text style={{ color: theme.textPrimary }} weight="bold">{targetDate ? formatLongDate(targetDate) : 'Tanpa tanggal'}</Text><Text style={{ color: theme.textMuted }}>Pengulangan</Text><Text style={{ color: theme.textPrimary }} weight="bold">{recurrenceOptions.find(([value]) => value === recurrence)?.[1]}</Text><Text style={{ color: theme.textMuted }}>Saldo awal</Text><Text style={{ color: theme.textPrimary }} weight="bold">{formatCurrency(initial)}</Text></Card></> : null}
      {error ? <Text style={{ color: theme.expense }}>{error}</Text> : null}<View style={styles.actions}>{step > 0 ? <Button title="Kembali" variant="outline" style={styles.action} disabled={saving} onPress={() => setStep((value) => value - 1)} /> : null}<Button title={step === 3 ? saving ? 'Membuat…' : 'Buat target' : 'Lanjut'} variant={step === 3 ? 'lime' : 'primary'} style={styles.action} disabled={saving || !canContinue} onPress={() => step === 3 ? void save() : setStep((value) => value + 1)} /></View>
    </KeyboardAwareScrollView>}
    <CustomDatePickerModal visible={dateOpen} title="Pilih target tanggal" value={targetDate || todayIso()} onConfirm={(value) => { setTargetDate(value); setDateOpen(false); }} onClose={() => setDateOpen(false)} />
  </ScreenWrapper>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <View style={styles.field}><Text weight="bold">{label}</Text>{children}</View>; }
function Choice({ selected, label, onPress, theme }: { selected: boolean; label: string; onPress: () => void; theme: ReturnType<typeof getTheme> }) { return <TouchableOpacity accessibilityRole="radio" accessibilityState={{ selected }} accessibilityLabel={`${label}${selected ? ', dipilih' : ''}`} onPress={onPress} style={[styles.choice, { borderColor: selected ? theme.primary : theme.border, backgroundColor: selected ? theme.surfaceMuted : theme.cardBackground }]}><View style={[styles.radio, { borderColor: selected ? theme.primary : theme.border }]}>{selected ? <View style={[styles.radioDot, { backgroundColor: theme.primary }]} /> : null}</View><Text style={{ color: theme.textPrimary }} weight={selected ? 'bold' : 'regular'}>{label}</Text></TouchableOpacity>; }

const styles = StyleSheet.create({ header: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 20, paddingBottom: 8 }, back: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, title: { fontSize: 22 }, loader: { marginTop: 40 }, content: { padding: 20, paddingBottom: 48, gap: 14 }, stepHeader: { gap: 8 }, track: { height: 6, borderRadius: 99, overflow: 'hidden' }, fill: { height: '100%', borderRadius: 99 }, sectionTitle: { fontSize: 18 }, field: { gap: 7 }, input: { height: 52, borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, fontSize: 16 }, date: { minHeight: 54, borderWidth: 1, borderRadius: 16, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }, options: { gap: 8 }, choiceList: { gap: 8 }, choice: { minHeight: 52, borderWidth: 1, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: 10 }, radio: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, alignItems: 'center', justifyContent: 'center' }, radioDot: { width: 10, height: 10, borderRadius: 5 }, review: { padding: 18, gap: 8 }, reviewAmount: { fontSize: 26 }, actions: { flexDirection: 'row', gap: 10, marginTop: 6 }, action: { flex: 1 } });
