import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View, useColorScheme } from 'react-native';
import { Add, ArrowLeft2, Flag2 } from 'iconsax-react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { getTheme } from '@/core/theme/colors';
import { financeStore } from '@/core/lib/finance-store';

interface SavingsScreenProps { onBack: () => void }

export function SavingsScreen({ onBack }: SavingsScreenProps) {
  const theme = getTheme(useColorScheme());
  const goals = financeStore.getGoals();
  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.back} accessibilityLabel="Kembali">
          <ArrowLeft2 color={theme.textPrimary} size={20} />
        </TouchableOpacity>
        <View style={styles.copy}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>Tabungan</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>Target yang ingin kamu capai.</Text>
        </View>
        <Button title="Tambah" size="small" icon={<Add color={theme.onPrimary} size={15} />} onPress={() => {}} />
      </View>
      {goals.length === 0 ? (
        <View style={[styles.empty, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          <View style={[styles.emptyIcon, { backgroundColor: theme.accentSoft }]}><Flag2 color={theme.accentText} size={22} variant="Bold" /></View>
          <Text style={[styles.emptyTitle, { color: theme.textPrimary }]}>Belum ada target tabungan</Text>
          <Text style={[styles.emptyText, { color: theme.textMuted }]}>Buat target seperti “Laptop” atau “Dana darurat”.</Text>
        </View>
      ) : (
        <View style={[styles.list, { borderColor: theme.border, backgroundColor: theme.cardBackground }]}>
          {goals.map((goal, index) => {
            const progress = goal.targetAmount ? Math.min(goal.savedAmount / goal.targetAmount, 1) : 0;
            return <View key={goal.id} style={[styles.goal, index > 0 && { borderTopWidth: 1, borderTopColor: theme.border }]}>
              <View style={[styles.emptyIcon, { backgroundColor: theme.accentSoft }]}><Flag2 color={theme.accentText} size={18} variant="Bold" /></View>
              <View style={styles.copy}><Text style={[styles.goalTitle, { color: theme.textPrimary }]}>{goal.name}</Text><Text style={[styles.subtitle, { color: theme.textMuted }]}>{goal.savedAmount.toLocaleString('id-ID')} / {goal.targetAmount.toLocaleString('id-ID')}</Text><View style={[styles.track, { backgroundColor: theme.surfaceMuted }]}><View style={[styles.fill, { width: `${progress * 100}%`, backgroundColor: theme.accent }]} /></View></View>
            </View>;
          })}
        </View>
      )}
    </ScrollView>
  );
}
const styles = StyleSheet.create({
  content: { padding: 20, paddingBottom: 110 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  back: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, gap: 4 },
  title: { fontSize: 24, fontWeight: '800' },
  subtitle: { fontSize: 12 },
  empty: { borderWidth: 1, borderRadius: 20, padding: 24, alignItems: 'center', gap: 8 },
  emptyIcon: { width: 40, height: 40, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '800', textAlign: 'center' },
  emptyText: { fontSize: 13, lineHeight: 19, textAlign: 'center' },
  list: { borderWidth: 1, borderRadius: 20, overflow: 'hidden' },
  goal: { minHeight: 84, padding: 16, flexDirection: 'row', gap: 12, alignItems: 'center' },
  goalTitle: { fontSize: 15, fontWeight: '800' },
  track: { height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 5 },
  fill: { height: '100%', borderRadius: 3 },
});
