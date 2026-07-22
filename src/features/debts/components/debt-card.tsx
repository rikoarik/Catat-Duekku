import React from 'react';
import {
  StyleSheet,
  View,
  Pressable,
} from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Clock, Warning2 } from 'iconsax-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { DebtWithComputed } from '@/types/debt';
import type { ThemeColors } from '@/core/theme/colors';
import { formatCurrency } from '@/core/utils/formatters';

interface DebtCardProps {
  debt: DebtWithComputed;
  index: number;
  isDark: boolean;
  theme: ThemeColors;
  onPress: () => void;
  onPayPress: () => void;
}

export function DebtCard({ debt, index, isDark, theme, onPress, onPayPress }: DebtCardProps) {
  const isOverdue = debt.is_overdue;
  const isPaid = debt.status === 'paid';
  
  // Progress color based on payment progress
  const getProgressColor = () => {
    if (isPaid) return theme.income;
    if (debt.progress_percent > 70) return theme.income;
    if (debt.progress_percent > 30) return '#F59E0B';
    return theme.expense;
  };

  // Get debt icon/emoji based on name
  const getDebtIcon = () => {
    const name = debt.name.toLowerCase();
    if (name.includes('bank') || name.includes('kpr')) return '🏦';
    if (name.includes('motor') || name.includes('mobil')) return '🚗';
    if (name.includes('teman') || name.includes('keluarga')) return '👤';
    if (name.includes('toko') || name.includes('marketplace')) return '🏪';
    return '💳';
  };

  return (
    <Animated.View entering={FadeInDown.delay(140 + index * 60).duration(350)}>
      <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}>
        <View style={[styles.card, { backgroundColor: isDark ? theme.surfaceMuted : '#FFFFFF', borderColor: isDark ? theme.border : '#E2E8F0' }]}>
          
          {/* Header */}
          <View style={styles.cardHeader}>
            <View style={styles.nameRow}>
              <Text style={styles.icon}>{getDebtIcon()}</Text>
              <View style={styles.nameBlock}>
                <Text style={[styles.debtName, { color: theme.textPrimary }]} numberOfLines={1}>
                  {debt.name}
                </Text>
                {isPaid ? (
                  <View style={[styles.statusBadge, { backgroundColor: theme.income + '18' }]}>
                    <Text style={[styles.statusBadgeText, { color: theme.income }]}>LUNAS</Text>
                  </View>
                ) : isOverdue ? (
                  <View style={[styles.statusBadge, { backgroundColor: theme.expense + '18' }]}>
                    <Warning2 color={theme.expense} size={10} variant="Bold" />
                    <Text style={[styles.statusBadgeText, { color: theme.expense }]}>TERLAMBAT</Text>
                  </View>
                ) : null}
              </View>
            </View>
          </View>

          {/* Amount */}
          <View style={styles.amountRow}>
            <Text style={[styles.amountLabel, { color: theme.textMuted }]}>
              {isPaid ? 'Telah Dibayar' : 'Sisa Utang'}
            </Text>
            <Text style={[styles.amountValue, { color: isPaid ? theme.income : theme.expense }]}>
              {formatCurrency(isPaid ? debt.total_amount : debt.remaining_amount)}
            </Text>
          </View>

          {/* Progress Info */}
          <View style={styles.progressInfo}>
            <Text style={[styles.progressText, { color: theme.textMuted }]}>
              {formatCurrency(debt.paid_amount)} / {formatCurrency(debt.total_amount)}
            </Text>
            <Text style={[styles.progressPercent, { color: getProgressColor() }]}>
              {debt.progress_percent}%
            </Text>
          </View>

          {/* Ruler Progress Bar */}
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

          {/* Due Date & Action */}
          <View style={styles.footer}>
            <View style={styles.dueDateBlock}>
              <Clock 
                color={isOverdue ? theme.expense : theme.textMuted} 
                size={14} 
                variant="Linear" 
              />
              <Text style={[styles.dueDateText, { color: isOverdue ? theme.expense : theme.textMuted }]}>
                {isOverdue 
                  ? `Terlambat ${Math.abs(debt.days_until_due)} hari` 
                  : isPaid 
                  ? 'Sudah lunas'
                  : `${debt.days_until_due} hari lagi`
                }
              </Text>
            </View>
            
            {!isPaid && (
              <Button
                title="Bayar"
                variant="primary"
                size="small"
                onPress={(e) => {
                  e?.stopPropagation();
                  onPayPress();
                }}
              />
            )}
          </View>

        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    flex: 1,
  },
  icon: {
    fontSize: 24,
  },
  nameBlock: {
    flex: 1,
    gap: 4,
  },
  debtName: {
    fontSize: 16,
    fontWeight: '800',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 4,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  amountRow: {
    gap: 4,
  },
  amountLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  amountValue: {
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -0.6,
  },
  progressInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressPercent: {
    fontSize: 13,
    fontWeight: '800',
  },
  progressTrack: {
    height: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: 8,
    borderRadius: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dueDateBlock: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dueDateText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
