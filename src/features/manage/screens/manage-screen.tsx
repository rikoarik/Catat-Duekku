import { Text } from '@/components/ui/text';
import { useMemo, useState } from 'react';
import {
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import Animated, { FadeInDown, FadeOutUp, LinearTransition } from 'react-native-reanimated';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { CustomDatePickerModal } from '@/components/ui/custom-date-picker-modal';
import {
  Add,
  ArrowDown2,
  Bank,
  Calendar,
  CardReceive,
  Category2,
  Chart,
  CloseCircle,
  Clock,
  DocumentText,
  DollarCircle,
  Receipt2,
  WalletAdd,
} from 'iconsax-react-native';
import { getTheme } from '@/core/theme/colors';
import { financeStore } from '@/core/lib/finance-store';
import { buildInstallmentPlan, summarizeInstallmentDue } from '@/core/lib/installment';
import { currentYearMonth, dueLabel, formatLongDate, monthProgress, monthlyNeeded, parseIsoDate, toIsoDate, todayIso, daysUntil } from '@/core/lib/dates';
import { formatCurrency } from '@/core/utils/formatters';
import type { InstallmentPlan } from '@/types/debt';

type FormKind = 'account' | 'budget' | 'savings' | 'debt' | 'category';
export type ManageSection = 'accounts' | 'budget' | 'savings' | 'debts' | 'categories';

interface ManageScreenProps {
  onOpen?: (section: ManageSection) => void;
}

interface AccountItem {
  name: string;
  balance: string;
}

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
  paidAmount: number;
  installmentPlan?: InstallmentPlan;
}

const INITIAL_ACCOUNTS: AccountItem[] = [
  { name: 'Cash', balance: 'Rp1.150.000' },
  { name: 'Bank', balance: 'Rp11.700.000' },
  { name: 'E-Wallet', balance: 'Rp1.850.000' },
];

const INITIAL_CATEGORIES = ['Makan', 'Transport', 'Belanja', 'Tagihan'];
const INITIAL_DEBTS: DebtItem[] = [];

const FORM_COPY: Record<FormKind, { title: string; placeholder: string; buttonText: string }> = {
  account: { title: 'Tambah Akun Pembayaran', placeholder: 'Contoh: Bank BCA / E-Wallet', buttonText: 'Simpan Akun' },
  budget: { title: 'Atur Limit Budget Bulan Ini', placeholder: 'Contoh: 5000000', buttonText: 'Simpan Limit Budget' },
  savings: { title: 'Buat Target Tabungan Baru', placeholder: 'Contoh: Beli Laptop Baru', buttonText: 'Simpan Target Tabungan' },
  debt: { title: 'Catat Utang / Cicilan Baru', placeholder: 'Contoh: Cicilan Motor / Kredivo', buttonText: 'Simpan Data Utang' },
  category: { title: 'Tambah Kategori Transaksi', placeholder: 'Contoh: Kesehatan', buttonText: 'Simpan Kategori' },
};

const SAVINGS_CARD_WIDTH = 148;
const SAVINGS_CARD_GAP = 10;

