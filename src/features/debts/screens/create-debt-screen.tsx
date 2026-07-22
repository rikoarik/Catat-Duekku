import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  useColorScheme,
} from 'react-native';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowLeft2, Calendar } from 'iconsax-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { getTheme } from '@/core/theme/colors';
import { formatCurrency } from '@/core/utils/formatters';

interface CreateDebtFormProps {
  onBack: () => void;
  onSubmit: (debt: {
    name: string;
    total_amount: number;
    due_date: string;
    notes: string;
  }) => void;
}

export function CreateDebtForm({ onBack, onSubmit }: CreateDebtFormProps) {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);
  const isDark = colorScheme === 'dark';

  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDateInput, setDueDateInput] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Calculate default due date (30 days from now)
  const getDefaultDueDate = () => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date;
  };

  const parseDueDateInput = (input: string): Date | null => {
    // Try to parse DD/MM/YYYY format
    const parts = input.split('/');
    if (parts.length === 3) {
      const day = parseInt(parts[0]);
      const month = parseInt(parts[1]) - 1; // JS months are 0-indexed
      const year = parseInt(parts[2]);
      if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
        return new Date(year, month, day);
      }
    }
    return null;
  };

  const formatDateForDisplay = (date: Date) => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = 'Nama utang wajib diisi';
    }

    const amountNum = parseInt(amount.replace(/\D/g, '')) || 0;
    if (amountNum === 0) {
      newErrors.amount = 'Jumlah utang harus lebih dari 0';
    }

    const dueDate = dueDateInput ? parseDueDateInput(dueDateInput) : getDefaultDueDate();
    if (!dueDate || isNaN(dueDate.getTime())) {
      newErrors.dueDate = 'Format tanggal tidak valid (gunakan DD/MM/YYYY)';
    } else {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (dueDate < today) {
        newErrors.dueDate = 'Tanggal jatuh tempo tidak boleh di masa lalu';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validate()) return;

    const amountNum = parseInt(amount.replace(/\D/g, '')) || 0;
    const dueDate = dueDateInput ? parseDueDateInput(dueDateInput) : getDefaultDueDate();
    
    if (!dueDate) return;

    onSubmit({
      name: name.trim(),
      total_amount: amountNum,
      due_date: dueDate.toISOString().split('T')[0],
      notes: notes.trim(),
    });

    // Reset form
    setName('');
    setAmount('');
    setDueDateInput('');
    setNotes('');
    setErrors({});
  };

  const getDueDateForPreview = () => {
    if (dueDateInput) {
      const parsed = parseDueDateInput(dueDateInput);
      return parsed || getDefaultDueDate();
    }
    return getDefaultDueDate();
  };

  const formatDate = (date: Date) => {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  return (
    <KeyboardAwareScrollView
      enableOnAndroid
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.scrollContent}
    >
      {/* Header */}
      <Animated.View entering={FadeInDown.duration(350)} style={styles.header}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <ArrowLeft2 color={theme.textPrimary} size={24} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.textPrimary }]}>Tambah Utang</Text>
        <View style={{ width: 24 }} />
      </Animated.View>

      {/* Form */}
      <Animated.View entering={FadeInDown.delay(60).duration(400)} style={styles.form}>
        
        {/* Name Input */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.textPrimary }]}>
            Nama Utang <Text style={{ color: theme.expense }}>*</Text>
          </Text>
          <Input
            placeholder="Contoh: Pinjaman Bank BCA"
            value={name}
            onChangeText={(text) => {
              setName(text);
              if (errors.name) setErrors({ ...errors, name: '' });
            }}
          />
          {errors.name ? <Text style={styles.errorText}>{errors.name}</Text> : null}
          <Text style={[styles.hint, { color: theme.textMuted }]}>
            Berikan nama yang mudah dikenali
          </Text>
        </View>

        {/* Amount Input */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.textPrimary }]}>
            Total Utang <Text style={{ color: theme.expense }}>*</Text>
          </Text>
          <Input
            placeholder="0"
            value={amount}
            onChangeText={(text) => {
              const num = text.replace(/\D/g, '');
              setAmount(num ? formatCurrency(parseInt(num)) : '');
              if (errors.amount) setErrors({ ...errors, amount: '' });
            }}
            keyboardType="numeric"
          />
          {errors.amount ? <Text style={styles.errorText}>{errors.amount}</Text> : null}
          <Text style={[styles.hint, { color: theme.textMuted }]}>
            Jumlah utang yang harus dibayar
          </Text>
        </View>

        {/* Due Date Input */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.textPrimary }]}>
            Tanggal Jatuh Tempo <Text style={{ color: theme.expense }}>*</Text>
          </Text>
          <View style={styles.dateInputRow}>
            <Calendar color={theme.textSecondary} size={20} variant="Bold" />
            <Input
              placeholder="DD/MM/YYYY (contoh: 30/08/2026)"
              value={dueDateInput}
              onChangeText={(text) => {
                setDueDateInput(text);
                if (errors.dueDate) setErrors({ ...errors, dueDate: '' });
              }}
              keyboardType="numeric"
              style={{ flex: 1 }}
            />
          </View>
          {errors.dueDate ? <Text style={styles.errorText}>{errors.dueDate}</Text> : null}
          <Text style={[styles.hint, { color: theme.textMuted }]}>
            Batas waktu pelunasan utang. Kosongkan untuk 30 hari dari sekarang.
          </Text>
        </View>

        {/* Notes Input */}
        <View style={styles.section}>
          <Text style={[styles.label, { color: theme.textPrimary }]}>
            Catatan (Opsional)
          </Text>
          <Input
            placeholder="Contoh: Cicilan 12 bulan, bunga 5%"
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />
          <Text style={[styles.hint, { color: theme.textMuted }]}>
            Informasi tambahan tentang utang ini
          </Text>
        </View>

        {/* Preview Card */}
        {amount && (
          <Animated.View 
            entering={FadeInDown.duration(300)}
            style={[styles.previewCard, { backgroundColor: isDark ? '#0D2B1F' : '#F0FDF4', borderColor: isDark ? '#166534' : '#BBF7D0' }]}
          >
            <Text style={[styles.previewLabel, { color: theme.textMuted }]}>Ringkasan</Text>
            <View style={styles.previewRow}>
              <Text style={[styles.previewText, { color: theme.textPrimary }]}>Nama:</Text>
              <Text style={[styles.previewValue, { color: theme.textPrimary }]} numberOfLines={1}>
                {name || '-'}
              </Text>
            </View>
            <View style={styles.previewRow}>
              <Text style={[styles.previewText, { color: theme.textPrimary }]}>Jumlah:</Text>
              <Text style={[styles.previewValue, { color: theme.expense }]}>
                {amount || 'Rp 0'}
              </Text>
            </View>
            <View style={styles.previewRow}>
              <Text style={[styles.previewText, { color: theme.textPrimary }]}>Jatuh Tempo:</Text>
              <Text style={[styles.previewValue, { color: theme.textPrimary }]}>
                {formatDate(getDueDateForPreview())}
              </Text>
            </View>
          </Animated.View>
        )}

        {/* Action Buttons */}
        <View style={styles.actions}>
          <Button
            title="Batal"
            variant="secondary"
            onPress={onBack}
            style={{ flex: 1 }}
          />
          <Button
            title="Simpan Utang"
            variant="primary"
            onPress={handleSubmit}
            style={{ flex: 1 }}
          />
        </View>
      </Animated.View>
    </KeyboardAwareScrollView>
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
  form: {
    gap: 24,
  },
  section: {
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
  },
  hint: {
    fontSize: 12,
    fontWeight: '500',
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
  },
  dateInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  previewCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 10,
    marginTop: 8,
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewText: {
    fontSize: 13,
    fontWeight: '600',
  },
  previewValue: {
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: -0.3,
    flex: 1,
    textAlign: 'right',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
});
