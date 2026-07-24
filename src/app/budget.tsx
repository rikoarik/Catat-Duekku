import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, StyleSheet, TextInput, TouchableOpacity, View, useColorScheme } from 'react-native';
import { ArrowLeft, ArrowSwapHorizontal, Calendar, MoneyRecive, ShieldTick } from 'iconsax-react-native';
import { router, useFocusEffect } from 'expo-router';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

import { ScreenWrapper } from '@/components/common/screen-wrapper';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { CustomDatePickerModal } from '@/components/ui/custom-date-picker-modal';
import { Text } from '@/components/ui/text';
import { edgeApi, type Account, type BudgetAllocationEvent, type BudgetCycleSummary, type BudgetPace } from '@/core/lib/edge-api';
import { todayIso } from '@/core/lib/dates';
import { getTheme } from '@/core/theme/colors';
import { formatCurrency } from '@/core/utils/formatters';

type DraftAllocation = { category_id: string; label: string; amount: string; kind: 'CATEGORY' | 'OBLIGATION' };

export default function BudgetPage() {
  const theme = getTheme(useColorScheme());
  const [summary, setSummary] = useState<BudgetCycleSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [income, setIncome] = useState('');
  const [minimumBalance, setMinimumBalance] = useState('');
  const [savingsTarget, setSavingsTarget] = useState('');
  const [startDate, setStartDate] = useState(todayIso());
  const [endDate, setEndDate] = useState(() => { const date = new Date(); date.setMonth(date.getMonth() + 1); return date.toISOString().slice(0, 10); });
  const [dateTarget, setDateTarget] = useState<'start' | 'end' | null>(null);
  const [allocations, setAllocations] = useState<DraftAllocation[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [history, setHistory] = useState<BudgetAllocationEvent[]>([]);
  const [pace, setPace] = useState<BudgetPace[]>([]);
  const [sourceId, setSourceId] = useState('');
  const [destinationId, setDestinationId] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [transferError, setTransferError] = useState('');
  const [closing, setClosing] = useState(false);
  const [setupStep, setSetupStep] = useState(0);

  const load = useCallback(async (pull = false) => {
    if (pull) setRefreshing(true); else setLoading(true);
    setError('');
    try {
      const [budget, categoryResult, accountResult] = await Promise.all([edgeApi.budgetCycle(), edgeApi.categories(), edgeApi.accounts()]);
      setSummary(budget);
      if (budget) { const [events, paceResult] = await Promise.all([edgeApi.budgetAllocationHistory(budget.cycle.id), edgeApi.budgetPace(budget.cycle.id)]); setHistory(events); setPace(paceResult); } else { setHistory([]); setPace([]); }
      const selectableAccounts = accountResult.data.filter((item) => item.kind !== 'INVESTMENT');
      setAccounts(selectableAccounts);
      setSelectedAccountIds((current) => current.length ? current : selectableAccounts.map((item) => item.id));
      const expense = categoryResult.data.filter((item) => item.type === 'EXPENSE');
      setAllocations((current) => current.length ? current : expense.slice(0, 5).map((item) => ({ category_id: item.id, label: item.name, amount: '', kind: item.name.toLowerCase().includes('tagihan') ? 'OBLIGATION' : 'CATEGORY' })));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal memuat budget.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const allocated = useMemo(() => allocations.reduce((total, item) => total + (Number(item.amount) || 0), 0), [allocations]);
  const planDifference = Number(income || 0) - Number(minimumBalance || 0) - Number(savingsTarget || 0) - allocated;
  const available = Math.max(0, planDifference);
  const operationalBalance = accounts.filter((item) => selectedAccountIds.includes(item.id)).reduce((total, item) => total + item.balance, 0);
  const obligations = allocations.filter((item) => item.kind === 'OBLIGATION').reduce((total, item) => total + (Number(item.amount) || 0), 0);
  const safeNow = Math.max(0, operationalBalance - Number(minimumBalance || 0) - Number(savingsTarget || 0) - obligations);
  const canContinue = [Number(income) > 0 && endDate > startDate, selectedAccountIds.length > 0, Number(minimumBalance || 0) >= 0 && Number(savingsTarget || 0) >= 0, allocated > 0 && planDifference >= 0, true][setupStep];

  const source = summary?.allocations.find((item) => item.id === sourceId);
  const destination = summary?.allocations.find((item) => item.id === destinationId);
  const amount = Number(transferAmount);

  const confirmTransfer = async () => {
    if (!source || !destination || amount < 1 || amount >= source.allocated_amount) return;
    setTransferring(true);
    setTransferError('');
    try {
      await edgeApi.transferBudgetAllocation({ source_id: source.id, destination_id: destination.id, amount, source_version: source.version, destination_version: destination.version });
      setTransferOpen(false);
      setSourceId('');
      setDestinationId('');
      setTransferAmount('');
      await load();
    } catch (cause) {
      setTransferError(cause instanceof Error ? cause.message : 'Gagal memindahkan alokasi.');
    } finally {
      setTransferring(false);
    }
  };

  const closeCycle = async () => {
    if (!summary || closing) return;
    setClosing(true);
    setError('');
    try {
      await edgeApi.closeBudgetCycle(summary.cycle.id);
      setSummary(null);
      setHistory([]);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal menutup periode budget.');
    } finally {
      setClosing(false);
    }
  };

  const save = async () => {
    if (saving || !Number(income) || endDate <= startDate) return;
    setSaving(true);
    setError('');
    try {
      await edgeApi.setupBudgetCycle({ name: 'Siklus gaji', start_date: startDate, end_date: endDate, planned_income: Number(income), expected_income_date: endDate, minimum_balance: Number(minimumBalance || 0), savings_target: Number(savingsTarget || 0), account_ids: selectedAccountIds, allocations: allocations.filter((item) => Number(item.amount) > 0).map((item, index) => ({ ...item, amount: Number(item.amount), sort_order: index })) });
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal mengaktifkan budget.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenWrapper withSafeArea style={{ backgroundColor: theme.surfaceHighlight }}>
      <View style={styles.header}><TouchableOpacity accessibilityLabel="Kembali" style={[styles.back, { borderColor: theme.border }]} onPress={() => router.back()}><ArrowLeft color={theme.textPrimary} size={22} /></TouchableOpacity><View><Text style={[styles.title, { color: theme.textPrimary }]} weight="bold">Budgeting</Text><Text style={[styles.subtitle, { color: theme.textMuted }]}>Mengikuti siklus gajianmu.</Text></View></View>
      {loading ? <ActivityIndicator color={theme.primary} style={styles.loader} /> : summary ? (
        <KeyboardAwareScrollView enableOnAndroid keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} colors={[theme.accent]} tintColor={theme.deepTeal} />}>
          {error ? <Text style={{ color: theme.expense }}>{error}</Text> : null}
          <Card variant="teal" style={styles.hero}><ShieldTick color={theme.accent} size={28} variant="Bold" /><Text style={[styles.heroLabel, { color: theme.onPrimary }]}>Aman digunakan</Text><Text style={[styles.heroValue, { color: theme.accent }]} weight="bold">{formatCurrency(summary.totals.safe_to_spend)}</Text><Text style={[styles.heroMeta, { color: theme.onPrimary }]}>{formatCurrency(summary.totals.daily_safe_limit)} / hari · sampai {summary.cycle.end_date}</Text></Card>
           <View style={styles.metrics}><Metric label="Saldo operasional" value={summary.totals.operational_balance} theme={theme} /><Metric label="Pengeluaran aktual" value={summary.totals.actual_expense} theme={theme} /></View>
           <Card variant="surface" style={styles.protected}><Text style={{ color: theme.textPrimary }} weight="bold">Jika pemasukan masuk</Text><Text style={{ color: theme.textMuted }}>Perkiraan {formatCurrency(summary.totals.expected_income)}</Text><Text style={{ color: theme.textPrimary }} weight="bold">Proyeksi aman {formatCurrency(summary.totals.projected_safe_to_spend)}</Text></Card>

          <Card variant="surface" style={styles.protected}><Text style={{ color: theme.textPrimary }} weight="bold">Uang terlindungi</Text><Text style={{ color: theme.textMuted }}>Saldo minimum {formatCurrency(summary.cycle.minimum_balance)}</Text><Text style={{ color: theme.textMuted }}>Target tabungan {formatCurrency(summary.cycle.savings_target)}</Text><Text style={{ color: theme.textMuted }}>Kewajiban tersisa {formatCurrency(summary.totals.remaining_obligations)}</Text></Card>
           {pace.some((item) => item.pace_status !== 'ON_TRACK') ? <><Text style={[styles.sectionTitle, { color: theme.textPrimary }]} weight="bold">Perlu perhatian</Text>{pace.filter((item) => item.pace_status !== 'ON_TRACK').map((item) => <Card key={item.allocation_id} variant="outline" style={[styles.paceAlert, { borderColor: theme.expense }]}><View style={styles.allocationHeader}><Text style={{ color: theme.textPrimary }} weight="bold">{item.label}</Text><Text style={{ color: theme.expense }} weight="bold">{item.actual_percent}%</Text></View><Text style={{ color: theme.textMuted }}>{item.pace_status === 'OVERSPENT' ? 'Budget sudah terlampaui.' : `Periode baru berjalan ${item.expected_percent}%, tetapi budget sudah terpakai ${item.actual_percent}%.`}</Text>{item.days_early > 0 ? <Text style={{ color: theme.expense }} weight="bold">Diperkirakan habis {item.days_early} hari sebelum periode selesai.</Text> : null}<Text style={{ color: theme.textMuted }}>Kamu dapat memindahkan alokasi di bawah atau membiarkannya tetap.</Text></Card>)}</> : null}
           <Text style={[styles.sectionTitle, { color: theme.textPrimary }]} weight="bold">Alokasi</Text>

           {summary.allocations.map((item) => <Card key={item.id} variant="default" style={styles.allocation}><View style={styles.allocationHeader}><View><Text style={{ color: theme.textPrimary }} weight="bold">{item.label}</Text><Text style={[styles.allocationMeta, { color: theme.textMuted }]}>{item.kind === 'OBLIGATION' ? 'Wajib' : 'Fleksibel'} · {formatCurrency(item.used_amount)} terpakai</Text></View><Text style={{ color: item.overspent_amount > 0 ? theme.expense : theme.textPrimary }} weight="bold">{item.overspent_amount > 0 ? `-${formatCurrency(item.overspent_amount)}` : formatCurrency(item.remaining_amount)}</Text></View><View style={[styles.track, { backgroundColor: theme.surfaceMuted }]}><View style={[styles.fill, { width: `${Math.min(item.percent_used, 100)}%`, backgroundColor: item.overspent_amount > 0 ? theme.expense : theme.accent }]} /></View></Card>)}
           {summary.allocations.length > 1 ? <Card variant="surface" style={styles.transfer}><View style={styles.transferTitle}><ArrowSwapHorizontal color={theme.deepTeal} size={22} /><View><Text style={{ color: theme.textPrimary }} weight="bold">Pindahkan alokasi</Text><Text style={{ color: theme.textMuted }}>Saldo rekening tidak berubah.</Text></View></View><Text style={{ color: theme.textMuted }} weight="bold">Dari</Text><View style={styles.chips}>{summary.allocations.map((item) => <TouchableOpacity key={item.id} onPress={() => { setSourceId(item.id); if (destinationId === item.id) setDestinationId(''); }} style={[styles.chip, { borderColor: sourceId === item.id ? theme.primary : theme.border, backgroundColor: sourceId === item.id ? theme.surfaceMuted : theme.cardBackground }]}><Text style={{ color: theme.textPrimary }}>{item.label}</Text></TouchableOpacity>)}</View><Text style={{ color: theme.textMuted }} weight="bold">Ke</Text><View style={styles.chips}>{summary.allocations.filter((item) => item.id !== sourceId).map((item) => <TouchableOpacity key={item.id} onPress={() => setDestinationId(item.id)} style={[styles.chip, { borderColor: destinationId === item.id ? theme.primary : theme.border, backgroundColor: destinationId === item.id ? theme.surfaceMuted : theme.cardBackground }]}><Text style={{ color: theme.textPrimary }}>{item.label}</Text></TouchableOpacity>)}</View><TextInput value={transferAmount} onChangeText={(value) => setTransferAmount(value.replace(/\D/g, ''))} keyboardType="numeric" placeholder="Jumlah yang dipindahkan" placeholderTextColor={theme.textMuted} style={[styles.input, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.cardBackground }]} /><Button title="Tinjau pemindahan" variant="primary" disabled={!source || !destination || amount < 1 || amount >= (source?.allocated_amount ?? 0)} onPress={() => { setTransferError(''); setTransferOpen(true); }} /></Card> : null}
           {history.length ? <><Text style={[styles.sectionTitle, { color: theme.textPrimary }]} weight="bold">Riwayat perubahan</Text>{history.map((item) => <Card key={item.id} variant="outline" style={styles.history}><Text style={{ color: theme.textPrimary }} weight="bold">{item.event_type === 'TRANSFERRED' ? `${item.source_label} → ${item.destination_label}` : `Budget ${item.destination_label} dibuat`}</Text><Text style={{ color: theme.textMuted }}>{item.amount ? formatCurrency(item.amount) : 'Alokasi awal'} · {new Date(item.occurred_at).toLocaleDateString('id-ID')}</Text></Card>)}</> : null}
           {todayIso() >= summary.cycle.end_date ? <Button title={closing ? 'Menutup periode…' : 'Tutup periode & buat budget baru'} variant="outline" disabled={closing} onPress={() => void closeCycle()} /> : null}
         </KeyboardAwareScrollView>

      ) : (
        <KeyboardAwareScrollView enableOnAndroid keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
          <View style={styles.stepHeader}><Text style={{ color: theme.textMuted }} weight="bold">Langkah {setupStep + 1} dari 5</Text><View style={[styles.stepTrack, { backgroundColor: theme.surfaceMuted }]}><View style={[styles.stepFill, { width: `${(setupStep + 1) * 20}%`, backgroundColor: theme.accent }]} /></View></View>
          {setupStep === 0 ? <><Card variant="surface" style={styles.intro}><MoneyRecive color={theme.deepTeal} size={26} variant="Bold" /><Text style={[styles.sectionTitle, { color: theme.textPrimary }]} weight="bold">Sampai kapan uang harus bertahan?</Text><Text style={{ color: theme.textMuted }}>Pemasukan berikutnya hanya dipakai sebagai proyeksi sampai benar-benar diterima.</Text></Card><MoneyInput label="Pemasukan berikutnya (belum diterima)" value={income} onChange={setIncome} theme={theme} /><View style={styles.dateRow}><DateButton label="Mulai" value={startDate} onPress={() => setDateTarget('start')} theme={theme} /><DateButton label="Gajian berikutnya" value={endDate} onPress={() => setDateTarget('end')} theme={theme} /></View></> : null}
          {setupStep === 1 ? <><Text style={[styles.sectionTitle, { color: theme.textPrimary }]} weight="bold">Pilih uang operasional</Text><Text style={{ color: theme.textMuted }}>Tabungan yang tidak ingin dibelanjakan sebaiknya tidak dipilih.</Text><View style={styles.chips}>{accounts.map((item) => { const selected = selectedAccountIds.includes(item.id); return <TouchableOpacity key={item.id} onPress={() => setSelectedAccountIds((current) => selected ? current.filter((id) => id !== item.id) : [...current, item.id])} style={[styles.accountChip, { borderColor: selected ? theme.primary : theme.border, backgroundColor: selected ? theme.surfaceMuted : theme.cardBackground }]}><Text style={{ color: theme.textPrimary }} weight="bold">{item.name}</Text><Text style={{ color: theme.textMuted }}>{formatCurrency(item.balance)}</Text></TouchableOpacity>; })}</View><Card variant="teal" style={styles.review}><Text style={{ color: theme.onPrimary }}>Uang tersedia sekarang</Text><Text style={{ color: theme.accent, fontSize: 24 }} weight="bold">{formatCurrency(operationalBalance)}</Text></Card></> : null}
          {setupStep === 2 ? <><Text style={[styles.sectionTitle, { color: theme.textPrimary }]} weight="bold">Lindungi uang penting</Text><Text style={{ color: theme.textMuted }}>Nominal ini tidak dianggap uang bebas.</Text><MoneyInput label="Saldo minimum" value={minimumBalance} onChange={setMinimumBalance} theme={theme} /><MoneyInput label="Target tabungan" value={savingsTarget} onChange={setSavingsTarget} theme={theme} /></> : null}
          {setupStep === 3 ? <><Text style={[styles.sectionTitle, { color: theme.textPrimary }]} weight="bold">Biaya wajib & kebutuhan</Text><Text style={{ color: theme.textMuted }}>Tandai kewajiban agar uangnya diamankan lebih dulu.</Text>{allocations.map((item, index) => <View key={item.category_id} style={[styles.allocationInput, { borderColor: theme.border, backgroundColor: theme.cardBackground }]}><View style={styles.allocationInputHeader}><Text style={{ color: theme.textPrimary }} weight="bold">{item.label}</Text><TouchableOpacity onPress={() => setAllocations((current) => current.map((entry, i) => i === index ? { ...entry, kind: entry.kind === 'CATEGORY' ? 'OBLIGATION' : 'CATEGORY' } : entry))}><Text style={{ color: theme.primary }} weight="bold">{item.kind === 'OBLIGATION' ? 'Wajib' : 'Fleksibel'}</Text></TouchableOpacity></View><TextInput value={item.amount} onChangeText={(value) => setAllocations((current) => current.map((entry, i) => i === index ? { ...entry, amount: value.replace(/\D/g, '') } : entry))} keyboardType="numeric" placeholder="Rp 0" placeholderTextColor={theme.textMuted} style={[styles.moneyField, { color: theme.textPrimary }]} /></View>)}<Card variant={planDifference < 0 ? "outline" : "teal"} style={styles.review}><Text style={{ color: planDifference < 0 ? theme.expense : theme.onPrimary }}>{planDifference < 0 ? 'Rencana kekurangan' : 'Sisa belum dialokasikan'}</Text><Text style={{ color: planDifference < 0 ? theme.expense : theme.accent, fontSize: 24 }} weight="bold">{formatCurrency(Math.abs(planDifference))}</Text></Card></> : null}
          {setupStep === 4 ? <><Text style={[styles.sectionTitle, { color: theme.textPrimary }]} weight="bold">Tinjau sebelum aktif</Text><Card variant="default" style={styles.protected}><Text style={{ color: theme.textPrimary }} weight="bold">Kondisi sekarang</Text><Text style={{ color: theme.textMuted }}>Saldo operasional {formatCurrency(operationalBalance)}</Text><Text style={{ color: theme.textMuted }}>Kewajiban {formatCurrency(obligations)}</Text><Text style={{ color: theme.textMuted }}>Cadangan & tabungan {formatCurrency(Number(minimumBalance || 0) + Number(savingsTarget || 0))}</Text><Text style={{ color: safeNow > 0 ? theme.income : theme.expense }} weight="bold">Aman digunakan sekarang {formatCurrency(safeNow)}</Text></Card><Card variant="surface" style={styles.protected}><Text style={{ color: theme.textPrimary }} weight="bold">Jika pemasukan masuk</Text><Text style={{ color: theme.textMuted }}>Proyeksi pemasukan {formatCurrency(Number(income || 0))}</Text><Text style={{ color: theme.textPrimary }} weight="bold">Sisa rencana {formatCurrency(available)}</Text></Card></> : null}
          {error ? <Text style={{ color: theme.expense }}>{error}</Text> : null}
          <View style={styles.stepActions}>{setupStep > 0 ? <Button title="Kembali" variant="outline" style={styles.stepButton} disabled={saving} onPress={() => setSetupStep((step) => step - 1)} /> : null}<Button title={setupStep === 4 ? saving ? 'Mengaktifkan…' : 'Aktifkan budget' : 'Lanjut'} variant={setupStep === 4 ? 'lime' : 'primary'} style={styles.stepButton} disabled={saving || !canContinue} onPress={() => setupStep === 4 ? void save() : setSetupStep((step) => step + 1)} /></View>
        </KeyboardAwareScrollView>
      )}
      <CustomDatePickerModal visible={dateTarget !== null} title="Pilih tanggal" value={dateTarget === 'start' ? startDate : endDate} onConfirm={(value) => { if (dateTarget === 'start') setStartDate(value); else setEndDate(value); setDateTarget(null); }} onClose={() => setDateTarget(null)} />
      <ConfirmationModal visible={transferOpen} title="Pindahkan alokasi?" message={`${formatCurrency(amount)} dari ${source?.label ?? ''} ke ${destination?.label ?? ''}. Saldo rekening tidak berubah.`} cancelLabel="Batal" confirmLabel="Pindahkan" busy={transferring} error={transferError} onCancel={() => setTransferOpen(false)} onConfirm={() => void confirmTransfer()} />
    </ScreenWrapper>
  );
}

function MoneyInput({ label, value, onChange, theme }: { label: string; value: string; onChange: (value: string) => void; theme: ReturnType<typeof getTheme> }) { return <View style={styles.field}><Text style={{ color: theme.textMuted }} weight="bold">{label}</Text><TextInput value={value} onChangeText={(text) => onChange(text.replace(/\D/g, ''))} keyboardType="numeric" placeholder="Rp 0" placeholderTextColor={theme.textMuted} style={[styles.input, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.cardBackground }]} /></View>; }
function DateButton({ label, value, onPress, theme }: { label: string; value: string; onPress: () => void; theme: ReturnType<typeof getTheme> }) { return <TouchableOpacity onPress={onPress} style={[styles.dateButton, { borderColor: theme.border, backgroundColor: theme.cardBackground }]}><Calendar color={theme.deepTeal} size={18} /><Text style={{ color: theme.textMuted }}>{label}</Text><Text style={{ color: theme.textPrimary }} weight="bold">{value}</Text></TouchableOpacity>; }
function Metric({ label, value, theme }: { label: string; value: number; theme: ReturnType<typeof getTheme> }) { return <Card variant="default" style={styles.metric}><Text style={{ color: theme.textMuted }}>{label}</Text><Text style={{ color: theme.textPrimary }} weight="bold">{formatCurrency(value)}</Text></Card>; }

const styles = StyleSheet.create({ paceAlert: { padding: 16, gap: 8, borderWidth: 1 }, stepHeader: { gap: 8 }, stepTrack: { height: 6, borderRadius: 99, overflow: 'hidden' }, stepFill: { height: '100%', borderRadius: 99 }, stepActions: { flexDirection: 'row', gap: 10, marginTop: 6 }, stepButton: { flex: 1 }, accountChip: { width: '48%', borderWidth: 1, borderRadius: 18, padding: 14, gap: 4 }, header: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 20, paddingBottom: 8 }, back: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, title: { fontSize: 22 }, subtitle: { fontSize: 12, marginTop: 2 }, loader: { marginTop: 40 }, content: { padding: 20, paddingBottom: 48, gap: 14 }, hero: { padding: 22, alignItems: 'center' }, heroLabel: { marginTop: 10 }, heroValue: { fontSize: 30, marginTop: 6 }, heroMeta: { fontSize: 12, marginTop: 6 }, metrics: { flexDirection: 'row', gap: 10 }, metric: { flex: 1, padding: 14, gap: 6 }, protected: { padding: 16, gap: 7 }, sectionTitle: { fontSize: 18 }, allocation: { padding: 15, gap: 10 }, allocationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 }, allocationMeta: { fontSize: 11, marginTop: 4 }, track: { height: 7, borderRadius: 99, overflow: 'hidden' }, fill: { height: '100%', borderRadius: 99 }, transfer: { padding: 16, gap: 12 }, transferTitle: { flexDirection: 'row', alignItems: 'center', gap: 10 }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, chip: { borderWidth: 1, borderRadius: 99, paddingHorizontal: 12, paddingVertical: 8 }, history: { padding: 14, gap: 5 }, intro: { padding: 18, gap: 8 }, field: { gap: 7 }, input: { height: 52, borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, fontSize: 16 }, dateRow: { flexDirection: 'row', gap: 10 }, dateButton: { flex: 1, minHeight: 82, borderWidth: 1, borderRadius: 16, padding: 12, gap: 5 }, allocationInput: { borderWidth: 1, borderRadius: 18, padding: 14 }, allocationInputHeader: { flexDirection: 'row', justifyContent: 'space-between' }, moneyField: { fontSize: 18, fontWeight: '700', paddingTop: 12 }, review: { padding: 18, gap: 5 }, });
