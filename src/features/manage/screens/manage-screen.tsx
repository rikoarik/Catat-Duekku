import { Text } from '@/components/ui/text';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import Animated, { FadeInDown, LinearTransition } from 'react-native-reanimated';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { router } from 'expo-router';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CustomDatePickerModal } from '@/components/ui/custom-date-picker-modal';
import {
  Add,

  ArrowRight2,
  Bank,
  Calendar,
  CardReceive,
  Category2,
  Chart,
  CloseCircle,
   DollarCircle,
     Edit2,
     Trash,

   WalletAdd,

} from 'iconsax-react-native';
import { getTheme } from '@/core/theme/colors';
import { edgeApi, idempotencyKey, type Account, type BudgetCycleSummary, type Category as ApiCategory, type Debt, type SavingGoal, type SavingsRecommendations } from '@/core/lib/edge-api';
import { summarizeInstallmentDue } from '@/core/lib/installment';
import { dueLabel, formatLongDate, monthlyNeeded, todayIso } from '@/core/lib/dates';
import { formatCurrency } from '@/core/utils/formatters';
import type { InstallmentPlan } from '@/types/debt';

type FormKind = 'account' | 'budget' | 'savings' | 'debt' | 'category';
export type ManageSection = 'accounts' | 'budget' | 'savings' | 'debts' | 'categories';

interface ManageScreenProps {
  onOpen?: (section: ManageSection) => void;
  settingsSection?: ManageSection;
}

type DeleteTarget = { kind: 'account' | 'category' | 'savings' | 'debt'; id: string; name: string; version: number };
type EditTarget = DeleteTarget;

interface SavingsItem {
  id: string;
  name: string;
  targetAmount: number;
  targetDate?: string;
  savedAmount: number;
}

interface DebtItem {
  id: string;
  name: string;
  totalAmount: number;
  remainingAmount: number;
  monthlyAmount: number;
  paidInstallments: number;
  tenorMonths: number;
  dueLabel: string;
  dueStatus: 'paid' | 'overdue' | 'due_soon' | 'active' | 'upcoming';
}

const FORM_COPY: Record<FormKind, { title: string; placeholder: string; buttonText: string }> = {
  account: { title: 'Tambah Akun Pembayaran', placeholder: 'Contoh: Bank BCA / E-Wallet', buttonText: 'Simpan Akun' },
  budget: { title: 'Atur Limit Budget Bulan Ini', placeholder: 'Contoh: 5000000', buttonText: 'Simpan Limit Budget' },
  savings: { title: 'Buat Target Tabungan Baru', placeholder: 'Contoh: Beli Laptop Baru', buttonText: 'Simpan Target Tabungan' },
  debt: { title: 'Catat Utang / Cicilan Baru', placeholder: 'Contoh: Cicilan Motor / Kredivo', buttonText: 'Simpan Data Utang' },
  category: { title: 'Tambah Kategori Transaksi', placeholder: 'Contoh: Kesehatan', buttonText: 'Simpan Kategori' },
};

