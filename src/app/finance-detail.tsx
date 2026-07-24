import { useCallback, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, TextInput, TouchableOpacity, View, useColorScheme } from 'react-native';
import { ArrowLeft, CardReceive, EmptyWalletChange, WalletAdd } from 'iconsax-react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

import { ScreenWrapper } from '@/components/common/screen-wrapper';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ConfirmationModal } from '@/components/ui/confirmation-modal';
import { Text } from '@/components/ui/text';
import { edgeApi, idempotencyKey, type Account, type Category, type Debt, type DebtPayment, type GoalRecovery, type SavingGoal, type SavingMutation, type SavingsRecommendations } from '@/core/lib/edge-api';
import { getTheme } from '@/core/theme/colors';
import { formatCurrency } from '@/core/utils/formatters';

type DetailItem = Debt | SavingGoal;
type HistoryItem = DebtPayment | SavingMutation;

export default function FinanceDetailPage() {
  const { id, type } = useLocalSearchParams<{ id: string; type: 'savings' | 'debt' }>();
  const theme = getTheme(useColorScheme());
  const [item, setItem] = useState<DetailItem | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [mutationKind, setMutationKind] = useState<SavingMutation['kind']>('DEPOSIT');
  const [saving, setSaving] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState('');
  const [fundingMode, setFundingMode] = useState<'VIRTUAL_LOCK' | 'SEPARATE_ACCOUNT'>('VIRTUAL_LOCK');
  const [savingsAccountId, setSavingsAccountId] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [recommendations, setRecommendations] = useState<SavingsRecommendations | null>(null);
  const [goals, setGoals] = useState<SavingGoal[]>([]);
  const [reallocateTargetId, setReallocateTargetId] = useState('');
  const [reallocateMode, setReallocateMode] = useState(false);
  const [lifecycleBusy, setLifecycleBusy] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryId, setCategoryId] = useState('');
  const [dispositionMode, setDispositionMode] = useState<'use' | 'cancel' | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const [recovery, setRecovery] = useState<GoalRecovery | null>(null);
  const [surplusChoice, setSurplusChoice] = useState<'KEEP' | 'REDIRECT' | 'RELEASE'>('KEEP');
  const [recoveryPlan, setRecoveryPlan] = useState<{ months: 4; monthly_amount: number } | null>(null);
  const [depositPreview, setDepositPreview] = useState<Awaited<ReturnType<typeof edgeApi.goalDepositPreview>> | null>(null);
  const [redirectGoalId, setRedirectGoalId] = useState('');
  const [depositKey, setDepositKey] = useState('');

  const isDebt = type === 'debt';
  const load = useCallback(async (pull = false) => {
    if (pull) setRefreshing(true);
    else setLoading(true);
    setError('');
    try {
      const [resource, entries, accountResult, recommendationResult, categoryResult] = await Promise.all([
        isDebt ? edgeApi.debts() : edgeApi.goals(),
        isDebt ? edgeApi.debtPayments(id) : edgeApi.goalMutations(id),
        edgeApi.accounts(),
        isDebt ? Promise.resolve(null) : edgeApi.savingsRecommendations(),
        edgeApi.categories(),
      ]);
      if (!isDebt) setRecovery(await edgeApi.goalRecovery(id));
      setItem(resource.data.find((entry) => entry.id === id) ?? null);
      if (!isDebt) setGoals(resource.data as SavingGoal[]);
      setHistory(entries.data);
      setAccounts(accountResult.data.filter((account) => account.kind !== 'INVESTMENT'));
      setRecommendations(recommendationResult);
      setCategories(categoryResult.data.filter((category) => category.type === 'EXPENSE'));
      setAccountId((currentAccountId) => currentAccountId || accountResult.data.find((account) => account.is_default)?.id || accountResult.data[0]?.id || '');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal memuat detail.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id, isDebt]);

  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const total = item ? (isDebt ? (item as Debt).total_amount : (item as SavingGoal).target_amount) : 0;
  const current = item ? (isDebt ? (item as Debt).paid_amount : (item as SavingGoal).saved_amount) : 0;
  const remaining = Math.max(total - current, 0);
  const progress = total > 0 ? Math.min(Math.round(current / total * 100), 100) : 0;
  const plan = isDebt && item ? (item as Debt).installment_plan : null;
  const recommendation = recommendations?.goals.find((goal) => goal.goal_id === id);
  const goal = !isDebt && item ? item as SavingGoal : null;
  const lifecycleLabel = goal ? { ACTIVE: 'Aktif', PAUSED: 'Dijeda', FUNDED: 'Target tercapai', CANCELLED: 'Dibatalkan', ARCHIVED: 'Diarsipkan' }[goal.lifecycle_status] : '';
  const primaryTitle = isDebt ? 'Catat pembayaran' : goal?.lifecycle_status === 'FUNDED' ? 'Gunakan dana target' : goal?.lifecycle_status === 'PAUSED' ? 'Lanjutkan target' : 'Tambah setoran';

  const closeForm = () => {
    setFormOpen(false);
    setReallocateMode(false);
    setDispositionMode(null);
  };

  const openForm = () => {
    setAmount('');
    setNote('');
    setMutationKind('DEPOSIT');
    setReallocateMode(false);
    setDispositionMode(null);
    setError('');
    setFormOpen(true);
  };

  const togglePaused = async () => {
    if (!item || isDebt || lifecycleBusy) return;
    setLifecycleBusy(true);
    setError('');
    try { await edgeApi.setGoalPaused(item.id, (item as SavingGoal).lifecycle_status !== 'PAUSED', item.version); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Gagal mengubah status goal.'); } finally { setLifecycleBusy(false); }
  };

  const reallocate = async () => {
    const source = item as SavingGoal | null;
    const destination = goals.find((goal) => goal.id === reallocateTargetId);
    const value = Number(amount);
    if (!source || !destination || !Number.isSafeInteger(value) || value <= 0 || lifecycleBusy) return;
    setLifecycleBusy(true);
    setError('');
    try { await edgeApi.reallocateGoal(source, destination, value, idempotencyKey('goal-reallocation')); setFormOpen(false); setReallocateTargetId(''); setAmount(''); await load(); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Gagal memindahkan dana goal.'); } finally { setLifecycleBusy(false); }
  };

  const executeDisposition = async () => {
    const goal = item as SavingGoal | null;
    const value = Number(amount);
    if (!goal || !dispositionMode || lifecycleBusy || dispositionMode === 'use' && (!Number.isSafeInteger(value) || value <= 0 || value > goal.saved_amount || !categoryId) || dispositionMode === 'cancel' && !accountId) return;
    setLifecycleBusy(true);
    setError('');
    try {
      if (dispositionMode === 'use') await edgeApi.useGoal(goal, { amount: value, category_id: categoryId, description: `Gunakan tabungan: ${goal.name}`, note: note.trim() || null, surplus_choice: surplusChoice, redirect_goal: surplusChoice === 'REDIRECT' ? goals.find((candidate) => candidate.id === reallocateTargetId) : null }, idempotencyKey('goal-use'));
      else await edgeApi.cancelGoalWithRelease(goal, accountId, idempotencyKey('goal-cancel'));
      setConfirmOpen(false);
      closeForm();
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal menyelesaikan goal.');
    } finally {
      setLifecycleBusy(false);
    }
  };

  const reviewMutation = async () => {
    const value = Number(amount);
    if (!item || !accountId || !Number.isSafeInteger(value) || value <= 0 || saving) return;
    if (!isDebt && mutationKind === 'DEPOSIT' && (item as SavingGoal).funding_mode) {
      setSaving(true);
      setError('');
      try { setDepositPreview(await edgeApi.goalDepositPreview(item.id, value)); setRedirectGoalId(''); setDepositKey(idempotencyKey('goal-deposit')); setConfirmOpen(true); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Gagal meninjau setoran.'); } finally { setSaving(false); }
    } else setConfirmOpen(true);
  };

  const saveMutation = async () => {
    const value = Number(amount);
    if (!item || !accountId || !Number.isSafeInteger(value) || value <= 0 || saving) return;
    setSaving(true);
    setError('');
    try {
      if (isDebt) await edgeApi.createDebtPayment(item.id, { account_id: accountId, amount: value, note: note.trim() || null }, item.version, idempotencyKey('debt-payment'));
      else {
        let goal = item as SavingGoal;
        if (!goal.funding_mode) goal = await edgeApi.configureGoal(goal.id, { funding_mode: fundingMode, source_account_id: accountId, savings_account_id: fundingMode === 'SEPARATE_ACCOUNT' ? savingsAccountId : null, priority: 'NORMAL' }, goal.version);
        if (mutationKind === 'DEPOSIT' && depositPreview) await edgeApi.applyGoalDeposit({ goal, account_id: accountId, amount: value, redirect_goal: goals.find((candidate) => candidate.id === redirectGoalId) ?? null, note: note.trim() || null }, depositKey);
        else await edgeApi.createGoalMutation(goal.id, { account_id: accountId, kind: mutationKind, amount: value, note: note.trim() || null }, goal.version, idempotencyKey('goal-mutation'));
      }
      setConfirmOpen(false);
      setDepositPreview(null);
      setFormOpen(false);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal menyimpan mutasi.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScreenWrapper withSafeArea style={{ backgroundColor: theme.surfaceHighlight }}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} colors={[theme.accent]} tintColor={theme.deepTeal} progressBackgroundColor={theme.cardBackground} />}>
        <View style={styles.header}>
          <TouchableOpacity accessibilityLabel="Kembali" style={[styles.back, { borderColor: theme.border }]} onPress={() => router.back()}><ArrowLeft color={theme.textPrimary} size={22} /></TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.textPrimary }]} weight="bold">Detail {isDebt ? 'Utang' : 'Tabungan'}</Text>
        </View>

        {loading ? <ActivityIndicator color={theme.primary} /> : null}
        {error ? <Text style={{ color: theme.expense }}>{error}</Text> : null}
        {!loading && !item ? <Text style={{ color: theme.textMuted }}>Data tidak ditemukan.</Text> : null}

        {item ? <>
          <Card variant="teal" style={styles.hero}>
            <View style={[styles.icon, { backgroundColor: theme.accent }]}>{isDebt ? <CardReceive color={theme.deepTeal} size={24} variant="Bold" /> : <WalletAdd color={theme.deepTeal} size={24} variant="Bold" />}</View>
            <Text style={[styles.name, { color: theme.onPrimary }]} weight="bold">{item.name}</Text>
            <Text style={[styles.remaining, { color: theme.accent }]} weight="bold">{formatCurrency(remaining)}</Text>
            <Text style={[styles.caption, { color: theme.onPrimary }]}>{isDebt ? 'sisa utang' : 'kekurangan target'}</Text>
            <View style={[styles.track, { backgroundColor: 'rgba(255,255,255,0.18)' }]}><View style={[styles.fill, { width: `${progress}%`, backgroundColor: theme.accent }]} /></View>
            <Text style={[styles.progress, { color: theme.onPrimary }]}>{progress}% tercapai</Text>
          </Card>

          <View style={styles.grid}>
            <Card variant="default" style={styles.metric}><Text style={[styles.metricLabel, { color: theme.textMuted }]}>{isDebt ? 'Total utang' : 'Target'}</Text><Text style={[styles.metricValue, { color: theme.textPrimary }]} weight="bold">{formatCurrency(total)}</Text></Card>
            <Card variant="surface" style={styles.metric}><Text style={[styles.metricLabel, { color: theme.textMuted }]}>{isDebt ? 'Terbayar' : 'Terkumpul'}</Text><Text style={[styles.metricValue, { color: theme.textPrimary }]} weight="bold">{formatCurrency(current)}</Text></Card>
          </View>

          <Card variant="default" style={styles.info}>
            <InfoRow label="Status" value={isDebt ? item.status === 'paid' ? 'Lunas' : 'Aktif' : lifecycleLabel} theme={theme} />
            {isDebt && plan ? <InfoRow label="Rencana" value={`${plan.paid_installments}/${plan.tenor_months} periode`} theme={theme} /> : null}
            {!isDebt ? <InfoRow label="Target tanggal" value={(item as SavingGoal).target_date ?? 'Tidak ditentukan'} theme={theme} /> : null}
          </Card>

           {!isDebt && recommendation ? <Card variant="surface" style={styles.info}><InfoRow label="Kebutuhan per bulan" value={recommendation.required_monthly ? formatCurrency(recommendation.required_monthly) : 'Belum ditentukan'} theme={theme} /><InfoRow label="Aman sekarang" value={formatCurrency(recommendation.safe_contribution)} theme={theme} /><InfoRow label="Status rencana" value={recommendation.schedule_status === 'BEHIND' ? `Tertinggal ${formatCurrency(recommendation.behind_amount)}` : recommendation.schedule_status === 'OVERDUE' ? 'Melewati target' : recommendation.schedule_status === 'FUNDED' ? 'Target tercapai' : 'Sesuai rencana'} theme={theme} /><InfoRow label="Estimasi selesai" value={recommendation.projected_completion_date ?? 'Belum dapat dihitung'} theme={theme} /></Card> : null}
           {!isDebt && recovery ? <Card variant="surface" style={styles.info}><InfoRow label="Status pemulihan" value={{ FUNDED: 'Target tercapai', OVERDUE: 'Terlambat', UNSCHEDULED: 'Belum terjadwal', ACTIVE: 'Dalam pemulihan' }[recovery.status]} theme={theme} /><InfoRow label="Kontribusi pemulihan" value={recoveryPlan ? `${formatCurrency(recoveryPlan.monthly_amount)} × 4 bulan` : recovery.required_monthly ? formatCurrency(recovery.required_monthly) : 'Atur tanggal target'} theme={theme} /><Button title={recoveryPlan ? 'Rencana 4 bulan dipilih' : 'Pilih rencana pemulihan 4 bulan'} size="small" variant="outline" disabled={!!recoveryPlan || lifecycleBusy} onPress={() => { if (!item) return; setLifecycleBusy(true); void edgeApi.confirmGoalRecovery(item as SavingGoal, idempotencyKey('goal-recovery')).then(setRecoveryPlan, (cause) => setError(cause instanceof Error ? cause.message : 'Gagal memilih rencana.')).finally(() => setLifecycleBusy(false)); }} />{(item as SavingGoal).current_cycle_end ? <InfoRow label="Siklus berjalan" value={`${(item as SavingGoal).current_cycle_start}–${(item as SavingGoal).current_cycle_end}`} theme={theme} /> : null}</Card> : null}
            <Button title={primaryTitle} variant="lime" disabled={isDebt && remaining <= 0 || goal?.lifecycle_status === 'CANCELLED' || goal?.lifecycle_status === 'ARCHIVED'} onPress={() => { if (goal?.lifecycle_status === 'PAUSED') void togglePaused(); else if (goal?.lifecycle_status === 'FUNDED') { setAmount(String(current)); setCategoryId(''); setDispositionMode('use'); setFormOpen(true); } else openForm(); }} />
           {!isDebt ? <Button title="Aksi lainnya" variant="outline" onPress={() => setMoreOpen(true)} /> : null}


          <View style={styles.historySection}>
            <Text style={[styles.historyTitle, { color: theme.textPrimary }]} weight="bold">Riwayat</Text>
            {history.map((entry) => {
              const withdrawal = 'kind' in entry && entry.kind === 'WITHDRAWAL';
              return <Card key={entry.id} variant="default" style={styles.historyCard}>
                <View style={[styles.historyIcon, { backgroundColor: withdrawal ? theme.expenseSurface : theme.incomeSurface }]}><EmptyWalletChange color={withdrawal ? theme.expense : theme.income} size={19} /></View>
                <View style={styles.historyCopy}><Text style={{ color: theme.textPrimary }} weight="bold">{isDebt ? 'Pembayaran' : withdrawal ? 'Penarikan' : 'Setoran'}</Text><Text style={[styles.historyDate, { color: theme.textMuted }]}>{new Date(entry.occurred_at).toLocaleString('id-ID')}{entry.note ? ` · ${entry.note}` : ''}</Text></View>
                <Text style={{ color: withdrawal ? theme.expense : theme.income }} weight="bold">{withdrawal ? '-' : '+'}{formatCurrency(entry.amount)}</Text>
              </Card>;
            })}
            {!history.length ? <Text style={{ color: theme.textMuted }}>Belum ada mutasi.</Text> : null}
          </View>
        </> : null}
      </ScrollView>

      <Modal visible={moreOpen} transparent animationType="slide" onRequestClose={() => setMoreOpen(false)}><Pressable style={styles.backdrop} onPress={() => setMoreOpen(false)}><Pressable style={[styles.sheet, { backgroundColor: theme.cardBackground }]} onPress={(event) => event.stopPropagation()}><View style={styles.sheetContent}><Text style={[styles.sheetTitle, { color: theme.textPrimary }]} weight="bold">Aksi lainnya</Text><Text style={{ color: theme.textMuted }}>Kelola status atau pindahkan dana target. Pilih satu tindakan.</Text><Button title={(item as SavingGoal | null)?.lifecycle_status === 'PAUSED' ? 'Lanjutkan goal' : 'Jeda goal'} variant="outline" disabled={lifecycleBusy || (item as SavingGoal | null)?.lifecycle_status === 'FUNDED'} onPress={() => { setMoreOpen(false); void togglePaused(); }} /><Button title="Pindahkan dana" variant="outline" disabled={lifecycleBusy || current <= 0 || goals.length < 2} onPress={() => { setMoreOpen(false); setAmount(''); setReallocateTargetId(''); setReallocateMode(true); setFormOpen(true); }} /><Button title="Gunakan dana goal" variant="outline" disabled={lifecycleBusy || current <= 0} onPress={() => { setMoreOpen(false); setAmount(String(current)); setCategoryId(''); setDispositionMode('use'); setFormOpen(true); }} />{(item as SavingGoal | null)?.recurrence_unit ? <Button title="Mulai siklus berikutnya" variant="outline" disabled={lifecycleBusy} onPress={() => { setMoreOpen(false); if (item) void edgeApi.resetGoalCycle(item as SavingGoal, idempotencyKey('goal-cycle')).then(() => load(), (cause) => setError(cause instanceof Error ? cause.message : 'Gagal mereset siklus.')); }} /> : null}<Button title="Batalkan dan lepaskan dana" variant="outline" disabled={lifecycleBusy || ['CANCELLED','ARCHIVED'].includes((item as SavingGoal | null)?.lifecycle_status ?? '')} onPress={() => { setMoreOpen(false); setDispositionMode('cancel'); setAccountId((item as SavingGoal).source_account_id ?? accountId); setFormOpen(true); }} /></View></Pressable></Pressable></Modal>
      <Modal visible={formOpen} transparent animationType="slide" onRequestClose={() => { if (!saving && !lifecycleBusy) closeForm(); }}>
        <Pressable style={styles.backdrop} onPress={() => { if (!saving && !lifecycleBusy) closeForm(); }}>
          <Pressable style={[styles.sheet, { backgroundColor: theme.cardBackground }]} onPress={(event) => event.stopPropagation()}>
            <KeyboardAwareScrollView enableOnAndroid keyboardShouldPersistTaps="handled" contentContainerStyle={styles.sheetContent}>
               <Text style={[styles.sheetTitle, { color: theme.textPrimary }]} weight="bold">{dispositionMode === 'use' ? 'Gunakan dana goal' : dispositionMode === 'cancel' ? 'Batalkan goal' : reallocateMode ? 'Pindahkan dana goal' : isDebt ? 'Catat pembayaran' : 'Mutasi tabungan'}</Text>
               {dispositionMode === 'use' ? <><Text style={{ color: theme.textMuted }} weight="bold">Kategori pengeluaran</Text><View style={styles.accountRow}>{categories.map((category) => <TouchableOpacity key={category.id} onPress={() => setCategoryId(category.id)} style={[styles.accountOption, { borderColor: categoryId === category.id ? theme.primary : theme.border, backgroundColor: categoryId === category.id ? theme.surfaceMuted : theme.surfaceElement }]}><Text style={{ color: theme.textPrimary }} weight="bold">{category.name}</Text></TouchableOpacity>)}</View>{Number(amount) < current ? <><Text style={{ color: theme.textMuted }} weight="bold">Sisa {formatCurrency(current - Number(amount || 0))}</Text><View style={styles.accountRow}>{([['KEEP','Tetap di goal'],['REDIRECT','Alihkan'],['RELEASE','Lepaskan']] as const).map(([choice,label]) => <TouchableOpacity key={choice} onPress={() => setSurplusChoice(choice)} style={[styles.accountOption, { borderColor: surplusChoice === choice ? theme.primary : theme.border }]}><Text style={{ color: theme.textPrimary }}>{label}</Text></TouchableOpacity>)}</View>{surplusChoice === 'REDIRECT' ? <View style={styles.accountRow}>{goals.filter((goal) => goal.id !== id).map((goal) => <TouchableOpacity key={goal.id} onPress={() => setReallocateTargetId(goal.id)} style={[styles.accountOption, { borderColor: reallocateTargetId === goal.id ? theme.primary : theme.border }]}><Text style={{ color: theme.textPrimary }}>{goal.name}</Text></TouchableOpacity>)}</View> : null}</> : null}</> : null}
               {dispositionMode === 'cancel' ? <Text style={{ color: theme.textMuted }}>Dana akan dilepas atau dipindahkan ke akun tujuan tanpa dicatat sebagai pemasukan.</Text> : null}
               {reallocateMode ? <><Text style={{ color: theme.textMuted }} weight="bold">Tujuan penerima</Text><View style={styles.accountRow}>{goals.filter((goal) => goal.id !== id).map((goal) => <TouchableOpacity key={goal.id} onPress={() => setReallocateTargetId(goal.id)} style={[styles.accountOption, { borderColor: reallocateTargetId === goal.id ? theme.primary : theme.border, backgroundColor: reallocateTargetId === goal.id ? theme.surfaceMuted : theme.surfaceElement }]}><Text style={{ color: theme.textPrimary }} weight="bold">{goal.name}</Text><Text style={{ color: theme.textMuted }}>{formatCurrency(goal.saved_amount)} terkumpul</Text></TouchableOpacity>)}</View></> : null}

               {!isDebt && !reallocateMode && !dispositionMode ? <><View style={styles.kindRow}><Button title="Setor" size="small" variant={mutationKind === 'DEPOSIT' ? 'primary' : 'outline'} onPress={() => setMutationKind('DEPOSIT')} style={styles.kindButton} /><Button title="Tarik" size="small" variant={mutationKind === 'WITHDRAWAL' ? 'primary' : 'outline'} onPress={() => setMutationKind('WITHDRAWAL')} style={styles.kindButton} /></View>{!(item as SavingGoal).funding_mode ? <><Text style={{ color: theme.textMuted }} weight="bold">Metode penyimpanan</Text><View style={styles.kindRow}><Button title="Lindungi di akun" size="small" variant={fundingMode === 'VIRTUAL_LOCK' ? 'primary' : 'outline'} onPress={() => setFundingMode('VIRTUAL_LOCK')} style={styles.kindButton} /><Button title="Rekening terpisah" size="small" variant={fundingMode === 'SEPARATE_ACCOUNT' ? 'primary' : 'outline'} onPress={() => setFundingMode('SEPARATE_ACCOUNT')} style={styles.kindButton} /></View></> : null}</> : null}

               {!reallocateMode && dispositionMode !== 'use' ? <><Text style={{ color: theme.textMuted }} weight="bold">{dispositionMode === 'cancel' ? 'Akun tujuan pelepasan' : `Akun ${mutationKind === 'WITHDRAWAL' && !isDebt ? 'tujuan' : 'sumber'}`}</Text><View style={styles.accountRow}>{accounts.filter((account) => dispositionMode !== 'cancel' || (item as SavingGoal).funding_mode !== 'VIRTUAL_LOCK' || account.id === (item as SavingGoal).source_account_id).map((account) => <TouchableOpacity key={account.id} onPress={() => setAccountId(account.id)} style={[styles.accountOption, { borderColor: accountId === account.id ? theme.primary : theme.border, backgroundColor: accountId === account.id ? theme.surfaceMuted : theme.surfaceElement }]}><Text style={{ color: theme.textPrimary }} weight="bold">{account.name}</Text><Text style={{ color: theme.textMuted }}>{formatCurrency(account.balance)}</Text></TouchableOpacity>)}</View></> : null}
               {!isDebt && !reallocateMode && !dispositionMode && !(item as SavingGoal).funding_mode && fundingMode === 'SEPARATE_ACCOUNT' ? <><Text style={{ color: theme.textMuted }} weight="bold">Rekening tabungan tujuan</Text><View style={styles.accountRow}>{accounts.filter((account) => account.id !== accountId).map((account) => <TouchableOpacity key={account.id} onPress={() => setSavingsAccountId(account.id)} style={[styles.accountOption, { borderColor: savingsAccountId === account.id ? theme.primary : theme.border, backgroundColor: savingsAccountId === account.id ? theme.surfaceMuted : theme.surfaceElement }]}><Text style={{ color: theme.textPrimary }} weight="bold">{account.name}</Text><Text style={{ color: theme.textMuted }}>{formatCurrency(account.balance)}</Text></TouchableOpacity>)}</View></> : null}
               {!reallocateMode && !dispositionMode ? <Text style={{ color: theme.textMuted }}>{mutationKind === 'DEPOSIT' ? 'Setoran bukan pengeluaran.' : 'Penarikan bukan pemasukan.'}</Text> : null}
               {dispositionMode !== 'cancel' ? <TextInput autoFocus value={amount} onChangeText={(value) => setAmount(value.replace(/\D/g, ''))} keyboardType="numeric" placeholder="Nominal rupiah" placeholderTextColor={theme.textMuted} style={[styles.input, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.surfaceElement }]} /> : null}

              {dispositionMode !== 'cancel' ? <TextInput value={note} onChangeText={setNote} placeholder="Catatan (opsional)" placeholderTextColor={theme.textMuted} style={[styles.input, { color: theme.textPrimary, borderColor: theme.border, backgroundColor: theme.surfaceElement }]} /> : null}
              {error ? <Text style={{ color: theme.expense }}>{error}</Text> : null}
               <Button title={dispositionMode ? lifecycleBusy ? 'Memproses…' : 'Tinjau' : reallocateMode ? lifecycleBusy ? 'Memindahkan…' : 'Pindahkan' : saving ? 'Menyimpan…' : 'Tinjau'} variant="lime" disabled={dispositionMode === 'use' ? lifecycleBusy || !amount || Number(amount) > current || !categoryId : dispositionMode === 'cancel' ? lifecycleBusy || !accountId : reallocateMode ? lifecycleBusy || !amount || !reallocateTargetId : saving || !amount || !accountId || (!isDebt && !(item as SavingGoal).funding_mode && fundingMode === 'SEPARATE_ACCOUNT' && !savingsAccountId)} onPress={() => reallocateMode ? void reallocate() : dispositionMode ? setConfirmOpen(true) : void reviewMutation()} />

            </KeyboardAwareScrollView>
          </Pressable>
        </Pressable>
      </Modal>
      {depositPreview ? <Modal visible={confirmOpen} transparent animationType="slide" onRequestClose={() => setConfirmOpen(false)}><Pressable style={styles.backdrop} onPress={() => setConfirmOpen(false)}><Pressable style={[styles.sheet, { backgroundColor: theme.cardBackground }]} onPress={(event) => event.stopPropagation()}><View style={styles.sheetContent}><Text style={[styles.sheetTitle, { color: theme.textPrimary }]} weight="bold">Konfirmasi setoran</Text><InfoRow label="Diminta" value={formatCurrency(Number(amount))} theme={theme} /><InfoRow label="Diterima goal ini" value={formatCurrency(depositPreview.accepted_amount)} theme={theme} /><InfoRow label="Kelebihan" value={formatCurrency(depositPreview.overflow_amount)} theme={theme} />{depositPreview.overflow_amount > 0 ? <><Text style={{ color: theme.textMuted }} weight="bold">Pilih tujuan kelebihan</Text><View style={styles.accountRow}>{depositPreview.destinations.map((goal) => <TouchableOpacity key={goal.id} onPress={() => setRedirectGoalId(goal.id)} style={[styles.accountOption, { borderColor: redirectGoalId === goal.id ? theme.primary : theme.border }]}><Text style={{ color: theme.textPrimary }} weight="bold">{goal.name}</Text><Text style={{ color: theme.textMuted }}>Ruang {formatCurrency(goal.remaining_amount)}</Text></TouchableOpacity>)}</View></> : null}<Button title={saving ? 'Memproses…' : 'Konfirmasi setoran'} variant="lime" disabled={saving || depositPreview.overflow_amount > 0 && !redirectGoalId} onPress={() => void saveMutation()} /><Button title="Batal" variant="outline" disabled={saving} onPress={() => setConfirmOpen(false)} /></View></Pressable></Pressable></Modal> : <ConfirmationModal visible={confirmOpen} title={dispositionMode === 'use' ? 'Gunakan dana goal?' : dispositionMode === 'cancel' ? 'Batalkan goal?' : isDebt ? 'Bayar utang?' : mutationKind === 'DEPOSIT' ? 'Konfirmasi setoran' : 'Konfirmasi penarikan'} message={dispositionMode === 'use' ? `${formatCurrency(Number(amount || 0))} akan dilepas dari goal dan dicatat tepat satu kali sebagai pengeluaran.` : dispositionMode === 'cancel' ? `${formatCurrency(current)} akan dilepas ke akun tujuan tanpa dicatat sebagai pemasukan. Goal akan dibatalkan.` : isDebt ? `${formatCurrency(Number(amount || 0))} akan dipotong dari akun terpilih.` : `${formatCurrency(Number(amount || 0))} akan ${mutationKind === 'DEPOSIT' ? fundingMode === 'VIRTUAL_LOCK' ? 'dilindungi tanpa mengubah saldo rekening' : 'dipindahkan ke rekening tabungan' : 'dilepas dari tabungan'}. Ini bukan ${mutationKind === 'DEPOSIT' ? 'pengeluaran' : 'pemasukan'}.${mutationKind === 'DEPOSIT' && recommendation ? ` Kontribusi aman saat ini ${formatCurrency(recommendation.safe_contribution)}.` : ''}`} cancelLabel="Batal" confirmLabel="Konfirmasi" busy={dispositionMode ? lifecycleBusy : saving} error={error} onCancel={() => setConfirmOpen(false)} onConfirm={() => { if (dispositionMode) void executeDisposition(); else void saveMutation(); }} />}
    </ScreenWrapper>
  );
}

