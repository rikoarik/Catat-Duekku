import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Add, Clock, TickCircle, WalletMinus } from 'iconsax-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { getTheme } from '@/core/theme/colors';
import { formatCurrency } from '@/core/utils/formatters';
import type { DebtWithComputed } from '@/types/debt';
import { DebtCard } from '../components/debt-card';
import { CreateDebtForm } from './create-debt-screen';
import { DebtDetailScreen } from './debt-detail-screen';
import { DebtPaymentModal } from '../components/debt-payment-modal';

// Mock data
const MOCK_DEBTS: DebtWithComputed[] = [
  {
    id: '1',
    user_id: 'user-1',
    name: 'Pinjaman Bank BCA',
    due_date: '2026-08-30',
    total_amount: 10000000,
    paid_amount: 5000000,
    status: 'active',
    notes: 'KPR rumah, cicilan 12 bulan',
    created_at: '2026-01-01',
    updated_at: '2026-07-21',
    remaining_amount: 5000000,
    progress_percent: 50,
    days_until_due: 40,
    is_overdue: false,
  },
  {
    id: '2',
    user_id: 'user-1',
    name: 'Utang ke Teman',
    due_date: '2026-08-15',
    total_amount: 3000000,
    paid_amount: 2500000,
    status: 'active',
    notes: 'Pinjaman darurat',
    created_at: '2026-06-01',
    updated_at: '2026-07-21',
    remaining_amount: 500000,
    progress_percent: 83,
    days_until_due: 25,
    is_overdue: false,
  },
  {
    id: '3',
    user_id: 'user-1',
    name: 'Cicilan Motor',
    due_date: '2026-09-10',
    total_amount: 8000000,
    paid_amount: 2000000,
    status: 'active',
    notes: 'Leasing Honda Beat',
    created_at: '2026-03-01',
    updated_at: '2026-07-21',
    remaining_amount: 6000000,
    progress_percent: 25,
    days_until_due: 51,
    is_overdue: false,
  },
];

const toComputedDebt = (debt: Omit<DebtWithComputed, 'remaining_amount' | 'progress_percent' | 'days_until_due' | 'is_overdue'>): DebtWithComputed => {
  const remaining_amount = Math.max(debt.total_amount - debt.paid_amount, 0);
  const progress_percent = debt.total_amount > 0
    ? Math.min(Math.round((debt.paid_amount / debt.total_amount) * 100), 100)
    : 0;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dueDate = new Date(debt.due_date);
  dueDate.setHours(0, 0, 0, 0);
  const days_until_due = Math.ceil((dueDate.getTime() - today.getTime()) / 86400000);

  return {
    ...debt,
    remaining_amount,
    progress_percent,
    days_until_due,
    is_overdue: days_until_due < 0 && remaining_amount > 0,
  };
};

