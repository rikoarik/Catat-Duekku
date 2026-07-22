import { Text } from '@/components/ui/text';
import { getTheme } from '@/core/theme/colors';
import { formatCurrency } from '@/core/utils/formatters';
import { ArrowDown2, ArrowUp2 } from 'iconsax-react-native';
import { StyleSheet, useColorScheme, View } from 'react-native';

interface HomeCompactPanelProps {
  income?: number;
  expense?: number;
  debt?: number;
}

export function HomeCompactPanel({ income = 0, expense = 0, debt = 0 }: HomeCompactPanelProps) {
  const metrics = [
    { key: 'in', label: 'Masuk', amount: income, sign: 'up' as const },
    { key: 'out', label: 'Keluar', amount: Math.abs(expense), sign: 'down' as const },
    { key: 'debt', label: 'Utang', amount: debt, sign: 'down' as const },
  ];
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
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Ringkasan bulan ini</Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>Arus kas dan kewajiban</Text>
      </View>

      <View style={[styles.divider, { backgroundColor: isDark ? theme.border : '#EDF0EC' }]} />

      <View style={styles.metrics}>
        {metrics.map((m, i) => {
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
  header: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 2,
  },
  title: {
    fontSize: 14,
    fontWeight: '900',
  },
  subtitle: {
    fontSize: 11,
    fontWeight: '600',
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
