import React from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View, useColorScheme } from 'react-native';
import { Add, ArrowLeft2, Category2 } from 'iconsax-react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { getTheme } from '@/core/theme/colors';

interface CategoriesScreenProps { onBack: () => void }
const DEFAULT_CATEGORIES = ['Makan & Harian', 'Transportasi', 'Belanja', 'Hiburan', 'Tagihan', 'Lainnya'];

export function CategoriesScreen({ onBack }: CategoriesScreenProps) {
  const theme = getTheme(useColorScheme());
  return (
    <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.back} accessibilityLabel="Kembali">
          <ArrowLeft2 color={theme.textPrimary} size={20} />
        </TouchableOpacity>
        <View style={styles.copy}>
          <Text style={[styles.title, { color: theme.textPrimary }]}>Kategori</Text>
          <Text style={[styles.subtitle, { color: theme.textMuted }]}>Kelompokkan transaksi dengan rapi.</Text>
        </View>
        <Button title="Tambah" size="small" icon={<Add color={theme.onPrimary} size={15} />} onPress={() => {}} />
      </View>
      <View style={[styles.list, { borderColor: theme.border, backgroundColor: theme.cardBackground }]}>
        {DEFAULT_CATEGORIES.map((category, index) => (
          <View key={category} style={[styles.row, index > 0 && { borderTopWidth: 1, borderTopColor: theme.border }]}>
            <View style={[styles.icon, { backgroundColor: theme.surfaceElement }]}><Category2 color={theme.deepTeal} size={18} variant="Bold" /></View>
            <Text style={[styles.label, { color: theme.textPrimary }]}>{category}</Text>
          </View>
        ))}
      </View>
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
  list: { borderWidth: 1, borderRadius: 20, overflow: 'hidden' },
  row: { minHeight: 64, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  icon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 15, fontWeight: '700' },
});