export function ManageScreen({ onOpen: _onOpen }: ManageScreenProps) {
  const theme = getTheme(useColorScheme());
  const [form, setForm] = useState<FormKind | null>(null);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [savingsIndex, setSavingsIndex] = useState(0);
  const [value, setValue] = useState('');
  const [accountName, setAccountName] = useState('');
  const [savingsName, setSavingsName] = useState('');
  const [savingsTargetAmount, setSavingsTargetAmount] = useState('');
  const [savingsTargetDate, setSavingsTargetDate] = useState('');
  const [debtName, setDebtName] = useState('');
  const [debtAmount, setDebtAmount] = useState('');
  const [debtPaidMonths, setDebtPaidMonths] = useState('0');
  const [debtStartDate, setDebtStartDate] = useState(todayIso());
  const [datePickerTarget, setDatePickerTarget] = useState<'savings' | 'debt' | null>(null);
  const [accounts, setAccounts] = useState(INITIAL_ACCOUNTS);
  const [categories, setCategories] = useState(INITIAL_CATEGORIES);
  const [budgetLimit, setBudgetLimit] = useState(5_000_000);
  const [budgetUsed] = useState(3_450_000);
  const [debts, setDebts] = useState<DebtItem[]>(INITIAL_DEBTS);
  const [debtTenor, setDebtTenor] = useState('12');
  const [goalsVersion, setGoalsVersion] = useState(0);

  const goals = useMemo(() => financeStore.getGoals(), [goalsVersion]);
  const savingsItems: SavingsItem[] = goals.length
    ? goals
    : [{ id: 'empty', name: 'Tambah target', targetAmount: 0, savedAmount: 0 }];
  const budgetRemaining = Math.max(budgetLimit - budgetUsed, 0);
  const budgetPercent = budgetLimit > 0 ? Math.min(Math.round((budgetUsed / budgetLimit) * 100), 100) : 0;
  const monthMeta = monthProgress(currentYearMonth());
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

  const openDatePicker = (target: 'savings' | 'debt') => {
    setDatePickerTarget(target);
  };

  const handleConfirmDate = (iso: string) => {
    if (datePickerTarget === 'savings') setSavingsTargetDate(iso);
    if (datePickerTarget === 'debt') setDebtStartDate(iso);
    setDatePickerTarget(null);
  };

  const openForm = (kind: FormKind) => {
    setValue('');
    setAccountName('');
    setSavingsName('');
    setSavingsTargetAmount('');
    setSavingsTargetDate('');
    setDebtName('');
    setDebtAmount('');
    setDebtPaidMonths('0');
    setDebtStartDate(todayIso());
    setDebtTenor('12');
    setForm(kind);
  };

  const closeForm = () => setForm(null);

  const saveForm = () => {
    if (!form) return;

    if (form === 'account') {
      const nextName = accountName.trim();
      if (!nextName) return;
      setAccounts((items) => [...items, { name: nextName, balance: 'Rp0' }]);
      closeForm();
      return;
    }

    if (form === 'budget') {
      const next = value.trim();
      if (!next) return;
      setBudgetLimit(Number(next.replace(/\D/g, '') || 0));
      closeForm();
      return;
    }

    if (form === 'savings') {
      const nextName = savingsName.trim();
      const amount = Number(savingsTargetAmount.replace(/\D/g, '') || 0);
      if (!nextName || amount <= 0) return;
      financeStore.createGoal({
        name: nextName,
        targetAmount: amount,
        targetDate: savingsTargetDate.trim() || undefined,
      });
      setSavingsIndex(0);
      setGoalsVersion((current) => current + 1);
      closeForm();
      return;
    }

    if (form === 'debt') {
      const nextName = debtName.trim();
      const total = Number(debtAmount.replace(/\D/g, '') || 0);
      if (!nextName || total <= 0) return;
      const tenorNum = Math.max(1, parseInt(debtTenor.replace(/\D/g, ''), 10) || 12);
      const paidMonths = Math.max(0, Math.min(tenorNum, parseInt(debtPaidMonths.replace(/\D/g, ''), 10) || 0));
      const plan = buildInstallmentPlan({
        totalAmount: total,
        tenorMonths: tenorNum,
        startDate: debtStartDate,
        paidInstallments: paidMonths,
      });
      const paidAmount = Math.min(total, plan.monthly_amount * paidMonths);
      financeStore.createDebt({
        name: nextName,
        totalAmount: total,
        paidAmount,
        dueDate: plan.projected_payoff_date,
      });
      setDebts((items) => [
        ...items,
        {
          id: `debt-${Date.now()}`,
          name: nextName,
          totalAmount: total,
          paidAmount,
          installmentPlan: plan,
        },
      ]);
      closeForm();
      return;
    }

    const next = value.trim();
    if (!next) return;
    if (form === 'category') {
      setCategories((items) => [...items, next]);
    }

    closeForm();
  };

  return (
    <>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View entering={FadeInDown.duration(320)} layout={LinearTransition.springify()} style={styles.header}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>Kelola</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>Widget finansialmu.</Text>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(60).duration(320)} layout={LinearTransition.springify()}>
          <View style={[styles.widget, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <SectionHeader
              icon={Bank}
              title="Akun"
              subtitle={`${accounts.length} akun aktif`}
              theme={theme}
              onAdd={() => openForm('account')}
            />
            <View style={styles.widgetBody}>
              {accounts.map((item) => (
                <InlineRow key={item.name} label={item.name} value={item.balance} theme={theme} />
              ))}
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(110).duration(320)} layout={LinearTransition.springify()}>
          <View style={[styles.widget, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <SectionHeader
              icon={Chart}
              title="Budget bulan ini"
              subtitle={`Hari ke-${monthMeta.day} dari ${monthMeta.days_in_month}`}
              theme={theme}
              onAdd={() => openForm('budget')}
            />
            <View style={styles.widgetBody}>
              <View style={[styles.track, { backgroundColor: theme.surfaceMuted }] }>
                <View style={[styles.fill, { width: `${budgetPercent}%`, backgroundColor: theme.accent }]} />
              </View>
              <InlineRow label="Terpakai" value={`Rp${budgetUsed.toLocaleString('id-ID')}`} theme={theme} />
              <InlineRow label="Sisa" value={`Rp${budgetRemaining.toLocaleString('id-ID')}`} theme={theme} />
              <InlineRow label="Pace bulan ini" value={`${budgetPercent}% · ${monthMeta.days_left} hari lagi`} theme={theme} />
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(160).duration(320)} layout={LinearTransition.springify()} style={styles.duoRow}>
          <View style={[styles.duoCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <SectionHeader
              compact
              hideIcon
              icon={WalletAdd}
              title="Tabungan"
              subtitle={goals.length === 0 ? 'Belum ada' : `${savingsIndex + 1}/${savingsItems.length} target`}
              theme={theme}
              onAdd={() => openForm('savings')}
            />
            <SavingsDeck
              activeIndex={savingsIndex}
              items={savingsItems}
              onIndexChange={setSavingsIndex}
              onEmptyPress={() => openForm('savings')}
              theme={theme}
            />
            <View style={styles.savingsMetaWrap}>
              <Text style={[styles.savingsMetaText, { color: theme.textMuted }]} numberOfLines={1}>
                {activeGoal?.targetAmount ? `Target ${activeGoalLabel}` : 'Belum ada target aktif'}
              </Text>
              {activeGoalMonthlyNeeded > 0 ? (
                <Text style={[styles.savingsMetaText, { color: theme.textMuted }]} numberOfLines={1}>
                  Ideal Rp{activeGoalMonthlyNeeded.toLocaleString('id-ID')} / bulan
                </Text>
              ) : null}
            </View>
          </View>

          <View style={[styles.duoCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <SectionHeader
              compact
              hideIcon
              icon={CardReceive}
              title="Utang"
              subtitle={debts.length === 0 ? 'Opsional' : `${debts.length} aktif`}
              theme={theme}
              onAdd={() => openForm('debt')}
            />
            <View style={styles.debtContentWrap}>
              {debts.length === 0 ? (
                <Text style={[styles.debtText, { color: theme.textMuted }]} numberOfLines={2}>
                  Tambah cicilan atau pinjaman, hitung otomatis per bulan.
                </Text>
              ) : (
                <View style={{ gap: 6 }}>
                  {debts.slice(0, 1).map((item) => {
                    const plan = item.installmentPlan;
                    const remaining = item.totalAmount - item.paidAmount;
                    const due = summarizeInstallmentDue(plan);
                    const dueTone = due?.status === 'overdue'
                      ? theme.expense
                      : due?.status === 'due_soon'
                        ? theme.accentText
                        : theme.textMuted;
                    return (
                      <View key={item.id}>
                        <Text style={[styles.debtName, { color: theme.textPrimary }]} numberOfLines={1}>
                          {item.name}
                        </Text>
                        <Text style={[styles.debtAmount, { color: theme.expense }]}>
                          Sisa Rp{remaining.toLocaleString('id-ID')}
                        </Text>
                        {plan ? (
                          <>
                            <Text style={[styles.debtMeta, { color: theme.textMuted }]} numberOfLines={1}>
                              Rp{plan.monthly_amount.toLocaleString('id-ID')} / bulan
                            </Text>
                            <View style={[styles.miniTrack, { backgroundColor: theme.surfaceMuted }]}>
                              <View
                                style={[
                                  styles.miniFill,
                                  {
                                    width: `${Math.min(100, Math.round((plan.paid_installments / plan.tenor_months) * 100))}%`,
                                    backgroundColor: theme.deepTeal,
                                  },
                                ]}
                              />
                            </View>
                            <Text style={[styles.debtMeta, { color: dueTone }]} numberOfLines={1}>
                              {plan.paid_installments}/{plan.tenor_months} bulan · jatuh tempo {due?.due_label ?? '-'}
                            </Text>
                          </>
                        ) : null}
                      </View>
                    );
                  })}
                  {debts.length > 1 ? (
                    <Text style={[styles.debtMeta, { color: theme.textMuted }]}>+{debts.length - 1} lainnya</Text>
                  ) : null}
                </View>
              )}
            </View>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(260).duration(320)}>
          <View style={[styles.widget, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <TouchableOpacity
              activeOpacity={0.86}
              onPress={() => setCategoriesOpen((current) => !current)}
              style={styles.categoryHeaderClickable}
            >
              <View style={[styles.iconBox, { backgroundColor: theme.surfaceElement }]}>
                <Category2 color={theme.deepTeal} size={21} variant="Bold" />
              </View>
              <View style={styles.copy}>
                <Text style={[styles.widgetTitle, { color: theme.textPrimary }]} numberOfLines={1}>
                  Kategori
                </Text>
                <Text style={[styles.widgetSubtitle, { color: theme.textMuted }]} numberOfLines={1}>
                  {`${categories.length} kategori transaksi`}
                </Text>
              </View>
              <ArrowDown2
                color={theme.textMuted}
                size={17}
                style={{ transform: [{ rotate: categoriesOpen ? '180deg' : '0deg' }] }}
              />
            </TouchableOpacity>

            {categoriesOpen && (
              <Animated.View 
                entering={FadeInDown.duration(180)} 
                exiting={FadeOutUp.duration(100)}
                style={styles.categoryBody}
              >
                <View style={styles.categoryRowContainer}>
                  <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoryScrollContent}
                    style={styles.categoryScrollView}
                  >
                    {categories.map((category) => (
                      <View key={category} style={[styles.chip, { backgroundColor: theme.surfaceElement }]}>
                        <Text style={[styles.chipText, { color: theme.textPrimary }]}>{category}</Text>
                      </View>
                    ))}
                  </ScrollView>
                  <TouchableOpacity 
                    onPress={() => openForm('category')} 
                    style={[styles.addChipBtn, { borderColor: theme.deepTeal }]}
                  >
                    <Add color={theme.deepTeal} size={15} variant="Bold" />
                    <Text style={[styles.addChipText, { color: theme.deepTeal }]}>Tambah</Text>
                  </TouchableOpacity>
                </View>
              </Animated.View>
            )}
          </View>
        </Animated.View>
      </ScrollView>

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
                {form ? FORM_COPY[form].title : ''}
              </Text>
              <TouchableOpacity onPress={closeForm} accessibilityLabel="Tutup" hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <CloseCircle color={theme.textMuted} size={24} variant="Outline" />
              </TouchableOpacity>
            </View>

            <KeyboardAwareScrollView
              enableOnAndroid
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

                  {/* Live Estimation Card for Savings */}
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
                        placeholder={form ? FORM_COPY[form].placeholder : ''}
                        placeholderTextColor={theme.textMuted}
                        style={[styles.flexInput, { color: theme.textPrimary }]}
                      />
                    </View>
                    {form === 'budget' && Number(value.replace(/\D/g, '')) > 0 ? (
                      <Text style={[styles.inputHelperText, { color: theme.accentText }]} weight="semibold">
                        = {formatCurrency(Number(value.replace(/\D/g, '')))}
                      </Text>
                    ) : null}
                  </View>
                </View>
              )}

              <TouchableOpacity
                onPress={saveForm}
                disabled={form === 'debt' ? (!debtName.trim() || !debtAmount.trim()) : form === 'savings' ? (!savingsName.trim() || !savingsTargetAmount.trim()) : form === 'account' ? !accountName.trim() : !value.trim()}
                style={[
                  styles.save,
                  {
                    backgroundColor: (form === 'debt' ? (debtName.trim() && debtAmount.trim()) : form === 'savings' ? (savingsName.trim() && savingsTargetAmount.trim()) : form === 'account' ? accountName.trim() : value.trim()) ? theme.deepTeal : theme.surfaceMuted,
                    marginTop: 16,
                  },
                ]}
              >
                <Text style={{ color: (form === 'debt' ? (debtName.trim() && debtAmount.trim()) : form === 'savings' ? (savingsName.trim() && savingsTargetAmount.trim()) : form === 'account' ? accountName.trim() : value.trim()) ? theme.onPrimary : theme.textMuted, fontWeight: '800' }}>
                  {form ? FORM_COPY[form].buttonText : 'Simpan'}
                </Text>
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
  subtitle,
  theme,
  title,
  trailing,
}: {
  compact?: boolean;
  hideIcon?: boolean;
  icon: React.ComponentType<any>;
  onAdd: () => void;
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
        <TouchableOpacity
          onPress={onAdd}
          style={[styles.inlineAdd, compact && styles.compactInlineAdd, { backgroundColor: theme.surfaceElement }]}
          accessibilityLabel={`Tambah ${title}`}
        >
          <Add color={theme.deepTeal} size={compact ? 14 : 16} variant="Bold" />
        </TouchableOpacity>
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
  theme,
}: {
  activeIndex: number;
  items: SavingsItem[];
  onEmptyPress: () => void;
  onIndexChange: (index: number) => void;
  theme: ReturnType<typeof getTheme>;
}) {
  const handleNext = () => {
    onIndexChange((activeIndex + 1) % items.length);
  };

  return (
    <View style={styles.deckWrap}>
      <TouchableOpacity
        activeOpacity={0.92}
        onPress={items.length > 1 ? handleNext : (items[0]?.id === 'empty' ? onEmptyPress : undefined)}
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
}: {
  label: string;
  theme: ReturnType<typeof getTheme>;
  value: string;
}) {
  return (
    <View style={styles.inlineRow}>
      <Text style={[styles.inlineLabel, { color: theme.textMuted }]}>{label}</Text>
      <Text style={[styles.inlineValue, { color: theme.textPrimary }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 110, gap: 12 },
  header: { gap: 6, marginBottom: 8 },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.8 },
  subtitle: { fontSize: 14, lineHeight: 20 },
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
  accountRowBlock: { gap: 6 },
  accountDueChip: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  accountDueChipText: { fontSize: 11, fontWeight: '800' },
  duoRow: { flexDirection: 'row', gap: 12 },
  duoCard: { flex: 1, aspectRatio: 1, borderWidth: 1, borderRadius: 26, padding: 14, justifyContent: 'space-between' },
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
  savingsMetaWrap: { gap: 2, marginTop: 4 },
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
  inlineLabel: { fontSize: 13, fontWeight: '600' },
  inlineValue: { fontSize: 13, fontWeight: '800' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7 },
  chipText: { fontSize: 12, fontWeight: '700' },
  categoryScrollContent: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  categoryRowContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  categoryScrollView: {
    flex: 1,
  },
  categoryHeaderClickable: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  categoryBody: { paddingTop: 6, overflow: 'hidden' },
  addChipBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 4,
  },
  addChipText: { fontSize: 12, fontWeight: '700' },
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
});