function InfoRow({ label, value, theme }: { label: string; value: string; theme: ReturnType<typeof getTheme> }) { return <View style={styles.row}><Text style={{ color: theme.textMuted }}>{label}</Text><Text style={[styles.rowValue, { color: theme.textPrimary }]} weight="bold">{value}</Text></View>; }

const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 48, gap: 16 }, header: { flexDirection: 'row', alignItems: 'center', gap: 14 }, back: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' }, headerTitle: { fontSize: 22 }, hero: { padding: 22, alignItems: 'center' }, icon: { width: 48, height: 48, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }, name: { fontSize: 20, marginTop: 12 }, remaining: { fontSize: 30, marginTop: 16 }, caption: { fontSize: 12, opacity: 0.75 }, track: { width: '100%', height: 8, borderRadius: 99, overflow: 'hidden', marginTop: 20 }, fill: { height: '100%', borderRadius: 99 }, progress: { fontSize: 12, marginTop: 8 }, grid: { flexDirection: 'row', gap: 12 }, metric: { flex: 1, padding: 16 }, metricLabel: { fontSize: 12 }, metricValue: { fontSize: 15, marginTop: 6 }, info: { padding: 18, gap: 14 }, row: { flexDirection: 'row', justifyContent: 'space-between', gap: 16 }, rowValue: { flex: 1, textAlign: 'right' }, historySection: { gap: 10 }, historyTitle: { fontSize: 18 }, historyCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 }, historyIcon: { width: 38, height: 38, borderRadius: 14, alignItems: 'center', justifyContent: 'center' }, historyCopy: { flex: 1 }, historyDate: { fontSize: 11, marginTop: 3 }, backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(7,32,31,0.46)' }, sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20 }, sheetContent: { gap: 14, paddingBottom: 20 }, sheetTitle: { fontSize: 21 }, accountRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, accountOption: { minWidth: '47%', borderWidth: 1, borderRadius: 14, padding: 10, gap: 3 }, kindRow: { flexDirection: 'row', gap: 10 }, kindButton: { flex: 1 }, input: { height: 52, borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, fontSize: 15 },
});
