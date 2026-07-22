import React from 'react';
import { StyleSheet, View, TouchableOpacity, useColorScheme } from 'react-native';
import { Text } from '@/components/ui/text';
import { getTheme } from '@/core/theme/colors';
import { formatCurrency } from '@/core/utils/formatters';
import {
  Add,
  CardReceive,
  WalletAdd,
  Chart,
  ArrowDown2,
  ArrowUp2,
  Calendar,
} from 'iconsax-react-native';

interface HomeCompactPanelProps {
  onAction?: (key: 'record' | 'debt' | 'goal' | 'summary') => void;
}

const ACTIONS = [
  { key: 'record', label: 'Catat', icon: Add },
  { key: 'debt', label: 'Utang', icon: CardReceive },
  { key: 'goal', label: 'Tabungan', icon: WalletAdd },
  { key: 'summary', label: 'Ringkasan', icon: Chart },
] as const;

const METRICS = [
  { key: 'in', label: 'Masuk', amount: 7500000, sign: 'up' as const },
  { key: 'out', label: 'Keluar', amount: 2430000, sign: 'down' as const },
  { key: 'debt', label: 'Utang', amount: 450000, sign: 'down' as const },
  { key: 'goal', label: 'Tabungan', amount: 2500000, sign: 'up' as const },
];

export function HomeCompactPanel({ onAction }: HomeCompactPanelProps) {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);
  const isDark = colorScheme === 'dark';

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: isDark ? theme.surfaceMuted : '#FFFFFF',
          borderColor: isDark ? theme.border : '#E2E8F0',
        },
      ]}>
      {/* Icon actions row */}
      <View style={styles.actions}>
        {ACTIONS.map((a) => {
          const Icon = a.icon;
          return (
            <TouchableOpacity
              key={a.key}
              activeOpacity={0.7}
              onPress={() => onAction?.(a.key)}
              style={[styles.actionBtn, { backgroundColor: isDark ? theme.surface : '#F1F5F9' }]}>
              <View style={[styles.actionIcon, { backgroundColor: theme.deepTeal }]}>
                <Icon color={theme.softLime} size={16} variant="Bold" />
              </View>
              <Text style={[styles.actionLabel, { color: theme.textPrimary }]}>{a.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={[styles.divider, { backgroundColor: isDark ? theme.border : '#EDF0EC' }]} />

      {/* Metrics grid */}
      <View style={styles.metrics}>
        {METRICS.map((m, i) => {
          const accent = m.sign === 'up' ? theme.income : theme.expense;
          const ArrowIcon = m.sign === 'up' ? ArrowUp2 : ArrowDown2;
          const isRightCol = i % 2 === 1;
          return (
            <View
              key={m.key}
              style={[
                styles.metricCell,
                isRightCol && { borderLeftWidth: 1, borderLeftColor: isDark ? theme.border : '#EDF0EC' },
                i >= 2 && { borderTopWidth: 1, borderTopColor: isDark ? theme.border : '#EDF0EC' },
              ]}>
              <View style={styles.metricTop}>
                <Text style={[styles.metricLabel, { color: theme.textMuted }]}>{m.label}</Text>
                <ArrowIcon color={accent} size={11} variant="Bold" />
              </View>
              <Text style={[styles.metricAmount, { color: theme.textPrimary }]}>{formatCurrency(m.amount)}</Text>
            </View>
          );
        })}
      </View>

      <View style={[styles.divider, { backgroundColor: isDark ? theme.border : '#EDF0EC' }]} />

      {/* Single alert strip */}
      <View style={styles.alert}>
        <View style={[styles.alertIcon, { backgroundColor: theme.expenseSurface }]}>
          <Calendar color={theme.expense} size={12} variant="Bold" />
        </View>
        <Text style={[styles.alertText, { color: theme.textPrimary }]} numberOfLines={1}>
          Kredivo · 25 Jul · Rp700rb
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: 20,
    marginVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  actions: {
    flexDirection: 'row',
    padding: 10,
    gap: 8,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    gap: 5,
    borderRadius: 14,
  },
  actionIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  divider: {
    height: 1,
  },
  metrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  metricCell: {
    width: '50%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 3,
  },
  metricTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  metricAmount: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  alert: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  alertIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
  },
});
