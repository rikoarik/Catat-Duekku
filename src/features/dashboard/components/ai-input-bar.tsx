import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, TextInput, TouchableOpacity, View, useColorScheme, ActivityIndicator } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';
import { Magicpen, ArrowRight2, TickCircle, CloseCircle } from 'iconsax-react-native';
import { getTheme } from '@/core/theme/colors';
import { Text } from '@/components/ui/text';
import { parseInput, type ParseResult } from '@/core/lib/transaction-parser';
import { formatCurrency } from '@/core/utils/formatters';

interface AiInputBarProps {
  placeholder?: string;
  onSubmit?: (text: string, result: ParseResult) => void;
  onConfirmPreview?: (result: ParseResult) => Promise<void>;
}

const INTENT_LABEL: Record<string, { verb: string; tone: 'income' | 'expense' | 'neutral' }> = {
  create_expense: { verb: 'Pengeluaran', tone: 'expense' },
  create_income: { verb: 'Pemasukan', tone: 'income' },
  set_balance: { verb: 'Penyesuaian saldo', tone: 'neutral' },
  pay_debt: { verb: 'Bayar utang', tone: 'expense' },
  create_debt: { verb: 'Utang baru', tone: 'neutral' },
  create_goal: { verb: 'Target tabungan', tone: 'neutral' },
  deposit_goal: { verb: 'Nabung', tone: 'expense' },
  withdraw_goal: { verb: 'Tarik tabungan', tone: 'income' },
  update_last_amount: { verb: 'Koreksi nominal', tone: 'neutral' },
  update_last_account: { verb: 'Koreksi akun', tone: 'neutral' },
  undo_last: { verb: 'Undo', tone: 'neutral' },
  get_summary: { verb: 'Ringkasan', tone: 'neutral' },
  unknown: { verb: 'Tidak dikenali', tone: 'neutral' },
};

