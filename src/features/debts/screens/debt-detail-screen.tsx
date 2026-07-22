import React from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  useColorScheme,
  ScrollView,
} from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { ArrowLeft2, More2, Calendar, DollarCircle } from 'iconsax-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { getTheme } from '@/core/theme/colors';
import { formatCurrency } from '@/core/utils/formatters';
import type { DebtWithComputed } from '@/types/debt';

interface PaymentHistory {
  id: string;
  amount: number;
  account_name: string;
  notes?: string;
  occurred_at: string;
}

interface DebtDetailScreenProps {
  debt: DebtWithComputed;
  payments?: PaymentHistory[];
  onBack: () => void;
  onPayPress: () => void;
  onMenuPress: () => void;
}

export function DebtDetailScreen({ debt, payments = [], onBack, onPayPress, onMenuPress }: DebtDetailScreenProps) {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);
  const isDark = colorScheme === 'dark';

  const isOverdue = debt.is_overdue;
  const isPaid = debt.status === 'paid';

  const getProgressColor = () => {
    if (isPaid) return theme.income;
    if (debt.progress_percent > 70) return theme.income;
    if (debt.progress_percent > 30) return '#F59E0B';
    return theme.expense;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(350)} style={styles.header}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ArrowLeft2 color={theme.textPrimary} size={24} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Detail Utang</Text>
        <TouchableOpacity onPress={onMenuPress} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <More2 color={theme.textPrimary} size={24} />
        </TouchableOpacity>
      </Animated.View>

      {/* Debt Card */}
      <Animated.View entering={FadeInDown.delay(60).duration(400)}>
        <View style={[styles.debtCard, { backgroundColor: isDark ? theme.surfaceMuted : '#FFFFFF', borderColor: isDark ? theme.border : '#E2E8F0' }]}>
          
          {/* Debt Name */}
          <Text style={[styles.debtName, { color: theme.textPrimary }]}>{debt.name}</Text>

          {/* Status Badge */}
          {isPaid ? (
            <View style={[styles.statusBadge, { backgroundColor: theme.income + '18' }]}>
              <Text style={[styles.statusBadgeText, { color: theme.income }]}>✓ LUNAS</Text>
            </View>
          ) : isOverdue ? (
            <View style={[styles.statusBadge, { backgroundColor: theme.expense + '18' }]}>
              <Text style={[styles.statusBadgeText, { color: theme.expense }]}>⚠ TERLAMBAT</Text>
            </View>
          ) : null}

          {/* Amounts */}
          <View style={styles.amountsGrid}>
            <View style={styles.amountBlock}>
              <Text style={[styles.amountLabel, { color: theme.textMuted }]}>Total Utang</Text>
              <Text style={[styles.amountValue, { color: theme.textPrimary }]}>
                {formatCurrency(debt.total_amount)}
              </Text>
            </View>
            <View style={styles.amountBlock}>
              <Text style={[styles.amountLabel, { color: theme.textMuted }]}>Sudah Dibayar</Text>
              <Text style={[styles.amountValue, { color: theme.income }]}>
                {formatCurrency(debt.paid_amount)}
              </Text>
            </View>
            <View style={styles.amountBlock}>
              <Text style={[styles.amountLabel, { color: theme.textMuted }]}>Sisa Utang</Text>
              <Text style={[styles.amountValue, { color: theme.expense }]}>
                {formatCurrency(debt.remaining_amount)}
              </Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressWrap}>
            <View style={[styles.progressTrack, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9' }]}>
              <View 
                style={[
                  styles.progressFill, 
                  { 
                    width: `${debt.progress_percent}%`,
                    backgroundColor: getProgressColor()
                  }
                ]} 
              />
            </View>
            <Text style={[styles.progressText, { color: theme.textMuted }]}>
              {debt.progress_percent}% terbayar
            </Text>
          </View>

          {/* Due Date */}
          <View style={[styles.dueDateCard, { backgroundColor: isDark ? '#0A2E2D' : '#F8FAFC' }]}>
            <View style={styles.dueDateRow}>
              <Calendar color={isOverdue ? theme.expense : theme.textSecondary} size={18} variant="Bold" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.dueDateLabel, { color: theme.textMuted }]}>Jatuh Tempo</Text>
                <Text style={[styles.dueDateValue, { color: isOverdue ? theme.expense : theme.textPrimary }]}>
                  {formatDate(debt.due_date)}
                </Text>
              </View>
              <Text style={[styles.dueDateDays, { color: isOverdue ? theme.expense : theme.textMuted }]}>
                {isOverdue 
                  ? `Terlambat ${Math.abs(debt.days_until_due)} hari` 
                  : isPaid 
                  ? 'Lunas'
                  : `${debt.days_until_due} hari lagi`
                }
              </Text>
            </View>
          </View>

          {/* Notes */}
          {debt.notes && (
            <View style={styles.notesBlock}>
              <Text style={[styles.notesLabel, { color: theme.textMuted }]}>Catatan</Text>
              <Text style={[styles.notesText, { color: theme.textPrimary }]}>
                {debt.notes}
              </Text>
            </View>
          )}
        </View>
      </Animated.View>

      {/* Payment History */}
      <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Riwayat Pembayaran</Text>

        {payments.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: isDark ? theme.surfaceMuted : '#F8FAFC' }]}>
            <DollarCircle color={theme.textMuted} size={32} variant="Linear" />
            <Text style={[styles.emptyText, { color: theme.textMuted }]}>
              Belum ada riwayat pembayaran
            </Text>
          </View>
        ) : (
          <View style={styles.historyList}>
            {payments.map((payment, i) => (
              <Animated.View 
                key={payment.id} 
                entering={FadeInDown.delay(140 + i * 60).duration(350)}
                style={[styles.historyItem, { backgroundColor: isDark ? theme.surfaceMuted : '#FFFFFF', borderColor: isDark ? theme.border : '#E2E8F0' }]}
              >
                <View style={styles.historyHeader}>
                  <View style={[styles.historyIconWrap, { backgroundColor: theme.income + '18' }]}>
                    <DollarCircle color={theme.income} size={18} variant="Bold" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.historyAmount, { color: theme.income }]}>
                      {formatCurrency(payment.amount)}
                    </Text>
                    <Text style={[styles.historyAccount, { color: theme.textMuted }]}>
                      dari {payment.account_name}
                    </Text>
                  </View>
                  <Text style={[styles.historyDate, { color: theme.textMuted }]}>
                    {formatDate(payment.occurred_at)}
                  </Text>
                </View>
                {payment.notes && (
                  <Text style={[styles.historyNotes, { color: theme.textSecondary }]}>
                    {payment.notes}
                  </Text>
                )}
              </Animated.View>
            ))}
          </View>
        )}
      </Animated.View>

      {/* Pay Button */}
      {!isPaid && (
        <Animated.View entering={FadeInDown.delay(180).duration(400)} style={styles.footer}>
          <Button
            title="Bayar Cicilan"
            variant="primary"
            onPress={onPayPress}
          />
        </Animated.View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 120,
    gap: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  debtCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    gap: 16,
  },
  debtName: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  amountsGrid: {
    gap: 12,
  },
  amountBlock: {
    gap: 4,
  },
  amountLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  amountValue: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  progressWrap: {
    gap: 8,
  },
  progressTrack: {
    height: 10,
    borderRadius: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: 10,
    borderRadius: 10,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
  },
  dueDateCard: {
    borderRadius: 16,
    padding: 14,
  },
  dueDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dueDateLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 2,
  },
  dueDateValue: {
    fontSize: 15,
    fontWeight: '800',
  },
  dueDateDays: {
    fontSize: 12,
    fontWeight: '700',
  },
  notesBlock: {
    gap: 6,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  notesText: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  emptyCard: {
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 13,
    fontWeight: '600',
  },
  historyList: {
    gap: 10,
  },
  historyItem: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  historyIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyAmount: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  historyAccount: {
    fontSize: 11,
    fontWeight: '600',
  },
  historyDate: {
    fontSize: 11,
    fontWeight: '600',
  },
  historyNotes: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 48,
  },
  footer: {
    marginTop: 8,
  },
});
