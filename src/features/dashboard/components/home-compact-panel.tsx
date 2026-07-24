import { Text } from '@/components/ui/text';
import { Card } from '@/components/ui/card';
import { getTheme } from '@/core/theme/colors';
import { formatCurrency } from '@/core/utils/formatters';
import { ArrowDown2, ArrowUp2 } from 'iconsax-react-native';
import { StyleSheet, useColorScheme, View } from 'react-native';

interface HomeCompactPanelProps {
  income?: number;
  expense?: number;
  debt?: number;
  safeToSpend?: number;
  dailySafeLimit?: number;
  valuesVisible?: boolean;
}

export function HomeCompactPanel({ income = 0, expense = 0, debt = 0, safeToSpend = 0, dailySafeLimit = 0, valuesVisible = false }: HomeCompactPanelProps) {
  const theme = getTheme(useColorScheme());
  const expenseAmount = Math.abs(expense);
  const netCashflow = income - expenseAmount;
  const expenseRatio = income > 0 ? Math.round(expenseAmount / income * 100) : null;
  const healthy = netCashflow >= 0;
  const money = (value: number) => valuesVisible ? formatCurrency(value) : '••••••••';

  return (
    <Card variant="default" style={[styles.card, { borderColor: theme.border }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.textPrimary }]} weight="bold">Ringkasan bulan ini</Text>
        <Text style={[styles.subtitle, { color: theme.textMuted }]}>Arus kas yang sudah tercatat</Text>
      </View>

      <View style={[styles.netCard, { backgroundColor: healthy ? theme.incomeSurface : theme.expenseSurface }]}>
        <View style={styles.netTop}>
          <Text style={[styles.netStatus, { color: healthy ? theme.income : theme.expense }]} weight="bold">{healthy ? 'SURPLUS' : 'DEFISIT'}</Text>
        </View>
        <Text style={[styles.netLabel, { color: theme.textMuted }]}>Arus kas bersih</Text>
        <Text style={[styles.netAmount, { color: healthy ? theme.income : theme.expense }]} weight="bold">{money(Math.abs(netCashflow))}</Text>
        <Text style={[styles.netHint, { color: theme.textSecondary }]}>{healthy ? 'Pemasukan masih lebih besar dari pengeluaran.' : 'Pengeluaran sudah melebihi pemasukan tercatat.'}</Text>
      </View>

      <View style={styles.flowRow}>
        <View style={[styles.flowCell, { backgroundColor: theme.incomeSurface }]}>
          <View style={styles.flowLabelRow}><ArrowUp2 color={theme.income} size={14} variant="Bold" /><Text style={[styles.flowLabel, { color: theme.textMuted }]}>Pemasukan</Text></View>
          <Text style={[styles.flowAmount, { color: theme.textPrimary }]} weight="bold">{money(income)}</Text>
        </View>
        <View style={[styles.flowCell, { backgroundColor: theme.expenseSurface }]}>
          <View style={styles.flowLabelRow}><ArrowDown2 color={theme.expense} size={14} variant="Bold" /><Text style={[styles.flowLabel, { color: theme.textMuted }]}>Pengeluaran</Text></View>
          <Text style={[styles.flowAmount, { color: theme.textPrimary }]} weight="bold">{money(expenseAmount)}</Text>
        </View>
      </View>

      <View style={[styles.divider, { backgroundColor: theme.border }]} />

      <View style={styles.details}>
        <DetailRow label="Rasio pengeluaran" value={!valuesVisible ? '••%' : expenseRatio === null ? 'Belum dapat dihitung' : `${expenseRatio}% dari pemasukan`} tone={expenseRatio !== null && expenseRatio > 100 ? theme.expense : theme.textPrimary} theme={theme} />
        <DetailRow label="Uang aman digunakan" value={money(safeToSpend)} tone={theme.income} theme={theme} />
        <DetailRow label="Batas aman harian" value={money(dailySafeLimit)} tone={theme.textPrimary} theme={theme} />
        <DetailRow label="Sisa hutang" value={money(debt)} tone={debt > 0 ? theme.expense : theme.income} theme={theme} />
      </View>
    </Card>
  );
}

function DetailRow({ label, value, tone, theme }: { label: string; value: string; tone: string; theme: ReturnType<typeof getTheme> }) {
  return <View style={styles.detailRow}><Text style={[styles.detailLabel, { color: theme.textMuted }]}>{label}</Text><Text style={[styles.detailValue, { color: tone }]} weight="bold">{value}</Text></View>;
}

const styles = StyleSheet.create({
  card: { marginHorizontal: 20, padding: 16, borderWidth: 1, gap: 12 },
  header: { gap: 3 },
  title: { fontSize: 17, letterSpacing: -0.3 },
  subtitle: { fontSize: 11, marginTop: 3 },
  netCard: { borderRadius: 20, padding: 16, gap: 4 },
  netTop: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 1 },
  netStatus: { fontSize: 9, letterSpacing: 0.7 },
  netLabel: { fontSize: 11 },
  netAmount: { fontSize: 25, letterSpacing: -0.8 },
  netHint: { fontSize: 11, lineHeight: 16, marginTop: 2 },
  flowRow: { flexDirection: 'row', gap: 10 },
  flowCell: { flex: 1, minWidth: 0, borderRadius: 17, padding: 12, gap: 7 },
  flowLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  flowLabel: { fontSize: 10 },
  flowAmount: { fontSize: 13, letterSpacing: -0.2 },
  divider: { height: 1 },
  details: { gap: 11 },
  detailRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 14 },
  detailLabel: { flex: 1, fontSize: 11 },
  detailValue: { flexShrink: 1, fontSize: 11, textAlign: 'right' },
});