export function AiInputBar({
  placeholder = 'Tulis: makan 25 ribu cash',
  onSubmit,
  onConfirmPreview,
}: AiInputBarProps) {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);
  const isDark = colorScheme === 'dark';

  const [text, setText] = useState('');
  const [result, setResult] = useState<ParseResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleChangeText = (value: string) => {
    const trimmed = value.trim();
    setText(value);
    setError('');

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!trimmed) {
      setLoading(false);
      setResult(null);
      return;
    }

    setLoading(true);
  };

  // Debounced parse on every keystroke
  useEffect(() => {
    if (!text.trim()) {
      return;
    }

    debounceRef.current = setTimeout(async () => {
      try {
        const parsed = await parseInput(text);
        setResult(parsed);
      } catch (cause) {
        setResult(null);
        setError(cause instanceof Error ? cause.message : 'Gagal memproses input.');
      } finally {
        setLoading(false);
      }
    }, 350);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [text]);

  const handleConfirm = async () => {
    if (!result || !onConfirmPreview) return;
    setLoading(true);
    setError('');
    try {
      await onConfirmPreview(result);
      setText('');
      setResult(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Gagal menyimpan transaksi.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!text.trim() || !result) return;
    onSubmit?.(text.trim(), result);
    if (onConfirmPreview) await handleConfirm();
  };

  const label = result ? INTENT_LABEL[result.intent] ?? INTENT_LABEL.unknown : null;
  const tone = label?.tone ?? 'neutral';
  const toneColor =
    tone === 'income'
      ? theme.income
      : tone === 'expense'
      ? theme.expense
      : theme.textPrimary;
  const toneBg =
    tone === 'income'
      ? theme.incomeSurface
      : tone === 'expense'
      ? theme.expenseSurface
      : isDark
      ? theme.surfaceMuted
      : '#F1F5F9';

  return (
    <View style={styles.outer}>
      {/* Textarea + send button */}
      <View
        style={[
          styles.bar,
          {
            backgroundColor: isDark ? theme.surfaceMuted : '#FFFFFF',
            borderColor: text ? theme.deepTeal : theme.border,
          },
        ]}>
        <View style={[styles.iconBadge, { backgroundColor: theme.deepTeal }]}>
          <Magicpen color={theme.softLime} size={16} variant="Linear" />
        </View>
        <TextInput
          value={text}
          onChangeText={handleChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.textMuted}
          style={[styles.input, { color: theme.textPrimary }]}
          multiline
          returnKeyType="send"
          blurOnSubmit
          onSubmitEditing={handleSubmit}
        />
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={handleSubmit}
          disabled={!text.trim() || !result}
          style={[
            styles.sendBtn,
            { backgroundColor: text.trim() && result ? theme.deepTeal : theme.surfaceButton },
          ]}>
          {loading ? (
            <ActivityIndicator color={theme.textPrimary} size="small" />
          ) : (
            <ArrowRight2
              color={text.trim() && result ? theme.onPrimary : theme.textMuted}
              size={18}
              variant="Bold"
            />
          )}
        </TouchableOpacity>
      </View>

      {error ? <Text style={{ color: theme.expense }}>{error}</Text> : null}
      {result && (
        <Animated.View
          entering={FadeInDown.duration(200)}
          exiting={FadeOut.duration(150)}
          style={[
            styles.preview,
            {
              backgroundColor: toneBg,
              borderColor: toneColor + '33',
            },
          ]}>
          <View style={styles.previewHeader}>
            <View style={[styles.previewBadge, { backgroundColor: toneColor + '22' }]}>
              {result.confidence >= 0.7 ? (
                <TickCircle color={toneColor} size={12} variant="Bold" />
              ) : (
                <CloseCircle color={toneColor} size={12} variant="Bold" />
              )}
              <Text style={[styles.previewBadgeText, { color: toneColor }]}>
                {label?.verb ?? 'Terdeteksi'}
              </Text>
            </View>
            <Text style={[styles.previewMeta, { color: theme.textMuted }]}>
              {Math.round(result.confidence * 100)}% yakin
            </Text>
          </View>

          <View style={styles.previewBody}>
            {typeof result.fields.amount === 'number' && (
              <Text style={[styles.previewAmount, { color: toneColor }]}>
                {formatCurrency(result.fields.amount)}
              </Text>
            )}
            {result.fields.accountName && (
              <Text style={[styles.previewDetail, { color: theme.textPrimary }]}>
                {result.fields.accountName}
                {result.fields.categoryName ? ` · ${result.fields.categoryName}` : ''}
              </Text>
            )}
            {result.fields.description && (
              <Text style={[styles.previewDescription, { color: theme.textMuted }]}>
                {result.fields.description}
              </Text>
            )}
            {result.fields.debtName && (
              <Text style={[styles.previewDetail, { color: theme.textPrimary }]}>
                Utang: {result.fields.debtName}
              </Text>
            )}
            {result.fields.goalName && (
              <Text style={[styles.previewDetail, { color: theme.textPrimary }]}>
                Tabungan: {result.fields.goalName}
              </Text>
            )}
            {typeof result.fields.newBalance === 'number' && (
              <Text style={[styles.previewDetail, { color: theme.textPrimary }]}>
                Saldo baru: {formatCurrency(result.fields.newBalance)}
              </Text>
            )}
            {result.reason && (
              <Text style={[styles.previewDescription, { color: theme.expense }]}>
                {result.reason}
              </Text>
            )}
          </View>

          {onConfirmPreview && result.confidence >= 0.6 && (
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={handleConfirm}
              style={[styles.confirmBtn, { backgroundColor: toneColor }]}>
              <Text style={styles.confirmBtnText}>Konfirmasi</Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  outer: {
    gap: 8,
    marginHorizontal: 20,
    marginVertical: 6,
  },
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  iconBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    maxHeight: 58,
    paddingVertical: 0,
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  preview: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    gap: 7,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  previewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  previewBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  previewMeta: {
    fontSize: 11,
    fontWeight: '700',
  },
  previewBody: {
    gap: 2,
  },
  previewAmount: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  previewDetail: {
    fontSize: 13,
    fontWeight: '700',
  },
  previewDescription: {
    fontSize: 12,
    fontWeight: '500',
    lineHeight: 17,
  },
  confirmBtn: {
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
});