export function ManageScreen({ onOpen: _onOpen, settingsSection }: ManageScreenProps) {
  const theme = getTheme(useColorScheme());
  const [form, setForm] = useState<FormKind | null>(null);
  const [categoryType, setCategoryType] = useState<ApiCategory['type']>('EXPENSE');
  const [savingsIndex, setSavingsIndex] = useState(0);
  const [debtIndex, setDebtIndex] = useState(0);
  const [value, setValue] = useState('');
  const [accountName, setAccountName] = useState('');
  const [accountBalance, setAccountBalance] = useState('');
  const [accountKind, setAccountKind] = useState<Account['kind']>('CASH');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountDefault, setAccountDefault] = useState(false);
  const [savingsName, setSavingsName] = useState('');
  const [savingsTargetAmount, setSavingsTargetAmount] = useState('');
  const [savingsTargetDate, setSavingsTargetDate] = useState('');
  const [savingsRecurrence, setSavingsRecurrence] = useState<'' | 'MONTH_1' | 'MONTH_3' | 'MONTH_6' | 'YEAR_1'>('');
  const [debtName, setDebtName] = useState('');
  const [debtAmount, setDebtAmount] = useState('');
  const [debtPaidMonths, setDebtPaidMonths] = useState('0');
  const [debtStartDate, setDebtStartDate] = useState(todayIso());
  const [datePickerTarget, setDatePickerTarget] = useState<'savings' | 'debt' | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [budget, setBudget] = useState<BudgetCycleSummary | null>(null);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [goals, setGoals] = useState<SavingGoal[]>([]);
  const [savingsRecommendations, setSavingsRecommendations] = useState<SavingsRecommendations | null>(null);
  const [debtTenor, setDebtTenor] = useState('12');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [editTarget, setEditTarget] = useState<EditTarget | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [error, setError] = useState('');

  const load = async (mode: boolean | 'silent' = false) => {
    if (mode === true) setRefreshing(true);
    else if (mode !== 'silent') setLoading(true);
    setError('');
    try {
      const [accountResult, categoryResult, budgetResult, goalResult, debtResult, recommendationResult] = await Promise.all([edgeApi.accounts(), edgeApi.categories(), edgeApi.budgetCycle().catch(() => null), edgeApi.goals(), edgeApi.debts(), edgeApi.savingsRecommendations().catch(() => null)]);
      setAccounts(accountResult.data);
      setCategories(categoryResult.data);
      setBudget(budgetResult);
      setGoals(goalResult.data);
      setDebts(debtResult.data);
      setSavingsRecommendations(recommendationResult);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal memuat data server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    Promise.all([edgeApi.accounts(), edgeApi.categories(), edgeApi.budgetCycle().catch(() => null), edgeApi.goals(), edgeApi.debts(), edgeApi.savingsRecommendations().catch(() => null)]).then(([accountResult, categoryResult, budgetResult, goalResult, debtResult, recommendationResult]) => {
      setAccounts(accountResult.data);
      setCategories(categoryResult.data);
      setBudget(budgetResult);
      setGoals(goalResult.data);
      setDebts(debtResult.data);
      setSavingsRecommendations(recommendationResult);
    }).catch((cause) => setError(cause instanceof Error ? cause.message : 'Gagal memuat data server.')).finally(() => setLoading(false));
  }, []);

  const savingsItems: SavingsItem[] = goals.length
    ? goals.map((goal) => ({ id: goal.id, name: goal.name, targetAmount: goal.target_amount, targetDate: goal.target_date ?? undefined, savedAmount: goal.saved_amount }))
    : [{ id: 'empty', name: 'Tambah target', targetAmount: 0, savedAmount: 0 }];
  const debtItems: DebtItem[] = debts.length
    ? debts.map((item) => {
        const plan = item.installment_plan as InstallmentPlan;
        const due = summarizeInstallmentDue(plan);
        return {
          id: item.id,
          name: item.name,
          totalAmount: item.total_amount,
          remainingAmount: item.remaining_amount,
          monthlyAmount: plan?.monthly_amount ?? 0,
          paidInstallments: plan?.paid_installments ?? 0,
          tenorMonths: plan?.tenor_months ?? 0,
          dueLabel: due?.due_label ?? '-',
          dueStatus: due?.status ?? 'upcoming',
        };
      })
    : [{ id: 'empty', name: 'Tambah utang', totalAmount: 0, remainingAmount: 0, monthlyAmount: 0, paidInstallments: 0, tenorMonths: 0, dueLabel: '-', dueStatus: 'upcoming' }];
  const budgetUsed = budget?.totals.actual_expense ?? 0;
  const budgetRemaining = budget?.totals.safe_to_spend ?? 0;
  const budgetPercent = budget?.cycle.planned_income ? Math.min(Math.round(budgetUsed / budget.cycle.planned_income * 100), 100) : 0;
  const activeGoal = savingsItems[savingsIndex];
  const activeGoalRemaining = activeGoal ? Math.max(activeGoal.targetAmount - activeGoal.savedAmount, 0) : 0;
  const activeGoalLabel = activeGoal?.targetAmount && activeGoal.targetDate
    ? dueLabel(activeGoal.targetDate)
    : goals.length > 0
      ? 'tanpa tanggal'
      : 'belum ada target';
  const activeGoalMonthlyNeeded = activeGoal?.targetAmount && activeGoal.targetDate
    ? monthlyNeeded(activeGoalRemaining, activeGoal.targetDate)
    : 0;
  const activeDebt = debtItems[debtIndex];
  const totalDebt = debts.reduce((total, item) => total + item.remaining_amount, 0);
  const nearestDebt = debtItems.filter((item) => item.id !== 'empty' && item.remainingAmount > 0).sort((a, b) => ({ overdue: 0, due_soon: 1, active: 2, upcoming: 2, paid: 3 }[a.dueStatus] - { overdue: 0, due_soon: 1, active: 2, upcoming: 2, paid: 3 }[b.dueStatus]))[0];
  const savingsPlan = (savingsRecommendations?.goals ?? []).reduce<{ remaining: number; items: (SavingsRecommendations['goals'][number] & { suggested: number })[] }>((plan, goal) => { const suggested = Math.min(goal.required_monthly ?? 0, goal.remaining_amount, plan.remaining); return { remaining: plan.remaining - suggested, items: suggested > 0 ? [...plan.items, { ...goal, suggested }] : plan.items }; }, { remaining: savingsRecommendations?.capacity.safe_now ?? 0, items: [] }).items;

  const openSection = (section: ManageSection) => router.push({ pathname: '/manage-section', params: { section } });

  const openDatePicker = (target: 'savings' | 'debt') => {
    setDatePickerTarget(target);
  };

  const handleConfirmDate = (iso: string) => {
    if (datePickerTarget === 'savings') setSavingsTargetDate(iso);
    if (datePickerTarget === 'debt') setDebtStartDate(iso);
    setDatePickerTarget(null);
  };

  const openForm = (kind: FormKind) => {
    setEditTarget(null);
    setError('');
    setValue('');
    setCategoryType('EXPENSE');
    setAccountName('');
    setAccountBalance('');
    setAccountKind('CASH');
    setAccountNumber('');
    setAccountDefault(false);
    setSavingsName('');
    setSavingsTargetAmount('');
    setSavingsTargetDate('');
    setSavingsRecurrence('');
    setDebtName('');
    setDebtAmount('');
    setDebtPaidMonths('0');
    setDebtStartDate(todayIso());
    setDebtTenor('12');
    setForm(kind);
  };

  const openEdit = (target: EditTarget) => {
    setError('');
    setEditTarget(target);
    if (target.kind === 'account') {
      const account = accounts.find((item) => item.id === target.id);
      setAccountName(account?.name ?? target.name);
      setAccountBalance('');
      setAccountKind(account?.kind ?? 'CASH');
      setAccountNumber(account?.account_number ?? '');
      setAccountDefault(account?.is_default ?? false);
    } else if (target.kind === 'category') {
      const category = categories.find((item) => item.id === target.id);
      setValue(target.name);
      setCategoryType(category?.type ?? 'EXPENSE');
    } else if (target.kind === 'savings') {
      const goal = goals.find((item) => item.id === target.id);
      setSavingsName(goal?.name ?? target.name);
      setSavingsTargetAmount(String(goal?.target_amount ?? ''));
      setSavingsTargetDate(goal?.target_date ?? '');
      setSavingsRecurrence(goal?.recurrence_unit ? `${goal.recurrence_unit}_${goal.recurrence_interval}` as typeof savingsRecurrence : '');
    } else {
      const debt = debts.find((item) => item.id === target.id);
      const plan = debt?.installment_plan as InstallmentPlan | undefined;
      setDebtName(debt?.name ?? target.name);
      setDebtAmount(String(debt?.total_amount ?? ''));
      setDebtTenor(String(plan?.tenor_months ?? 12));
      setDebtPaidMonths(String(plan?.paid_installments ?? 0));
      setDebtStartDate(plan?.start_date ?? todayIso());
    }
    setForm(target.kind);
  };
  const closeForm = () => {
    setForm(null);
    setEditTarget(null);
  };
  const openDelete = (target: DeleteTarget) => {
    setDeleteError('');
    setDeleteTarget(target);
  };
  const closeDelete = () => {
    if (!deleting) setDeleteTarget(null);
  };
  const confirmDelete = async () => {
    if (!deleteTarget || deleting) return;
    setDeleting(true);
    setDeleteError('');
    try {
      if (deleteTarget.kind === 'account') await edgeApi.deleteAccount(deleteTarget.id, deleteTarget.version);
      else if (deleteTarget.kind === 'category') await edgeApi.deleteCategory(deleteTarget.id, deleteTarget.version);
      else if (deleteTarget.kind === 'savings') await edgeApi.deleteGoal(deleteTarget.id, deleteTarget.version);
      else await edgeApi.deleteDebt(deleteTarget.id, deleteTarget.version);
      await load('silent');
      setDeleteTarget(null);
    } catch (cause) {
      setDeleteError(cause instanceof Error ? cause.message : 'Gagal menghapus data.');
    } finally {
      setDeleting(false);
    }
  };

  const saveForm = async () => {
    if (!form || saving) return;
    setSaving(true);
    setError('');
    try {
      if (form === 'account') {
        const metadata = { name: accountName.trim(), kind: accountKind, is_default: accountDefault, account_number: accountNumber.trim() || null, icon: accountKind.toLowerCase() };
        if (editTarget) await edgeApi.updateAccount(editTarget.id, metadata, editTarget.version);
        else {
          const openingBal = Number(accountBalance.replace(/\D/g, '')) || 0;
          await edgeApi.createAccount({ ...metadata, opening_balance: openingBal }, idempotencyKey('account'));
        }
      }
      if (form === 'budget') throw new Error('Pengaturan budget tersedia di halaman Budget.');
      if (form === 'savings') {
        const [recurrence_unit, recurrence] = savingsRecurrence.split('_') as ['MONTH' | 'YEAR', string];
        const body = { name: savingsName.trim(), target_amount: Number(savingsTargetAmount), target_date: savingsTargetDate || null, recurrence_unit: recurrence_unit || null, recurrence_interval: recurrence ? Number(recurrence) as 1 | 3 | 6 : null };
        if (editTarget) await edgeApi.updateGoal(editTarget.id, body, editTarget.version);
      }
      if (form === 'debt') {
        const tenor = Math.max(1, Number(debtTenor));
        const body = { name: debtName.trim(), total_amount: Number(debtAmount), tenor_months: tenor, paid_installments: Math.min(tenor, Math.max(0, Number(debtPaidMonths))), start_date: debtStartDate };
        if (editTarget) {
          const { paid_installments: _, ...metadata } = body;
          await edgeApi.updateDebt(editTarget.id, metadata, editTarget.version);
        } else await edgeApi.createDebt(body, idempotencyKey('debt'));
      }
      if (form === 'category') {
        if (editTarget) await edgeApi.updateCategory(editTarget.id, value.trim(), editTarget.version);
        else await edgeApi.createCategory({ name: value.trim(), type: categoryType }, idempotencyKey('category'));
      }
      await load('silent');
      setSavingsIndex(0);
      setDebtIndex(0);
      closeForm();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal menyimpan data.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void load(true)} colors={[theme.accent]} tintColor={theme.deepTeal} progressBackgroundColor={theme.cardBackground} />}
      >
        <Animated.View entering={FadeInDown.duration(320)} layout={LinearTransition.springify()} style={styles.header}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>{settingsSection ? ({ accounts: 'Akun', budget: 'Budget', savings: 'Tabungan', debts: 'Utang', categories: 'Kategori' }[settingsSection]) : 'Kelola'}</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>{settingsSection ? 'Atur data dan detailnya.' : 'Widget finansialmu.'}</Text>
          {loading ? <ActivityIndicator color={theme.primary} style={{ marginTop: 8 }} /> : null}
          {error ? (
            <View style={styles.errorContainer}>
              <Text style={[styles.errorText, { color: theme.expense }]}>{error}</Text>
              <TouchableOpacity activeOpacity={0.7} style={[styles.retryBtn, { backgroundColor: theme.surfaceElement, borderColor: theme.border }]} onPress={() => void load()}>
                <Text style={[styles.retryText, { color: theme.primary }]} weight="semibold">Coba Lagi</Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(60).duration(320)} layout={LinearTransition.springify()} style={settingsSection && settingsSection !== 'accounts' ? styles.hidden : undefined}>
          {settingsSection === 'accounts' ? (
            <View style={styles.accountSettings}>
              <Card variant="teal" style={styles.accountSummary}>
                <Text style={[styles.accountSummaryLabel, { color: theme.onPrimary }]}>Total saldo akun</Text>
                <Text style={[styles.accountSummaryValue, { color: theme.accent }]} weight="bold">{formatCurrency(accounts.reduce((total, item) => total + item.balance, 0))}</Text>
                <Text style={[styles.accountSummaryMeta, { color: theme.onPrimary }]}>{accounts.length} akun aktif</Text>
              </Card>

              <View style={styles.accountListHeader}>
                <Text style={[styles.accountListTitle, { color: theme.textPrimary }]} weight="bold">Daftar akun</Text>
                <TouchableOpacity onPress={() => openForm('account')} style={[styles.accountAddButton, { backgroundColor: theme.deepTeal }]}>
                  <Add color={theme.accent} size={17} variant="Bold" />
                  <Text style={[styles.accountAddText, { color: theme.onPrimary }]} weight="bold">Tambah</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.accountList}>
                {accounts.map((item) => {
                  const kindLabel = { CASH: 'Tunai', BANK: 'Bank', E_WALLET: 'E-Wallet', INVESTMENT: 'Investasi / Aset' }[item.kind];
                  const maskedNumber = item.account_number ? `•••• ${item.account_number.slice(-4)}` : kindLabel;
                  return (
                    <TouchableOpacity key={item.id} activeOpacity={0.82} onPress={() => openEdit({ kind: 'account', id: item.id, name: item.name, version: item.version })}>
                      <Card variant="default" style={[styles.accountItem, { borderColor: theme.border }]}>
                        <View style={[styles.accountItemIcon, { backgroundColor: theme.surfaceElement }]}><Bank color={theme.deepTeal} size={21} variant="Bold" /></View>
                        <View style={styles.accountItemCopy}>
                          <View style={styles.accountItemNameRow}>
                            <Text style={[styles.accountItemName, { color: theme.textPrimary }]} weight="bold" numberOfLines={1}>{item.name}</Text>
                            <View style={[styles.defaultBadge, { backgroundColor: item.is_default ? theme.accent : theme.surfaceElement }]}>
                              <Text style={[styles.defaultBadgeText, { color: item.is_default ? theme.deepTeal : theme.textMuted }]} weight="bold">{item.is_default ? 'UTAMA' : 'BIASA'}</Text>
                            </View>
                          </View>
                          <View style={styles.accountMetaRow}>
                            <View style={[styles.accountKindDot, { backgroundColor: item.kind === 'INVESTMENT' ? theme.income : item.kind === 'E_WALLET' ? theme.accent : theme.deepTeal }]} />
                            <Text style={[styles.accountItemMeta, { color: theme.textMuted }]}>{kindLabel} · {maskedNumber}</Text>
                          </View>
                        </View>
                        <View style={styles.accountItemBalance}>
                          <Text style={[styles.accountBalanceValue, { color: theme.textPrimary }]} weight="bold">{formatCurrency(item.balance)}</Text>
                          <View style={styles.accountItemActions}>
                            <TouchableOpacity accessibilityLabel={`Edit ${item.name}`} hitSlop={8} style={[styles.accountActionButton, { backgroundColor: theme.surfaceElement }]} onPress={(event) => { event.stopPropagation(); openEdit({ kind: 'account', id: item.id, name: item.name, version: item.version }); }}><Edit2 color={theme.deepTeal} size={16} /></TouchableOpacity>
                            <TouchableOpacity accessibilityLabel={`Hapus ${item.name}`} hitSlop={8} style={[styles.accountActionButton, { backgroundColor: theme.expenseSurface }]} onPress={(event) => { event.stopPropagation(); openDelete({ kind: 'account', id: item.id, name: item.name, version: item.version }); }}><Trash color={theme.expense} size={16} /></TouchableOpacity>
                          </View>
                        </View>
                      </Card>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : (
            <Pressable onPress={() => openSection('accounts')} style={[styles.widget, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              <SectionHeader icon={Bank} title="Akun" subtitle={`${accounts.length} akun aktif`} theme={theme} showDetail />
              <View style={styles.widgetBody}>{accounts.slice(0, 3).map((item) => <InlineRow key={item.id} label={item.name} value={formatCurrency(item.balance)} theme={theme} />)}</View>
            </Pressable>
          )}
        </Animated.View>


        <Animated.View entering={FadeInDown.delay(110).duration(320)} layout={LinearTransition.springify()} style={settingsSection && settingsSection !== 'budget' ? styles.hidden : undefined}>
          <Pressable disabled={!!settingsSection} onPress={() => router.push('/budget')} style={[styles.widget, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>

            <SectionHeader
              icon={Chart}
               title="Budget aktif"
               subtitle={budget ? `${budget.cycle.start_date}–${budget.cycle.end_date}` : 'Belum diatur'}
               theme={theme}

              showDetail={!settingsSection}
            />
            <View style={styles.widgetBody}>
              <View style={[styles.track, { backgroundColor: theme.surfaceMuted }] }>
                <View style={[styles.fill, { width: `${budgetPercent}%`, backgroundColor: theme.accent }]} />
              </View>
              <InlineRow label="Terpakai" value={`Rp${budgetUsed.toLocaleString('id-ID')}`} theme={theme} />
              <InlineRow label="Sisa" value={`Rp${budgetRemaining.toLocaleString('id-ID')}`} theme={theme} />
               <InlineRow label="Batas aman harian" value={formatCurrency(budget?.totals.daily_safe_limit ?? 0)} theme={theme} />

            </View>
          </Pressable>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(160).duration(320)} layout={LinearTransition.springify()} style={[styles.duoRow, settingsSection && settingsSection !== 'savings' && settingsSection !== 'debts' ? styles.hidden : undefined]}>
          {settingsSection === 'savings' ? (
            <View style={[styles.savingsSettings, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              <SectionHeader hideIcon icon={WalletAdd} title="Target tabungan" subtitle={`${goals.length} target tersimpan`} theme={theme} />
              <Button title="Tambah target tabungan" variant="lime" icon={<Add color={theme.deepTeal} size={18} variant="Bold" />} onPress={() => router.push('/savings-setup')} />
              <View style={styles.goalList}>
                {goals.map((goal) => {
                  const goalProgress = goal.target_amount > 0 ? Math.min(goal.saved_amount / goal.target_amount, 1) : 0;
                  const status = goal.lifecycle_status === 'FUNDED' ? 'Selesai' : goal.lifecycle_status === 'PAUSED' ? 'Dijeda' : goal.lifecycle_status === 'CANCELLED' ? 'Dibatalkan' : goal.lifecycle_status === 'ARCHIVED' ? 'Diarsipkan' : 'Aktif';
                  const priority = { CRITICAL: 'Mendesak', HIGH: 'Tinggi', NORMAL: 'Normal', LOW: 'Rendah' }[goal.priority];
                  return <TouchableOpacity key={goal.id} accessibilityRole="button" accessibilityLabel={`Buka detail ${goal.name}, ${Math.round(goalProgress * 100)} persen tercapai, status ${status}`} activeOpacity={0.82} onPress={() => router.push({ pathname: '/finance-detail', params: { id: goal.id, type: 'savings' } })}>
                    <Card variant="default" style={[styles.goalItem, { borderColor: theme.border }]}>
                      <View style={styles.goalHeading}><View style={styles.goalCopy}><Text style={{ color: theme.textPrimary }} weight="bold" numberOfLines={1}>{goal.name}</Text><Text style={{ color: theme.textMuted }}>{status} · Prioritas {priority}</Text></View><ArrowRight2 color={theme.textMuted} size={18} /></View>
                      <View style={styles.goalAmounts}><Text style={{ color: theme.textPrimary }} weight="bold">{formatCurrency(goal.saved_amount)}</Text><Text style={{ color: theme.textMuted }}>dari {formatCurrency(goal.target_amount)}</Text></View>
                      <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(goalProgress * 100) }} style={[styles.track, { backgroundColor: theme.surfaceMuted }]}><View style={[styles.fill, { width: `${goalProgress * 100}%`, backgroundColor: theme.accent }]} /></View>
                      <View style={styles.goalFooter}><Text style={{ color: theme.textMuted }}>{Math.round(goalProgress * 100)}% tercapai</Text><Text style={{ color: theme.textMuted }}>{goal.target_date ? formatLongDate(goal.target_date) : 'Tanpa tanggal'}</Text></View>
                    </Card>
                  </TouchableOpacity>;
                })}
                {!goals.length ? <Card variant="surface" style={styles.emptyGoal}><Text style={{ color: theme.textPrimary }} weight="bold">Belum ada target tabungan</Text><Text style={{ color: theme.textMuted }}>Buat satu target agar uang yang disisihkan punya tujuan jelas.</Text></Card> : null}
              </View>
            </View>
          ) : (
            <Pressable onPress={() => openSection('savings')} accessibilityRole="button" accessibilityLabel="Buka target tabungan" style={[styles.duoCard, settingsSection === 'debts' ? styles.hidden : undefined, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              <SectionHeader compact hideIcon icon={WalletAdd} title="Tabungan" subtitle={goals.length === 0 ? 'Belum ada' : `${savingsIndex + 1}/${savingsItems.length} target`} theme={theme} showDetail />
              <SavingsDeck activeIndex={savingsIndex} items={savingsItems} onIndexChange={setSavingsIndex} onEmptyPress={() => router.push('/savings-setup')} onDetail={(goalId) => router.push({ pathname: '/finance-detail', params: { id: goalId, type: 'savings' } })} theme={theme} />
              <View style={styles.savingsMetaWrap}><Text style={[styles.savingsMetaText, { color: theme.textMuted }]} numberOfLines={1}>{activeGoal?.targetAmount ? `Target ${activeGoalLabel}` : 'Belum ada target aktif'}</Text>{activeGoalMonthlyNeeded > 0 ? <Text style={[styles.savingsMetaText, { color: theme.textMuted }]} numberOfLines={1}>Ideal Rp{activeGoalMonthlyNeeded.toLocaleString('id-ID')} / bulan</Text> : null}{savingsRecommendations ? <Text style={[styles.savingsMetaText, { color: theme.income }]} weight="bold">Aman dialokasikan {formatCurrency(savingsRecommendations.capacity.safe_now)}</Text> : null}{savingsPlan.slice(0, 3).map((goal) => <View key={goal.goal_id} style={styles.savingsPlanRow}><Text style={[styles.savingsMetaText, { color: theme.textMuted }]} numberOfLines={1}>{goal.name}</Text><Text style={[styles.savingsMetaText, { color: theme.textPrimary }]} weight="bold">{formatCurrency(goal.suggested)}</Text></View>)}</View>
            </Pressable>
          )}

          {settingsSection === 'debts' ? (
            <View style={styles.debtSettings}>
              <Card variant="teal" style={styles.debtSummary}>
                <View style={styles.debtSummaryTop}>
                  <View style={[styles.debtSummaryIcon, { backgroundColor: theme.accent }]}><CardReceive color={theme.deepTeal} size={22} variant="Bold" /></View>
                  <View style={[styles.debtSummaryBadge, { backgroundColor: theme.surfaceElement }]}><Text style={[styles.debtSummaryBadgeText, { color: theme.deepTeal }]} weight="bold">{debts.length} UTANG</Text></View>
                </View>
                <Text style={[styles.debtSummaryLabel, { color: theme.onPrimary }]}>Total kewajiban tersisa</Text>
                <Text style={[styles.debtSummaryValue, { color: theme.accent }]} weight="bold">{formatCurrency(totalDebt)}</Text>
                <View style={styles.debtSummaryFooter}>
                  <Text style={[styles.debtSummaryMeta, { color: theme.onPrimary }]}>{nearestDebt ? `Terdekat ${formatCurrency(nearestDebt.monthlyAmount)}` : 'Belum ada pembayaran terjadwal'}</Text>
                  <Text style={[styles.debtSummaryMeta, { color: theme.onPrimary }]}>{nearestDebt?.dueLabel ?? '—'}</Text>
                </View>
              </Card>

              <View style={styles.debtListHeader}>
                <View style={styles.debtListHeading}><Text style={[styles.debtListTitle, { color: theme.textPrimary }]} weight="bold">Daftar hutang</Text><Text style={[styles.debtListSubtitle, { color: theme.textMuted }]}>Pantau sisa dan cicilan berikutnya</Text></View>
                <TouchableOpacity onPress={() => openForm('debt')} style={[styles.accountAddButton, { backgroundColor: theme.deepTeal }]}><Add color={theme.accent} size={17} variant="Bold" /><Text style={[styles.accountAddText, { color: theme.onPrimary }]} weight="bold">Tambah</Text></TouchableOpacity>
              </View>

              <View style={styles.debtList}>
                {debts.map((item) => {
                  const plan = item.installment_plan as InstallmentPlan;
                  const due = summarizeInstallmentDue(plan);
                  const progress = item.total_amount > 0 ? Math.min(item.paid_amount / item.total_amount, 1) : 0;
                  const statusLabel = item.status === 'paid' ? 'Lunas' : due?.status === 'overdue' ? 'Terlambat' : due?.status === 'due_soon' ? 'Segera jatuh tempo' : 'Aktif';
                  const statusColor = item.status === 'paid' ? theme.income : due?.status === 'overdue' ? theme.expense : due?.status === 'due_soon' ? theme.warning : theme.deepTeal;
                  const statusSurface = item.status === 'paid' ? theme.incomeSurface : due?.status === 'overdue' ? theme.expenseSurface : due?.status === 'due_soon' ? theme.warningSurface : theme.surfaceElement;
                  return <TouchableOpacity key={item.id} accessibilityRole="button" accessibilityLabel={`Buka detail ${item.name}, sisa ${formatCurrency(item.remaining_amount)}, status ${statusLabel}`} activeOpacity={0.84} onPress={() => router.push({ pathname: '/finance-detail', params: { id: item.id, type: 'debt' } })}>
                    <Card variant="default" style={[styles.debtItem, { borderColor: theme.border }]}>
                      <View style={styles.debtItemTop}>
                        <View style={[styles.debtItemIcon, { backgroundColor: statusSurface }]}><CardReceive color={statusColor} size={20} variant="Bold" /></View>
                        <View style={styles.debtItemCopy}><Text style={[styles.debtItemName, { color: theme.textPrimary }]} weight="bold" numberOfLines={1}>{item.name}</Text><View style={[styles.debtStatusChip, { backgroundColor: statusSurface }]}><Text style={[styles.debtStatusText, { color: statusColor }]} weight="bold">{statusLabel}</Text></View></View>
                        <ArrowRight2 color={theme.textMuted} size={18} />
                      </View>
                      <View style={styles.debtAmountRow}><View><Text style={[styles.debtAmountLabel, { color: theme.textMuted }]}>Sisa hutang</Text><Text style={[styles.debtItemAmount, { color: theme.textPrimary }]} weight="bold">{formatCurrency(item.remaining_amount)}</Text></View><View style={styles.debtPaidCopy}><Text style={[styles.debtAmountLabel, { color: theme.textMuted }]}>Sudah dibayar</Text><Text style={[styles.debtPaidAmount, { color: theme.income }]} weight="bold">{formatCurrency(item.paid_amount)}</Text></View></View>
                      <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }} style={[styles.track, { backgroundColor: theme.surfaceMuted }]}><View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: theme.accent }]} /></View>
                      <View style={styles.debtItemFooter}><View style={styles.debtFooterCopy}><Text style={[styles.debtFooterStrong, { color: theme.textPrimary }]} weight="bold">{formatCurrency(plan?.monthly_amount ?? 0)} / bulan</Text><Text style={[styles.debtFooterMuted, { color: statusColor }]}>{due?.due_label ?? 'Jadwal belum tersedia'}</Text></View><View style={styles.accountItemActions}><TouchableOpacity accessibilityLabel={`Edit ${item.name}`} hitSlop={8} style={[styles.accountActionButton, { backgroundColor: theme.surfaceElement }]} onPress={(event) => { event.stopPropagation(); openEdit({ kind: 'debt', id: item.id, name: item.name, version: item.version }); }}><Edit2 color={theme.deepTeal} size={16} /></TouchableOpacity><TouchableOpacity accessibilityLabel={`Hapus ${item.name}`} hitSlop={8} style={[styles.accountActionButton, { backgroundColor: theme.expenseSurface }]} onPress={(event) => { event.stopPropagation(); openDelete({ kind: 'debt', id: item.id, name: item.name, version: item.version }); }}><Trash color={theme.expense} size={16} /></TouchableOpacity></View></View>
                    </Card>
                  </TouchableOpacity>;
                })}
                {!debts.length ? <Card variant="surface" style={styles.emptyDebt}><View style={[styles.emptyDebtIcon, { backgroundColor: theme.cardBackground }]}><CardReceive color={theme.deepTeal} size={22} variant="Bold" /></View><Text style={{ color: theme.textPrimary }} weight="bold">Belum ada hutang</Text><Text style={[styles.emptyDebtCopy, { color: theme.textMuted }]}>Tambahkan cicilan atau pinjaman agar pembayaran berikutnya lebih mudah dipantau.</Text><Button title="Tambah hutang pertama" size="small" variant="outline" onPress={() => openForm('debt')} /></Card> : null}
              </View>
            </View>
          ) : <Pressable onPress={() => openSection('debts')} style={[styles.duoCard, settingsSection === 'savings' ? styles.hidden : undefined, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <SectionHeader
              compact
              hideIcon
              icon={CardReceive}
              title="Utang"
              subtitle={debts.length === 0 ? 'Opsional' : `${debts.length} aktif`}
              theme={theme}
              onAdd={settingsSection ? () => openForm('debt') : undefined}
              showDetail={!settingsSection}
            />
            <SavingsDeck
              activeIndex={debtIndex}
              items={debtItems.map((item) => ({ id: item.id, name: item.name, targetAmount: item.totalAmount, targetDate: undefined, savedAmount: item.totalAmount - item.remainingAmount }))}
              onIndexChange={setDebtIndex}
              onEmptyPress={() => openForm('debt')}
              theme={theme}
            />
            <View style={styles.savingsMetaWrap}>
              <Text style={[styles.savingsMetaText, { color: theme.textMuted }]} numberOfLines={1}>
                {activeDebt?.totalAmount ? `Sisa ${formatCurrency(activeDebt.remainingAmount)}` : 'Belum ada utang aktif'}
              </Text>
              {activeDebt?.monthlyAmount ? (
                <Text style={[styles.savingsMetaText, { color: theme.textMuted }]} numberOfLines={1}>
                  {formatCurrency(activeDebt.monthlyAmount)} / bulan · {activeDebt.paidInstallments}/{activeDebt.tenorMonths} · {activeDebt.dueLabel}
                </Text>
              ) : null}
            </View>
          </Pressable>}
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(260).duration(320)} style={settingsSection && settingsSection !== 'categories' ? styles.hidden : undefined}>
          {settingsSection === 'categories' ? (
            <View style={styles.categorySettings}>
              <Card variant="teal" style={styles.categorySummary}>
                <View style={styles.categorySummaryTop}><View style={[styles.debtSummaryIcon, { backgroundColor: theme.accent }]}><Category2 color={theme.deepTeal} size={22} variant="Bold" /></View><Text style={[styles.categorySummaryCount, { color: theme.accent }]} weight="bold">{categories.length} KATEGORI</Text></View>
                <Text style={[styles.accountSummaryLabel, { color: theme.onPrimary }]}>Kategori transaksi aktif</Text>
                <View style={styles.categorySummaryStats}><View><Text style={[styles.categorySummaryValue, { color: theme.onPrimary }]} weight="bold">{categories.filter((item) => item.type === 'EXPENSE').length}</Text><Text style={[styles.categorySummaryMeta, { color: theme.onPrimary }]}>Pengeluaran</Text></View><View><Text style={[styles.categorySummaryValue, { color: theme.accent }]} weight="bold">{categories.filter((item) => item.type === 'INCOME').length}</Text><Text style={[styles.categorySummaryMeta, { color: theme.onPrimary }]}>Pemasukan</Text></View></View>
              </Card>
              <View style={styles.accountListHeader}><Text style={[styles.accountListTitle, { color: theme.textPrimary }]} weight="bold">Daftar kategori</Text><TouchableOpacity onPress={() => openForm('category')} style={[styles.accountAddButton, { backgroundColor: theme.deepTeal }]}><Add color={theme.accent} size={17} variant="Bold" /><Text style={[styles.accountAddText, { color: theme.onPrimary }]} weight="bold">Tambah</Text></TouchableOpacity></View>
              <View style={styles.accountList}>
                {categories.map((category) => { const income = category.type === 'INCOME'; const surface = income ? theme.incomeSurface : theme.expenseSurface; const color = income ? theme.income : theme.expense; return <TouchableOpacity key={category.id} activeOpacity={0.82} onPress={() => openEdit({ kind: 'category', id: category.id, name: category.name, version: category.version })}><Card variant="default" style={[styles.categoryItem, { borderColor: theme.border }]}><View style={[styles.accountItemIcon, { backgroundColor: surface }]}><Category2 color={color} size={21} variant="Bold" /></View><View style={styles.accountItemCopy}><Text style={[styles.accountItemName, { color: theme.textPrimary }]} weight="bold" numberOfLines={1}>{category.name}</Text><View style={[styles.categoryTypeBadge, { backgroundColor: surface }]}><Text style={[styles.categoryTypeText, { color }]} weight="bold">{income ? 'PEMASUKAN' : 'PENGELUARAN'}</Text></View></View><View style={styles.accountItemActions}><TouchableOpacity accessibilityLabel={`Edit kategori ${category.name}`} hitSlop={8} style={[styles.accountActionButton, { backgroundColor: theme.surfaceElement }]} onPress={(event) => { event.stopPropagation(); openEdit({ kind: 'category', id: category.id, name: category.name, version: category.version }); }}><Edit2 color={theme.deepTeal} size={16} /></TouchableOpacity><TouchableOpacity accessibilityLabel={`Hapus kategori ${category.name}`} hitSlop={8} style={[styles.accountActionButton, { backgroundColor: theme.expenseSurface }]} onPress={(event) => { event.stopPropagation(); openDelete({ kind: 'category', id: category.id, name: category.name, version: category.version }); }}><Trash color={theme.expense} size={16} /></TouchableOpacity></View></Card></TouchableOpacity>; })}
                {!categories.length ? <Card variant="surface" style={styles.emptyCategory}><View style={[styles.emptyDebtIcon, { backgroundColor: theme.cardBackground }]}><Category2 color={theme.deepTeal} size={22} variant="Bold" /></View><Text style={{ color: theme.textPrimary }} weight="bold">Belum ada kategori</Text><Text style={[styles.emptyDebtCopy, { color: theme.textMuted }]}>Tambahkan kategori agar pemasukan dan pengeluaran lebih mudah dikelompokkan.</Text><Button title="Tambah kategori pertama" size="small" variant="outline" onPress={() => openForm('category')} /></Card> : null}
              </View>
            </View>
          ) : <Pressable onPress={() => openSection('categories')} style={[styles.widget, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}><SectionHeader icon={Category2} title="Kategori" subtitle={`${categories.length} kategori transaksi`} theme={theme} showDetail /></Pressable>}
        </Animated.View>
      </ScrollView>

      <Modal visible={!!deleteTarget} transparent animationType="fade" onRequestClose={closeDelete}>
        <Pressable style={styles.confirmBackdrop} onPress={closeDelete}>
          <Pressable onPress={(event) => event.stopPropagation()}>
            <Card variant="default" style={styles.confirmCard}>
              <View style={[styles.deleteIcon, { backgroundColor: theme.expenseSurface }]}>
                <Trash color={theme.expense} size={24} variant="Outline" />
              </View>
              <Text style={[styles.confirmTitle, { color: theme.textPrimary }]} weight="bold">Hapus {deleteTarget?.kind === 'account' ? 'akun' : deleteTarget?.kind === 'category' ? 'kategori' : deleteTarget?.kind === 'savings' ? 'target tabungan' : 'utang'}?</Text>
              <Text style={[styles.confirmMessage, { color: theme.textSecondary }]}>
                {deleteTarget?.kind === 'account'
                  ? `Akun “${deleteTarget.name}” hanya dapat dihapus jika bukan akun default, saldo nol, dan belum dipakai transaksi aktif.`
                  : deleteTarget?.kind === 'category'
                    ? `Kategori “${deleteTarget?.name ?? ''}” akan disembunyikan dari pilihan baru. Histori transaksi tetap tersimpan.`
                    : deleteTarget?.kind === 'savings'
                      ? `Target tabungan “${deleteTarget?.name ?? ''}” akan dihapus dari daftar kelola.`
                      : `Utang “${deleteTarget?.name ?? ''}” akan dihapus dari daftar kelola.`}
              </Text>

              {deleteError ? <Text style={[styles.confirmError, { color: theme.expense }]}>{deleteError}</Text> : null}
              <View style={styles.confirmActions}>
                <Button title="Batal" variant="outline" disabled={deleting} onPress={closeDelete} style={styles.confirmButton} />
                <Button title={deleting ? 'Menghapus…' : 'Hapus'} disabled={deleting} onPress={confirmDelete} style={[styles.confirmButton, { backgroundColor: theme.expense }]} />
              </View>
            </Card>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal visible={!!form} transparent animationType="slide" onRequestClose={closeForm}>
        <Pressable style={styles.modalBackdrop} onPress={closeForm}>
          <Pressable
            style={[styles.sheet, { backgroundColor: theme.cardBackground }]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Sheet Handle Indicator */}
            <View style={[styles.sheetHandle, { backgroundColor: theme.border }]} />

            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: theme.textPrimary }]} weight="bold">
                 {editTarget ? `Edit ${editTarget.kind === 'account' ? 'Akun' : 'Kategori'}` : form ? FORM_COPY[form].title : ''}
              </Text>
              <TouchableOpacity onPress={closeForm} accessibilityLabel="Tutup" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <CloseCircle color={theme.textMuted} size={24} variant="Outline" />
              </TouchableOpacity>
            </View>

            <KeyboardAwareScrollView
              enableOnAndroid
              enableAutomaticScroll={false}
              extraHeight={0}
              extraScrollHeight={0}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.sheetScrollContent}
            >
              {form === 'debt' ? (
                <View style={styles.formFieldsGap}>
                  {/* Nama Utang */}
                  <View style={styles.fieldBlock}>
                    <Text style={[styles.fieldLabelText, { color: theme.textMuted }]} weight="bold">
                      NAMA UTANG / PINJAMAN
                    </Text>
                    <View style={[styles.inputWithIcon, { borderColor: theme.border, backgroundColor: theme.surfaceElement }]}>
                      <CardReceive color={theme.textSecondary} size={20} variant="Outline" />
                      <TextInput
                        autoFocus
                        value={debtName}
                        onChangeText={setDebtName}
                        placeholder="Contoh: Cicilan Motor / Kredivo"
                        placeholderTextColor={theme.textMuted}
                        style={[styles.flexInput, { color: theme.textPrimary }]}
                      />
                    </View>
                  </View>

                  {/* Total Utang Nominal */}
                  <View style={styles.fieldBlock}>
                    <Text style={[styles.fieldLabelText, { color: theme.textMuted }]} weight="bold">
                      TOTAL UTANG NOMINAL (RP)
                    </Text>
                    <View style={[styles.inputWithIcon, { borderColor: theme.border, backgroundColor: theme.surfaceElement }]}>
                      <DollarCircle color={theme.textSecondary} size={20} variant="Outline" />
                      <TextInput
                        value={debtAmount}
                        onChangeText={(t) => setDebtAmount(t.replace(/\D/g, ''))}
                        placeholder="Contoh: 12000000"
                        keyboardType="numeric"
                        placeholderTextColor={theme.textMuted}
                        style={[styles.flexInput, { color: theme.textPrimary }]}
                      />
                    </View>
                    {Number(debtAmount) > 0 ? (
                      <Text style={[styles.inputHelperText, { color: theme.expense }]} weight="semibold">
                        = {formatCurrency(Number(debtAmount))}
                      </Text>
                    ) : null}
                  </View>

                  {/* Tenor & Kebayar Row */}
                  <View style={styles.fieldBlock}>
                    <Text style={[styles.fieldLabelText, { color: theme.textMuted }]} weight="bold">
                      DURASI CICILAN & STATUS
                    </Text>
                    <View style={styles.tenorTwoColRow}>
                      <View style={[styles.tenorColCard, { borderColor: theme.border, backgroundColor: theme.surfaceElement }]}>
                        <Text style={[styles.tenorColLabel, { color: theme.textMuted }]} weight="medium">Tenor Total</Text>
                        <View style={styles.tenorColInputWrap}>
                          <TextInput
                            value={debtTenor}
                            onChangeText={(t) => setDebtTenor(t.replace(/\D/g, ''))}
                            keyboardType="numeric"
                            style={[styles.tenorColInput, { color: theme.textPrimary }]}
                          />
                          <Text style={[styles.tenorColSuffix, { color: theme.textMuted }]}>Bulan</Text>
                        </View>
                      </View>

                      <View style={[styles.tenorColCard, { borderColor: theme.border, backgroundColor: theme.surfaceElement }]}>
                        <Text style={[styles.tenorColLabel, { color: theme.textMuted }]} weight="medium">Sudah Kebayar</Text>
                        <View style={styles.tenorColInputWrap}>
                          <TextInput
                            value={debtPaidMonths}
                            onChangeText={(t) => setDebtPaidMonths(t.replace(/\D/g, ''))}
                            keyboardType="numeric"
                            style={[styles.tenorColInput, { color: theme.textPrimary }]}
                          />
                          <Text style={[styles.tenorColSuffix, { color: theme.textMuted }]}>Bulan</Text>
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Mulai Cicilan Date Picker Button */}
                  <View style={styles.fieldBlock}>
                    <Text style={[styles.fieldLabelText, { color: theme.textMuted }]} weight="bold">
                      TANGGAL MULAI CICILAN
                    </Text>
                    <TouchableOpacity
                      activeOpacity={0.86}
                      onPress={() => openDatePicker('debt')}
                      style={[
                        styles.dateButton,
                        {
                          borderColor: theme.border,
                          backgroundColor: theme.surfaceElement,
                        },
                      ]}
                    >
                      <View style={styles.dateButtonContent}>
                        <Calendar color={theme.textSecondary} size={20} variant="Outline" />
                        <Text style={[styles.dateButtonLabel, { color: theme.textPrimary }]} weight="medium">
                          Mulai cicilan: {formatLongDate(debtStartDate)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>

                  {/* Live Calculation Preview Card for Debt */}
                  {Number(debtAmount) > 0 && Number(debtTenor) > 0 ? (
                    <View style={[styles.summaryCard, { backgroundColor: theme.surfaceElement, borderColor: theme.border }]}>
                      <View style={styles.summaryRow}>
                        <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Est. Angsuran:</Text>
                        <Text style={[styles.summaryValue, { color: theme.expense }]} weight="bold">
                          {formatCurrency(Math.round(Number(debtAmount) / Math.max(1, Number(debtTenor))))} / bulan
                        </Text>
                      </View>
                      <View style={styles.summaryRow}>
                        <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Sudah Dibayar ({debtPaidMonths || '0'} bln):</Text>
                        <Text style={[styles.summaryValue, { color: theme.income }]} weight="semibold">
                          {formatCurrency(Math.round((Number(debtAmount) / Math.max(1, Number(debtTenor))) * Math.min(Number(debtTenor), Number(debtPaidMonths || 0))))}
                        </Text>
                      </View>
                      <View style={styles.summaryRow}>
                        <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Sisa Utang:</Text>
                        <Text style={[styles.summaryValue, { color: theme.textPrimary }]} weight="bold">
                          {formatCurrency(Math.max(0, Number(debtAmount) - Math.round((Number(debtAmount) / Math.max(1, Number(debtTenor))) * Math.min(Number(debtTenor), Number(debtPaidMonths || 0)))))}
                        </Text>
                      </View>
                    </View>
                  ) : null}
                </View>
              ) : form === 'savings' ? (
                <View style={styles.formFieldsGap}>
                  {/* Nama Target */}
                  <View style={styles.fieldBlock}>
                    <Text style={[styles.fieldLabelText, { color: theme.textMuted }]} weight="bold">
                      NAMA TARGET TABUNGAN
                    </Text>
                    <View style={[styles.inputWithIcon, { borderColor: theme.border, backgroundColor: theme.surfaceElement }]}>
                      <WalletAdd color={theme.textSecondary} size={20} variant="Outline" />
                      <TextInput
                        autoFocus
                        value={savingsName}
                        onChangeText={setSavingsName}
                        placeholder="Contoh: Beli Laptop Baru / Dana Darurat"
                        placeholderTextColor={theme.textMuted}
                        style={[styles.flexInput, { color: theme.textPrimary }]}
                      />
                    </View>
                  </View>

                  {/* Target Nominal */}
                  <View style={styles.fieldBlock}>
                    <Text style={[styles.fieldLabelText, { color: theme.textMuted }]} weight="bold">
                      TARGET NOMINAL (RP)
                    </Text>
                    <View style={[styles.inputWithIcon, { borderColor: theme.border, backgroundColor: theme.surfaceElement }]}>
                      <DollarCircle color={theme.textSecondary} size={20} variant="Outline" />
                      <TextInput
                        value={savingsTargetAmount}
                        onChangeText={(t) => setSavingsTargetAmount(t.replace(/\D/g, ''))}
                        placeholder="Contoh: 15000000"
                        keyboardType="numeric"
                        placeholderTextColor={theme.textMuted}
                        style={[styles.flexInput, { color: theme.textPrimary }]}
                      />
                    </View>
                    {Number(savingsTargetAmount) > 0 ? (
                      <Text style={[styles.inputHelperText, { color: theme.accentText }]} weight="semibold">
                        = {formatCurrency(Number(savingsTargetAmount))}
                      </Text>
                    ) : null}
                  </View>

                  {/* Target Tanggal */}
                  <View style={styles.fieldBlock}>
                    <Text style={[styles.fieldLabelText, { color: theme.textMuted }]} weight="bold">
                      TARGET TANGGAL CAPAI (OPSIONAL)
                    </Text>
                    <TouchableOpacity
                      activeOpacity={0.86}
                      onPress={() => openDatePicker('savings')}
                      style={[
                        styles.dateButton,
                        {
                          borderColor: theme.border,
                          backgroundColor: theme.surfaceElement,
                        },
                      ]}
                    >
                      <View style={styles.dateButtonContent}>
                        <Calendar color={savingsTargetDate ? theme.textSecondary : theme.textMuted} size={20} variant="Outline" />
                        <Text style={[styles.dateButtonLabel, { color: savingsTargetDate ? theme.textPrimary : theme.textMuted }]} weight="medium">
                          {savingsTargetDate ? `Target: ${formatLongDate(savingsTargetDate)}` : 'Pilih target tanggal capai'}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.fieldBlock}>
                    <Text style={[styles.fieldLabelText, { color: theme.textMuted }]} weight="bold">ULANGI SETIAP</Text>
                    <View style={styles.accountKindGrid}>{([['', 'Tidak berulang'], ['MONTH_1', '1 bulan'], ['MONTH_3', '3 bulan'], ['MONTH_6', '6 bulan'], ['YEAR_1', '1 tahun']] as const).map(([preset, label]) => <TouchableOpacity key={label} accessibilityRole="radio" accessibilityState={{ selected: savingsRecurrence === preset }} onPress={() => setSavingsRecurrence(preset)} style={[styles.dateButton, { borderColor: savingsRecurrence === preset ? theme.primary : theme.border, backgroundColor: theme.surfaceElement }]}><Text style={{ color: theme.textPrimary }}>{label}</Text></TouchableOpacity>)}</View>
                  </View>



                  {Number(savingsTargetAmount) > 0 ? (
                    <View style={[styles.summaryCard, { backgroundColor: theme.surfaceElement, borderColor: theme.border }]}>
                      <View style={styles.summaryRow}>
                        <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Target Capai:</Text>
                        <Text style={[styles.summaryValue, { color: theme.textPrimary }]} weight="bold">
                          {formatCurrency(Number(savingsTargetAmount))}
                        </Text>
                      </View>
                      {savingsTargetDate ? (
                        <View style={styles.summaryRow}>
                          <Text style={[styles.summaryLabel, { color: theme.textMuted }]}>Estimasi Nabung:</Text>
                          <Text style={[styles.summaryValue, { color: theme.accentText }]} weight="bold">
                            {formatCurrency(monthlyNeeded(Number(savingsTargetAmount), savingsTargetDate))} / bulan
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              ) : form === 'account' ? (
                <View style={styles.formFieldsGap}>
                  <View style={styles.fieldBlock}>
                    <Text style={[styles.fieldLabelText, { color: theme.textMuted }]} weight="bold">
                      NAMA AKUN PEMBAYARAN
                    </Text>
                    <View style={[styles.inputWithIcon, { borderColor: theme.border, backgroundColor: theme.surfaceElement }]}>
                      <Bank color={theme.textSecondary} size={20} variant="Outline" />
                      <TextInput
                        autoFocus
                        value={accountName}
                        onChangeText={setAccountName}
                        placeholder="Contoh: Bank BCA / E-Wallet GoPay"
                        placeholderTextColor={theme.textMuted}
                        style={[styles.flexInput, { color: theme.textPrimary }]}
                      />
                    </View>
                  </View>

                  <View style={styles.fieldBlock}>
                    <Text style={[styles.fieldLabelText, { color: theme.textMuted }]} weight="bold">JENIS AKUN</Text>
                    <View style={styles.accountKindGrid}>
                      {([
                        ['CASH', 'Tunai'],
                        ['BANK', 'Bank'],
                        ['E_WALLET', 'E-Wallet'],
                        ['INVESTMENT', 'Investasi / Aset'],
                      ] as const).map(([kind, label]) => (
                        <TouchableOpacity key={kind} onPress={() => setAccountKind(kind)} style={[styles.accountKindButton, { backgroundColor: accountKind === kind ? theme.deepTeal : theme.surfaceElement, borderColor: accountKind === kind ? theme.deepTeal : theme.border }]}>
                          <Text style={[styles.accountKindText, { color: accountKind === kind ? theme.onPrimary : theme.textPrimary }]} weight="bold">{label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.fieldBlock}>
                    <Text style={[styles.fieldLabelText, { color: theme.textMuted }]} weight="bold">NOMOR AKUN (OPSIONAL)</Text>
                    <View style={[styles.inputWithIcon, { borderColor: theme.border, backgroundColor: theme.surfaceElement }]}>
                      <CardReceive color={theme.textSecondary} size={20} variant="Outline" />
                      <TextInput value={accountNumber} onChangeText={setAccountNumber} maxLength={64} placeholder="Nomor rekening / ID wallet" placeholderTextColor={theme.textMuted} style={[styles.flexInput, { color: theme.textPrimary }]} />
                    </View>
                  </View>

                  <TouchableOpacity onPress={() => setAccountDefault((value) => !value)} style={[styles.defaultToggle, { backgroundColor: accountDefault ? theme.deepTeal : theme.surfaceElement, borderColor: accountDefault ? theme.deepTeal : theme.border }]}>
                    <Text style={{ color: accountDefault ? theme.onPrimary : theme.textPrimary }} weight="bold">{accountDefault ? 'Akun utama' : 'Jadikan akun utama'}</Text>
                  </TouchableOpacity>

                  {!editTarget ? (
                    <View style={styles.fieldBlock}>
                      <Text style={[styles.fieldLabelText, { color: theme.textMuted }]} weight="bold">
                        SALDO AWAL (RP)
                      </Text>
                      <View style={[styles.inputWithIcon, { borderColor: theme.border, backgroundColor: theme.surfaceElement }]}>
                        <DollarCircle color={theme.textSecondary} size={20} variant="Outline" />
                        <TextInput
                          value={accountBalance}
                          onChangeText={(t) => setAccountBalance(t.replace(/\D/g, ''))}
                          placeholder="Contoh: 1500000 (Bisa 0)"
                          keyboardType="numeric"
                          placeholderTextColor={theme.textMuted}
                          style={[styles.flexInput, { color: theme.textPrimary }]}
                        />
                      </View>
                      {Number(accountBalance) > 0 ? (
                        <Text style={[styles.inputHelperText, { color: theme.income }]} weight="semibold">
                          = {formatCurrency(Number(accountBalance))}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              ) : (
                <View style={styles.formFieldsGap}>
                  <View style={styles.fieldBlock}>
                    <Text style={[styles.fieldLabelText, { color: theme.textMuted }]} weight="bold">
                      {form === 'budget' ? 'NOMINAL LIMIT BUDGET BULANAN (RP)' : 'NAMA KATEGORI TRANSAKSI'}
                    </Text>
                    <View style={[styles.inputWithIcon, { borderColor: theme.border, backgroundColor: theme.surfaceElement }]}>
                      {form === 'budget' ? (
                        <Chart color={theme.textSecondary} size={20} variant="Outline" />
                      ) : (
                        <Category2 color={theme.textSecondary} size={20} variant="Outline" />
                      )}
                      <TextInput
                        autoFocus
                        value={value}
                        onChangeText={setValue}
                         keyboardType={form === 'budget' ? 'numeric' : 'default'}
                         maxLength={form === 'category' ? 100 : undefined}
                         placeholder={form ? FORM_COPY[form].placeholder : ''}
                        placeholderTextColor={theme.textMuted}
                        style={[styles.flexInput, { color: theme.textPrimary }]}
                      />
                    </View>
                     {form === 'category' ? <View style={styles.categoryTypeOptions}>{(['EXPENSE', 'INCOME'] as const).map((type) => { const selected = categoryType === type; return <TouchableOpacity key={type} disabled={!!editTarget} onPress={() => setCategoryType(type)} style={[styles.categoryTypeOption, { borderColor: selected ? theme.deepTeal : theme.border, backgroundColor: selected ? theme.surfaceElement : theme.cardBackground, opacity: editTarget && !selected ? 0.45 : 1 }]}><Text style={{ color: selected ? theme.deepTeal : theme.textMuted }} weight="bold">{type === 'EXPENSE' ? 'Pengeluaran' : 'Pemasukan'}</Text></TouchableOpacity>; })}</View> : null}
                     {form === 'category' && editTarget ? <Text style={[styles.inputHelperText, { color: theme.textMuted }]}>Tipe kategori tidak dapat diubah setelah dibuat.</Text> : null}
                     {form === 'budget' && Number(value.replace(/\D/g, '')) > 0 ? (

                      <Text style={[styles.inputHelperText, { color: theme.accentText }]} weight="semibold">
                        = {formatCurrency(Number(value.replace(/\D/g, '')))}
                      </Text>
                    ) : null}
                  </View>
                </View>
              )}

               {form && error ? <Text style={[styles.confirmError, { color: theme.expense }]}>{error}</Text> : null}
               <TouchableOpacity
                 onPress={() => void saveForm()}
                disabled={saving || (form === 'debt' ? (!debtName.trim() || !debtAmount.trim()) : form === 'savings' ? (!savingsName.trim() || !savingsTargetAmount.trim()) : form === 'account' ? !accountName.trim() : !value.trim())}
                style={[
                  styles.save,
                  {
                    backgroundColor: (form === 'debt' ? (debtName.trim() && debtAmount.trim()) : form === 'savings' ? (savingsName.trim() && savingsTargetAmount.trim()) : form === 'account' ? accountName.trim() : value.trim()) ? theme.deepTeal : theme.surfaceMuted,
                    marginTop: 16,
                  },
                ]}
              >
                {saving ? (
                  <View style={styles.savingContent}>
                    <ActivityIndicator color={theme.onPrimary} size="small" />
                    <Text style={{ color: theme.onPrimary, fontWeight: '800' }}>Menyimpan…</Text>
                  </View>
                ) : (
                  <Text style={{ color: (form === 'debt' ? (debtName.trim() && debtAmount.trim()) : form === 'savings' ? (savingsName.trim() && savingsTargetAmount.trim()) : form === 'account' ? accountName.trim() : value.trim()) ? theme.onPrimary : theme.textMuted, fontWeight: '800' }}>
                    {editTarget ? 'Simpan Perubahan' : form ? FORM_COPY[form].buttonText : 'Simpan'}
                  </Text>
                )}
              </TouchableOpacity>
            </KeyboardAwareScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      <CustomDatePickerModal
        visible={datePickerTarget !== null}
        title={datePickerTarget === 'debt' ? 'Pilih Mulai Cicilan' : 'Pilih Target Tanggal'}
        value={datePickerTarget === 'savings' ? (savingsTargetDate || todayIso()) : debtStartDate}
        onConfirm={handleConfirmDate}
        onClose={() => setDatePickerTarget(null)}
      />
    </>
  );
}

function SectionHeader({
  compact = false,
  hideIcon = false,
  icon: Icon,
  onAdd,
  showDetail = false,
  subtitle,
  theme,
  title,
  trailing,
}: {
  compact?: boolean;
  hideIcon?: boolean;
  icon: React.ComponentType<any>;
  onAdd?: () => void;
  showDetail?: boolean;
  subtitle: string;
  theme: ReturnType<typeof getTheme>;
  title: string;
  trailing?: React.ReactNode;
}) {
  return (
    <View style={styles.widgetHeader}>
      {!hideIcon && (
        <View style={[styles.iconBox, compact && styles.compactIconBox, { backgroundColor: theme.surfaceElement }]}>
          <Icon color={theme.deepTeal} size={compact ? 18 : 21} variant="Bold" />
        </View>
      )}
      <View style={styles.copy}>
        <Text style={[styles.widgetTitle, compact && styles.compactWidgetTitle, { color: theme.textPrimary }]} numberOfLines={1}>
          {title}
        </Text>
        <Text style={[styles.widgetSubtitle, compact && styles.compactWidgetSubtitle, { color: theme.textMuted }]} numberOfLines={1}>
          {subtitle}
        </Text>
      </View>
      <View style={styles.headerButtons}>
        {onAdd ? (
          <TouchableOpacity
            onPress={onAdd}
            style={[styles.inlineAdd, compact && styles.compactInlineAdd, { backgroundColor: theme.surfaceElement }]}
            accessibilityLabel={`Tambah ${title}`}
          >
            <Add color={theme.deepTeal} size={compact ? 14 : 16} variant="Bold" />
          </TouchableOpacity>
        ) : showDetail ? (
          <View style={[styles.inlineAdd, compact && styles.compactInlineAdd, { backgroundColor: theme.surfaceElement }]}>
            <ArrowRight2 color={theme.deepTeal} size={compact ? 14 : 16} variant="Bold" />
          </View>
        ) : null}
        {trailing}
      </View>
    </View>
  );
}

function SavingsDeck({
  activeIndex,
  items,
  onEmptyPress,
  onIndexChange,
  onDetail,
  theme,
}: {
  activeIndex: number;
  items: SavingsItem[];
  onEmptyPress: () => void;
  onIndexChange: (index: number) => void;
  onDetail?: (id: string) => void;
  theme: ReturnType<typeof getTheme>;
}) {
  const handleNext = () => {
    onIndexChange((activeIndex + 1) % items.length);
  };

  return (
    <View style={styles.deckWrap}>
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={items[activeIndex]?.id === 'empty' ? onEmptyPress : onDetail ? () => onDetail(items[activeIndex].id) : items.length > 1 ? handleNext : undefined}
        style={styles.stackedCarouselContainer}
      >
        {items.map((item, index) => {
          // Hitung relative offset terhadap activeIndex
          const position = (index - activeIndex + items.length) % items.length;
          // Tampilkan 3 kartu teratas
          if (position > 2) return null;

          const itemProgress = item.targetAmount > 0 ? Math.min(item.savedAmount / item.targetAmount, 1) : 0;

          // ReactBits 3D Depth transform values (Scale, translateY, opacity, zIndex)
          const scale = 1 - position * 0.08;
          const translateY = position * 12;
          const opacity = 1 - position * 0.22;
          const zIndex = items.length - position;

          return (
            <Animated.View
              key={item.id}
              style={[
                styles.reactBitsCard,
                {
                  backgroundColor: position === 0 ? theme.deepTeal : theme.surfaceElement,
                  borderColor: theme.border,
                  borderWidth: position === 0 ? 0 : 1,
                  zIndex,
                  opacity,
                  transform: [
                    { translateY },
                    { scale },
                  ],
                },
              ]}
            >
              <Text
                style={[
                  styles.deckTitle,
                  { color: position === 0 ? theme.onPrimary : theme.textPrimary },
                ]}
                numberOfLines={1}
              >
                {item.name}
              </Text>
              <Text
                style={[
                  styles.deckValue,
                  { color: position === 0 ? theme.accent : theme.textMuted },
                ]}
                numberOfLines={1}
              >
                {item.targetAmount > 0 ? `Rp${item.targetAmount.toLocaleString('id-ID')}` : 'Buat target'}
              </Text>
              <View
                style={[
                  styles.deckTrack,
                  { backgroundColor: position === 0 ? 'rgba(255,255,255,0.18)' : theme.surfaceMuted },
                ]}
              >
                <View
                  style={[
                    styles.deckFill,
                    {
                      width: `${itemProgress * 100}%`,
                      backgroundColor: position === 0 ? theme.accent : theme.deepTeal,
                    },
                  ]}
                />
              </View>
            </Animated.View>
          );
        })}
      </TouchableOpacity>

      {items.length > 1 && (
        <View style={styles.dots}>
          {items.map((item, index) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => onIndexChange(index)}
              style={[
                styles.dot,
                {
                  backgroundColor: index === activeIndex ? theme.deepTeal : theme.border,
                  width: index === activeIndex ? 14 : 6,
                },
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
}

function InlineRow({
  label,
  theme,
  value,
  onEdit,
  onDelete,
}: {
  label: string;
  theme: ReturnType<typeof getTheme>;
  value: string;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <View style={styles.inlineRow}>
      <Text style={[styles.inlineLabel, { color: theme.textMuted }]}>{label}</Text>
      <View style={styles.inlineActions}>
        <Text style={[styles.inlineValue, { color: theme.textPrimary }]}>{value}</Text>
        {onEdit ? (
          <TouchableOpacity accessibilityLabel={`Edit ${label}`} hitSlop={8} onPress={onEdit}>
            <Edit2 color={theme.deepTeal} size={17} variant="Outline" />
          </TouchableOpacity>
        ) : null}
        {onDelete ? (
          <TouchableOpacity accessibilityLabel={`Hapus ${label}`} hitSlop={8} onPress={onDelete}>
            <Trash color={theme.expense} size={17} variant="Outline" />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 110, gap: 12 },
  hidden: { display: 'none' },
  header: { gap: 6, marginBottom: 8 },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.8 },
  subtitle: { fontSize: 14, lineHeight: 20 },
  errorContainer: { marginTop: 8, padding: 12, borderRadius: 16, backgroundColor: '#FDECEC', gap: 8 },
  errorText: { fontSize: 13, lineHeight: 18, fontWeight: '600' },
  retryBtn: { alignSelf: 'flex-start', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  retryText: { fontSize: 12 },
  widget: { borderWidth: 1, borderRadius: 28, padding: 16, gap: 8 },
  widgetHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  widgetBody: { gap: 10, paddingTop: 2 },
  iconBox: { width: 42, height: 42, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, gap: 3 },
  widgetTitle: { fontSize: 17, fontWeight: '800' },
  compactWidgetTitle: { fontSize: 14, fontWeight: '800' },
  widgetSubtitle: { fontSize: 12 },
  compactWidgetSubtitle: { fontSize: 11 },
  headerButtons: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inlineAdd: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  compactInlineAdd: { width: 28, height: 28, borderRadius: 14 },
  compactIconBox: { width: 34, height: 34, borderRadius: 12 },
  accountSettings: { gap: 16 },
  accountSummary: { padding: 20 },
  accountSummaryLabel: { fontSize: 12, opacity: 0.8 },
  accountSummaryValue: { fontSize: 28, marginTop: 8 },
  accountSummaryMeta: { fontSize: 12, opacity: 0.7, marginTop: 5 },
  accountListHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  accountListTitle: { fontSize: 18 },
  accountAddButton: { height: 38, borderRadius: 19, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 6 },
  accountAddText: { fontSize: 12 },
  accountList: { gap: 10 },
  accountItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderWidth: 1 },
  accountItemIcon: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  accountItemCopy: { flex: 1, minWidth: 0 },
  accountItemNameRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  accountItemName: { flexShrink: 1, fontSize: 14 },
  accountMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  accountKindDot: { width: 7, height: 7, borderRadius: 4 },
  accountItemMeta: { fontSize: 11 },
  defaultBadge: { borderRadius: 99, paddingHorizontal: 7, paddingVertical: 3 },
  defaultBadgeText: { fontSize: 8, letterSpacing: 0.4 },
  accountItemBalance: { alignItems: 'flex-end', gap: 8 },
  accountBalanceValue: { fontSize: 13 },
  accountItemActions: { flexDirection: 'row', gap: 7 },
  accountActionButton: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  accountRowBlock: { gap: 6 },
  accountDueChip: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  accountDueChipText: { fontSize: 11, fontWeight: '800' },
  duoRow: { flexDirection: 'row', gap: 12 },
  duoCard: { flex: 1, aspectRatio: 1, borderWidth: 1, borderRadius: 26, padding: 14, justifyContent: 'space-between' },
  savingsSettings: { flex: 1, borderWidth: 1, borderRadius: 26, padding: 16, gap: 16 },
  debtSettings: { flex: 1, gap: 16 },
  debtSummary: { padding: 20, gap: 7 },
  debtSummaryTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  debtSummaryIcon: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  debtSummaryBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  debtSummaryBadgeText: { fontSize: 9, letterSpacing: 0.6 },
  debtSummaryLabel: { fontSize: 12, opacity: 0.78 },
  debtSummaryValue: { fontSize: 30, letterSpacing: -1 },
  debtSummaryFooter: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginTop: 6 },
  debtSummaryMeta: { flexShrink: 1, fontSize: 11, opacity: 0.76 },
  debtListHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  debtListHeading: { flex: 1, gap: 3 },
  debtListTitle: { fontSize: 18 },
  debtListSubtitle: { fontSize: 12 },
  debtList: { gap: 10 },
  debtItem: { borderWidth: 1, padding: 16, gap: 13 },
  debtItemTop: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  debtItemIcon: { width: 42, height: 42, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  debtItemCopy: { flex: 1, minWidth: 0, alignItems: 'flex-start', gap: 5 },
  debtItemName: { fontSize: 15 },
  debtStatusChip: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  debtStatusText: { fontSize: 9, letterSpacing: 0.2 },
  debtAmountRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  debtAmountLabel: { fontSize: 10, marginBottom: 4 },
  debtItemAmount: { fontSize: 20, letterSpacing: -0.5 },
  debtPaidCopy: { alignItems: 'flex-end' },
  debtPaidAmount: { fontSize: 13 },
  debtItemFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  debtFooterCopy: { flex: 1, minWidth: 0, gap: 3 },
  debtFooterStrong: { fontSize: 12 },
  debtFooterMuted: { fontSize: 11 },
  emptyDebt: { padding: 20, alignItems: 'center', gap: 8 },
  emptyDebtIcon: { width: 48, height: 48, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  emptyDebtCopy: { fontSize: 12, lineHeight: 18, textAlign: 'center', marginBottom: 6 },
  goalList: { gap: 10 },
  goalItem: { borderWidth: 1, padding: 16, gap: 12 },
  goalHeading: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 12 },
  goalCopy: { flex: 1, minWidth: 0, gap: 4 },
  goalAmounts: { flexDirection: 'row', alignItems: 'baseline', gap: 5 },
  goalFooter: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  emptyGoal: { padding: 18, gap: 6 },
  debtContentWrap: { flex: 1, justifyContent: 'center' },
  stackedCarouselContainer: {
    flex: 1,
    width: '100%',
    position: 'relative',
    justifyContent: 'center',
    marginTop: 6,
  },
  reactBitsCard: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    borderRadius: 18,
    padding: 12,
    justifyContent: 'space-between'
  },
  deckWrap: { flex: 1, justifyContent: 'space-between' },
  savingsMetaWrap: { gap: 4, marginTop: 4 },
  savingsPlanRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  savingsMetaText: { fontSize: 10, fontWeight: '700' },
  deckTitle: { fontSize: 14, fontWeight: '800' },
  deckValue: { fontSize: 11, fontWeight: '700' },
  deckTrack: { height: 5, borderRadius: 999, overflow: 'hidden' },
  deckFill: { height: '100%', borderRadius: 999 },
  dots: { flexDirection: 'row', gap: 5, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  dot: { height: 5, borderRadius: 3 },
  debtText: { fontSize: 12, lineHeight: 17 },
  debtName: { fontSize: 13, fontWeight: '800' },
  debtAmount: { fontSize: 14, fontWeight: '900', letterSpacing: -0.2 },
  debtMeta: { fontSize: 11, fontWeight: '700' },
  miniTrack: { height: 4, borderRadius: 4, overflow: 'hidden', marginTop: 4 },
  miniFill: { height: 4, borderRadius: 4 },
  tenorRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  tenorLabel: { fontSize: 13, fontWeight: '700' },
  tenorInputWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1, justifyContent: 'flex-end' },
  tenorInput: { height: 40, width: 64, borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, fontSize: 14, textAlign: 'center' },
  tenorSuffix: { fontSize: 12, fontWeight: '700' },
  track: { height: 8, borderRadius: 999, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 999 },
  inlineRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  inlineActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  inlineLabel: { fontSize: 13, fontWeight: '600' },
  inlineValue: { fontSize: 13, fontWeight: '800' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  chipText: { fontSize: 12, fontWeight: '700' },
  categorySettings: { gap: 16 },
  categorySummary: { padding: 20, gap: 8 },
  categorySummaryTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 },
  categorySummaryCount: { fontSize: 10, letterSpacing: 0.5 },
  categorySummaryStats: { flexDirection: 'row', gap: 32, marginTop: 4 },
  categorySummaryValue: { fontSize: 24 },
  categorySummaryMeta: { fontSize: 11, opacity: 0.75 },
  categoryItem: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderWidth: 1 },
  categoryTypeBadge: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4, marginTop: 5 },
  categoryTypeText: { fontSize: 9, letterSpacing: 0.3 },
  emptyCategory: { padding: 20, alignItems: 'center', gap: 8 },
  categoryTypeOptions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  categoryTypeOption: { flex: 1, minHeight: 44, borderWidth: 1, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  confirmBackdrop: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, backgroundColor: 'rgba(7, 32, 31, 0.46)' },
  confirmCard: { alignItems: 'center', padding: 22 },
  deleteIcon: { width: 52, height: 52, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  confirmTitle: { fontSize: 20, textAlign: 'center' },
  confirmMessage: { fontSize: 13, lineHeight: 20, textAlign: 'center', marginTop: 8 },
  confirmError: { fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 10 },
  confirmActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  confirmButton: { flex: 1 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(7, 32, 31, 0.46)' },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    gap: 12,
    maxHeight: '85%',
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 4,
  },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  sheetTitle: { fontSize: 20, fontWeight: '800' },
  sheetScrollContent: { gap: 14, paddingBottom: 12 },
  formFieldsGap: { gap: 14 },
  fieldBlock: { gap: 6 },
  fieldLabelText: { fontSize: 11, letterSpacing: 0.5 },
  inputWithIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 14,
    gap: 10,
  },
  flexInput: { flex: 1, height: '100%', fontSize: 15, fontWeight: '500' },
  inputHelperText: { fontSize: 12, marginTop: 2, paddingLeft: 4 },
  accountKindGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  accountKindButton: { width: '48%', minHeight: 42, borderWidth: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
  accountKindText: { fontSize: 12, textAlign: 'center' },
  defaultToggle: { minHeight: 48, borderWidth: 1, borderRadius: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  tenorTwoColRow: { flexDirection: 'row', gap: 10 },
  tenorColCard: { flex: 1, borderWidth: 1, borderRadius: 16, padding: 12, gap: 4 },
  tenorColLabel: { fontSize: 12 },
  tenorColInputWrap: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tenorColInput: { flex: 1, fontSize: 16, fontWeight: '700', padding: 0 },
  tenorColSuffix: { fontSize: 12, fontWeight: '600' },
  summaryCard: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 6, marginTop: 4 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 12 },
  summaryValue: { fontSize: 13 },
  input: { height: 52, borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, fontSize: 15 },
  dateButton: { height: 52, borderWidth: 1, borderRadius: 16, paddingHorizontal: 16, justifyContent: 'center' },
  dateButtonContent: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  dateButtonLabel: { fontSize: 15, fontWeight: '600' },
  save: { height: 50, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  savingContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
