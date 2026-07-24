import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, TextInput, TouchableOpacity, View, useColorScheme } from 'react-native';
import { ArrowLeft } from 'iconsax-react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

import { ScreenWrapper } from '@/components/common/screen-wrapper';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { edgeApi, idempotencyKey, type Account, type BudgetReductionCandidate, type WindfallAllocation } from '@/core/lib/edge-api';
import { getTheme } from '@/core/theme/colors';
import { formatCurrency } from '@/core/utils/formatters';

type Row = WindfallAllocation & { amount: string; selected: boolean };

export default function IncomeAllocationPage() {
  const theme = getTheme(useColorScheme());
  const params = useLocalSearchParams<{ amount?: string | string[]; accountId?: string | string[]; category?: string | string[]; description?: string | string[]; salary?: string | string[] }>();
  const amountText = typeof params.amount === 'string' ? params.amount : '';
  const accountId = typeof params.accountId === 'string' ? params.accountId : '';
  const category = typeof params.category === 'string' && params.category.length <= 100 ? params.category : '';
  const description = typeof params.description === 'string' && params.description.length <= 500 ? params.description : '';
  const amount = /^\d+$/.test(amountText) ? Number(amountText) : 0;
  const paramsValid = Number.isSafeInteger(amount) && amount > 0 && /^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(accountId);
  const operationKey = useRef(idempotencyKey('income-allocation')).current;
  const salaryRecorded = useRef(false);
  const [step, setStep] = useState(0);
  const [salary, setSalary] = useState(params.salary === '1');
  const [account, setAccount] = useState<Account | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [candidate, setCandidate] = useState<BudgetReductionCandidate | null>(null);
  const [reduction, setReduction] = useState('');
  const [loading, setLoading] = useState(paramsValid);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(paramsValid ? '' : 'Data pemasukan tidak valid.');

  useEffect(() => {
    if (!paramsValid) return;
    Promise.all([edgeApi.accounts(), edgeApi.parserFinancePreview(accountId, amount, 'INCOME'), edgeApi.salaryBudgetCandidate(amount)])
      .then(([accounts, preview, budgetCandidate]) => {
        const owned = accounts.data.find((item) => item.id === accountId) ?? null;
        if (!owned) throw new Error('Akun pemasukan tidak ditemukan.');
        setAccount(owned);
        let remaining = amount;
        setRows([...preview.goals, ...preview.debts].map((item) => { const recommended = Math.min(item.recommended, item.maximum, remaining); remaining -= recommended; return { ...item, amount: String(recommended), selected: recommended > 0 }; }));
        setCandidate(budgetCandidate);
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Gagal memuat alokasi.'))
      .finally(() => setLoading(false));
  }, [accountId, amount, paramsValid]);

  const selected = rows.filter((row) => row.selected && Number(row.amount) > 0);
  const allocated = selected.reduce((sum, row) => sum + Number(row.amount), 0);
  const budgetReduction = salary ? Number(reduction || 0) : 0;
  const valid = selected.every((row) => /^\d+$/.test(row.amount) && Number.isSafeInteger(Number(row.amount)) && Number(row.amount) <= row.maximum) && allocated <= amount && Number.isSafeInteger(budgetReduction) && budgetReduction >= 0 && budgetReduction <= (candidate?.reducible ?? 0) && budgetReduction <= selected.filter((row) => row.kind === 'GOAL').reduce((sum, row) => sum + Number(row.amount), 0);

  const confirm = async () => {
    if (!valid || saving || !account) return;
    setSaving(true);
    setError('');
    try {
      let reductionLeft = budgetReduction;
      const reductionGoals = selected.filter((row) => row.kind === 'GOAL').map((row) => { const value = Math.min(Number(row.amount), reductionLeft); reductionLeft -= value; return { id: row.id, version: row.version, amount: value }; }).filter((row) => row.amount > 0);
      const direct = selected.map((row) => ({ ...row, value: Number(row.amount) - (reductionGoals.find((goal) => goal.id === row.id)?.amount ?? 0) })).filter((row) => row.value > 0);
      if (salary) {
        if (!salaryRecorded.current) { await edgeApi.recordSalaryIncome({ account_id: account.id, amount, category_name: category || null, description: description || null }, operationKey); salaryRecorded.current = true; }
        for (const row of direct) {
          if (row.kind === 'GOAL') await edgeApi.createGoalMutation(row.id, { account_id: account.id, kind: 'DEPOSIT', amount: row.value, note: 'Alokasi pemasukan gaji' }, row.version, `${operationKey}-goal-${row.id}`);
          else await edgeApi.createDebtPayment(row.id, { account_id: account.id, amount: row.value, note: 'Alokasi pemasukan gaji' }, row.version, `${operationKey}-debt-${row.id}`);
        }
        if (budgetReduction > 0 && candidate) await edgeApi.applySalaryBudgetReduction({ allocation: candidate, amount: budgetReduction, account_id: account.id, goals: reductionGoals }, `${operationKey}-budget`);
      } else await edgeApi.applyWindfallSplit({ account_id: account.id, amount, category_name: category || null, description: description || null, allocations: selected.map((row) => ({ id: row.id, kind: row.kind, amount: Number(row.amount) })) }, operationKey);
      router.replace('/(main)');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal menyimpan pembagian pemasukan.');
    } finally {
      setSaving(false);
    }
  };

  return <ScreenWrapper withSafeArea style={{ backgroundColor: theme.surfaceHighlight }}>
    <View style={styles.header}><TouchableOpacity accessibilityLabel="Kembali" style={[styles.back, { borderColor: theme.border }]} onPress={() => router.back()}><ArrowLeft color={theme.textPrimary} size={22} /></TouchableOpacity><View><Text style={[styles.title, { color: theme.textPrimary }]} weight="bold">Pembagian pemasukan</Text><Text style={{ color: theme.textMuted }}>Atur uang sebelum dicatat.</Text></View></View>
    {loading ? <ActivityIndicator color={theme.primary} style={styles.loader} /> : <KeyboardAwareScrollView enableOnAndroid keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
      <View style={styles.stepHeader}><Text style={{ color: theme.textMuted }} weight="bold">Langkah {step + 1} dari 3</Text><View style={[styles.track, { backgroundColor: theme.surfaceMuted }]}><View style={[styles.fill, { width: `${(step + 1) * 100 / 3}%`, backgroundColor: theme.accent }]} /></View></View>
      {step === 0 ? <><Text style={[styles.sectionTitle, { color: theme.textPrimary }]} weight="bold">Tinjau pemasukan</Text><Card variant="teal" style={styles.card}><Text style={{ color: theme.onPrimary }}>{account?.name ?? 'Akun tidak valid'}</Text><Text style={[styles.amount, { color: theme.accent }]} weight="bold">{formatCurrency(amount)}</Text><Text style={{ color: theme.onPrimary }}>{description || category || 'Tanpa deskripsi'}</Text></Card><Text style={{ color: theme.textMuted }} weight="bold">Jenis pemasukan</Text><View style={styles.options}><Choice label="Gaji" selected={salary} onPress={() => setSalary(true)} theme={theme} /><Choice label="Pemasukan tak terduga" selected={!salary} onPress={() => setSalary(false)} theme={theme} /></View></> : null}
      {step === 1 ? <><Text style={[styles.sectionTitle, { color: theme.textPrimary }]} weight="bold">Bagi ke kebutuhan penting</Text><Text style={{ color: theme.textMuted }}>Pilih tujuan, lalu ubah nominal bila perlu. Uang yang tidak dibagi tetap masuk sebagai saldo bebas.</Text><Card variant="teal" style={styles.remainder}><Text style={{ color: theme.onPrimary }}>Sisa yang belum dibagi</Text><Text style={[styles.remainderAmount, { color: theme.accent }]} weight="bold">{formatCurrency(amount - allocated)}</Text></Card>{rows.length ? rows.map((row, index) => <Card key={`${row.kind}-${row.id}`} variant={row.selected ? 'surface' : 'default'} style={[styles.row, { borderColor: row.selected ? theme.primary : theme.border, borderWidth: 1 }]}><TouchableOpacity accessibilityRole="checkbox" accessibilityState={{ checked: row.selected }} accessibilityLabel={`${row.name}, ${row.selected ? 'dipilih' : 'tidak dipilih'}`} style={styles.rowToggle} onPress={() => setRows((current) => current.map((item, i) => i === index ? { ...item, selected: !item.selected } : item))}><View style={[styles.checkbox, { borderColor: row.selected ? theme.primary : theme.border, backgroundColor: row.selected ? theme.primary : theme.cardBackground }]}><Text style={{ color: row.selected ? theme.onPrimary : theme.textMuted }} weight="bold">{row.selected ? '✓' : ''}</Text></View><View style={styles.rowCopy}><Text style={{ color: theme.textPrimary }} weight="bold">{row.name}</Text><Text style={{ color: theme.textMuted }}>{row.kind === 'GOAL' ? 'Target tabungan' : 'Pembayaran utang'} · maks. {formatCurrency(row.maximum)}</Text></View></TouchableOpacity><TextInput accessibilityLabel={`Nominal untuk ${row.name}`} editable={row.selected} value={row.amount} onChangeText={(value) => setRows((current) => current.map((item, i) => i === index ? { ...item, amount: value.replace(/\D/g, '') } : item))} keyboardType="numeric" placeholder="Rp 0" placeholderTextColor={theme.textMuted} style={[styles.input, { color: theme.textPrimary, borderColor: theme.border }]} /><Button title="Gunakan maksimum" variant="outline" size="small" disabled={!row.selected} onPress={() => setRows((current) => current.map((item, i) => i === index ? { ...item, amount: String(Math.min(item.maximum, amount)) } : item))} /></Card>) : <Card variant="surface" style={styles.card}><Text style={{ color: theme.textMuted }}>Belum ada goal atau utang yang dapat dialokasikan.</Text></Card>}{salary && candidate ? <><View style={[styles.divider, { backgroundColor: theme.border }]} /><Text style={{ color: theme.textMuted }} weight="bold">PENYESUAIAN BUDGET GAJI</Text><Card variant="surface" style={styles.row}><Text style={{ color: theme.textPrimary }} weight="bold">Kurangi budget hiburan</Text><Text style={{ color: theme.textMuted }}>{candidate.label} · maksimum {formatCurrency(candidate.reducible)}</Text><TextInput value={reduction} onChangeText={(value) => setReduction(value.replace(/\D/g, ''))} keyboardType="numeric" placeholder="Rp 0" placeholderTextColor={theme.textMuted} style={[styles.input, { color: theme.textPrimary, borderColor: theme.border }]} /></Card></> : null}{!valid ? <Text style={{ color: theme.expense }}>Alokasi harus berupa bilangan aman, sesuai maksimum, dan total tidak melebihi pemasukan. Pengurangan budget harus dialokasikan ke goal.</Text> : null}</> : null}
      {step === 2 ? <><Text style={[styles.sectionTitle, { color: theme.textPrimary }]} weight="bold">Konfirmasi pembagian</Text><Card variant="teal" style={styles.card}><Text style={{ color: theme.onPrimary }}>Pemasukan</Text><Text style={[styles.amount, { color: theme.accent }]} weight="bold">{formatCurrency(amount)}</Text><Text style={{ color: theme.onPrimary }}>Dialokasikan {formatCurrency(allocated)}</Text><Text style={{ color: theme.onPrimary }}>Sisa bebas {formatCurrency(amount - allocated)}</Text></Card><Card variant="surface" style={styles.card}>{selected.map((row) => <View key={`${row.kind}-${row.id}`} style={styles.summary}><Text style={{ color: theme.textPrimary }}>{row.name}</Text><Text style={{ color: theme.textPrimary }} weight="bold">{formatCurrency(Number(row.amount))}</Text></View>)}{budgetReduction > 0 ? <Text style={{ color: theme.textMuted }}>Termasuk pengurangan budget {formatCurrency(budgetReduction)}</Text> : null}{!selected.length ? <Text style={{ color: theme.textMuted }}>Tidak ada alokasi. Seluruh pemasukan menjadi saldo bebas.</Text> : null}</Card><Text style={{ color: theme.textMuted }}>Pemasukan baru dicatat setelah tombol konfirmasi ditekan.</Text></> : null}
      {error ? <Text style={{ color: theme.expense }}>{error}</Text> : null}<View style={styles.actions}>{step > 0 ? <Button title="Kembali" variant="outline" style={styles.action} disabled={saving} onPress={() => setStep((value) => value - 1)} /> : null}<Button title={step === 2 ? saving ? 'Menyimpan…' : 'Konfirmasi & catat' : 'Lanjut'} variant={step === 2 ? 'lime' : 'primary'} style={styles.action} disabled={saving || !paramsValid || !account || step === 1 && !valid} onPress={() => step === 2 ? void confirm() : setStep((value) => value + 1)} /></View>
    </KeyboardAwareScrollView>}
  </ScreenWrapper>;
}

function Choice({ label, selected, onPress, theme }: { label: string; selected: boolean; onPress: () => void; theme: ReturnType<typeof getTheme> }) { return <TouchableOpacity accessibilityRole="radio" accessibilityState={{ selected }} onPress={onPress} style={[styles.choice, { borderColor: selected ? theme.primary : theme.border, backgroundColor: selected ? theme.surfaceMuted : theme.cardBackground }]}><Text style={{ color: theme.textPrimary }} weight={selected ? 'bold' : 'regular'}>{label}</Text></TouchableOpacity>; }

const styles = StyleSheet.create({ header: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 20, paddingBottom: 8 }, back: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, title: { fontSize: 22 }, loader: { marginTop: 40 }, content: { padding: 20, paddingBottom: 48, gap: 14 }, stepHeader: { gap: 8 }, track: { height: 6, borderRadius: 99, overflow: 'hidden' }, fill: { height: '100%', borderRadius: 99 }, sectionTitle: { fontSize: 18 }, card: { padding: 18, gap: 8 }, amount: { fontSize: 28 }, options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, choice: { borderWidth: 1, borderRadius: 16, paddingHorizontal: 13, paddingVertical: 11 }, row: { padding: 15, gap: 10 }, remainder: { padding: 18, gap: 5 }, remainderAmount: { fontSize: 26 }, rowToggle: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 12 }, checkbox: { width: 24, height: 24, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center' }, rowCopy: { flex: 1, gap: 3 }, divider: { height: 1, marginVertical: 4 }, input: { height: 48, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14 }, summary: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 }, actions: { flexDirection: 'row', gap: 10, marginTop: 6 }, action: { flex: 1 } });