export function DebtsScreen() {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);
  const isDark = colorScheme === 'dark';

  const [filter, setFilter] = useState<'all' | 'active' | 'paid'>('active');
  const [debts, setDebts] = useState<DebtWithComputed[]>(MOCK_DEBTS);
  const [screen, setScreen] = useState<'list' | 'create' | 'detail'>('list');
  const [selectedDebtId, setSelectedDebtId] = useState<string | null>(null);
  const [payingDebt, setPayingDebt] = useState<DebtWithComputed | null>(null);
  const [payments, setPayments] = useState<Record<string, Array<{ id: string; amount: number; account_name: string; notes?: string; occurred_at: string }>>>({});

  const selectedDebt = debts.find((debt) => debt.id === selectedDebtId) ?? null;

  // Calculate summary
  const activeDebts = debts.filter(d => d.status === 'active');
  const totalRemaining = activeDebts.reduce((sum, d) => sum + d.remaining_amount, 0);
  const totalPaid = activeDebts.reduce((sum, d) => sum + d.paid_amount, 0);
  const totalAmount = activeDebts.reduce((sum, d) => sum + d.total_amount, 0);
  const overallProgress = totalAmount > 0 ? Math.round((totalPaid / totalAmount) * 100) : 0;

  // Filter debts
  const filteredDebts = debts.filter(debt => {
    if (filter === 'all') return true;
    return debt.status === filter;
  });

  const openDetail = (debt: DebtWithComputed) => {
    setSelectedDebtId(debt.id);
    setScreen('detail');
  };

  const handleCreateDebt = (debt: {
    name: string;
    total_amount: number;
    due_date: string;
    notes: string;
  }) => {
    const now = new Date().toISOString();
    setDebts((current) => [
      toComputedDebt({
        id: `debt-${now}`,
        user_id: 'user-1',
        status: 'active',
        paid_amount: 0,
        created_at: now,
        updated_at: now,
        ...debt,
      }),
      ...current,
    ]);
    setFilter('active');
    setScreen('list');
  };

  const handlePayDebt = (debtId: string, amount: number, accountId: string, notes: string) => {
    if (amount <= 0) return;
    setDebts((current) => current.map((debt) => {
      if (debt.id !== debtId) return debt;
      const paid_amount = Math.min(debt.paid_amount + amount, debt.total_amount);
      const status = paid_amount >= debt.total_amount ? 'paid' : 'active';
      return toComputedDebt({ ...debt, paid_amount, status, updated_at: new Date().toISOString() });
    }));

    setPayments((current) => {
      const accountName = `Akun ${accountId}`;
      const entry = {
        id: `pay-${debtId}-${Date.now()}`,
        amount,
        account_name: accountName,
        notes: notes.trim() || undefined,
        occurred_at: new Date().toISOString(),
      };
      return {
        ...current,
        [debtId]: [entry, ...(current[debtId] ?? [])],
      };
    });
  };

  if (screen === 'create') {
    return <CreateDebtForm onBack={() => setScreen('list')} onSubmit={handleCreateDebt} />;
  }

  if (screen === 'detail' && selectedDebt) {
    return (
      <>
        <DebtDetailScreen
          debt={selectedDebt}
          payments={payments[selectedDebt.id] ?? []}
          onBack={() => setScreen('list')}
          onMenuPress={() => {}}
          onPayPress={() => setPayingDebt(selectedDebt)}
        />
        <DebtPaymentModal
          visible={!!payingDebt}
          debt={payingDebt}
          onClose={() => setPayingDebt(null)}
          onConfirm={handlePayDebt}
        />
      </>
    );
  }

  return (
    <KeyboardAwareScrollView
      enableOnAndroid
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {/* ── Header ── */}
      <Animated.View entering={FadeInDown.duration(350)} style={styles.headerRow}>
        <View>
          <Text style={[styles.screenTitle, { color: theme.textPrimary }]}>Utang</Text>
          <Text style={[styles.screenSubtitle, { color: theme.textMuted }]}>
            Pantau sisa utang dan jadwal bayarnya
          </Text>
        </View>
        <Button
          title="Tambah utang"
          variant="primary"
          size="small"
          icon={<Add color={theme.onPrimary} size={15} />}
          onPress={() => setScreen('create')}
        />
      </Animated.View>

      {/* ── Summary Card ── */}
      <Animated.View entering={FadeInDown.delay(60).duration(400)}>
        <View style={[styles.summaryCard, { backgroundColor: isDark ? theme.surfaceMuted : '#FFFFFF', borderColor: isDark ? theme.border : '#E2E8F0' }]}>
          <View style={styles.summaryHeader}>
            <View style={[styles.summaryIconWrap, { backgroundColor: isDark ? '#3D1D1D' : '#FDECEC' }]}>
              <Clock color={theme.expense} size={20} variant="Bold" />
            </View>
            <View style={styles.summaryTitleBlock}>
              <Text style={[styles.summaryTitle, { color: theme.textPrimary }]}>Total Sisa Utang</Text>
              <Text style={[styles.summarySubtitle, { color: theme.textMuted }]}>
                Prioritas pembayaran bulan ini
              </Text>
            </View>
          </View>

          <Text style={[styles.summaryAmount, { color: theme.expense }]}>
            {formatCurrency(totalRemaining)}
          </Text>

          {/* Progress Bar */}
          <View style={styles.summaryProgressWrap}>
            <View style={[styles.summaryProgressTrack, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
              <View 
                style={[
                  styles.summaryProgressFill, 
                  { 
                    width: `${overallProgress}%`,
                    backgroundColor: overallProgress > 70 ? theme.income : overallProgress > 30 ? '#F59E0B' : theme.expense
                  }
                ]} 
              />
            </View>
            <Text style={[styles.summaryProgressText, { color: theme.textMuted }]}>
              {overallProgress}% terbayar
            </Text>
          </View>

          {/* Breakdown */}
          <View style={styles.summaryBreakdown}>
            <View style={styles.summaryBreakdownItem}>
              <Text style={[styles.summaryBreakdownLabel, { color: theme.textMuted }]}>Terbayar</Text>
              <Text style={[styles.summaryBreakdownValue, { color: theme.income }]}>
                {formatCurrency(totalPaid)}
              </Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: isDark ? theme.border : '#E2E8F0' }]} />
            <View style={styles.summaryBreakdownItem}>
              <Text style={[styles.summaryBreakdownLabel, { color: theme.textMuted }]}>Total</Text>
              <Text style={[styles.summaryBreakdownValue, { color: theme.textPrimary }]}>
                {formatCurrency(totalAmount)}
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* ── Filter Tabs ── */}
      <Animated.View entering={FadeInDown.delay(100).duration(350)} style={[styles.filterRow, { backgroundColor: isDark ? theme.surfaceMuted : '#F1F5F9' }]}>
        {[
          { id: 'active', label: 'Aktif', icon: Clock },
          { id: 'all', label: 'Semua', icon: null },
          { id: 'paid', label: 'Lunas', icon: TickCircle },
        ].map((tab) => (
          <TouchableOpacity
            key={tab.id}
            activeOpacity={0.7}
            style={[styles.filterTab, filter === tab.id && { backgroundColor: theme.deepTeal }]}
            onPress={() => setFilter(tab.id as any)}
          >
            {tab.icon && (
              <tab.icon 
                color={filter === tab.id ? theme.onPrimary : theme.textMuted} 
                size={14} 
                variant={filter === tab.id ? 'Bold' : 'Linear'}
              />
            )}
            <Text style={[styles.filterTabText, { color: filter === tab.id ? theme.onPrimary : theme.textMuted }]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </Animated.View>

      {/* ── Debt List ── */}
      {filteredDebts.length === 0 ? (
        <Animated.View entering={FadeInDown.delay(140).duration(350)} style={[styles.emptyState, { backgroundColor: isDark ? theme.surfaceMuted : '#FFFFFF', borderColor: isDark ? theme.border : '#E2E8F0' }]}>
          <View style={[styles.emptyIconWrap, { backgroundColor: isDark ? theme.surface : theme.expenseSurface }]}>
            <WalletMinus color={theme.expense} size={26} variant="Bold" />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>
            {filter === 'active' ? 'Tidak ada utang aktif' : filter === 'paid' ? 'Belum ada utang yang lunas' : 'Belum ada utang tercatat'}
          </Text>
          <Text style={[styles.emptyText, { color: theme.textMuted }]}>
            {filter === 'active'
              ? 'Bagus. Kalau nanti ada cicilan atau pinjaman, catat di sini supaya jadwal bayarnya jelas.'
              : 'Catatan utang akan muncul setelah kamu menambahkannya.'}
          </Text>
          {filter !== 'paid' && (
            <Button
              title="Tambah utang"
              variant="secondary"
              size="small"
              onPress={() => setScreen('create')}
            />
          )}
        </Animated.View>
      ) : (
        filteredDebts.map((debt, i) => (
          <DebtCard
            key={debt.id}
            debt={debt}
            index={i}
            isDark={isDark}
            theme={theme}
            onPress={() => openDetail(debt)}
            onPayPress={() => setPayingDebt(debt)}
          />
        ))
      )}
    </KeyboardAwareScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 120,
    gap: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  screenSubtitle: {
    fontSize: 13,
    marginTop: 2,
  },

  // Summary Card
  summaryCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  summaryIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryTitleBlock: {
    flex: 1,
    gap: 2,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  summarySubtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  summaryAmount: {
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: -0.8,
  },
  summaryProgressWrap: {
    gap: 6,
  },
  summaryProgressTrack: {
    height: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  summaryProgressFill: {
    height: 8,
    borderRadius: 8,
  },
  summaryProgressText: {
    fontSize: 11,
    fontWeight: '600',
  },
  summaryBreakdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 4,
  },
  summaryBreakdownItem: {
    flex: 1,
    gap: 3,
  },
  summaryBreakdownLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  summaryBreakdownValue: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  summaryDivider: {
    width: 1,
    height: 32,
  },

  // Filter Tabs
  filterRow: {
    flexDirection: 'row',
    borderRadius: 24,
    padding: 4,
    gap: 4,
  },
  filterTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 20,
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: '700',
  },

  // Empty State
  emptyState: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    gap: 10,
  },
  emptyIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    textAlign: 'center',
  },
  emptyText: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
    textAlign: 'center',
  },
});
