import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  useColorScheme,
  Modal,
  Pressable,
} from 'react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CloseCircle, Bank, Wallet2, MoneyArchive } from 'iconsax-react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { getTheme } from '@/core/theme/colors';
import { formatCurrency } from '@/core/utils/formatters';
import type { DebtWithComputed } from '@/types/debt';

interface Account {
  id: string;
  name: string;
  type: 'bank' | 'ewallet' | 'cash';
  balance: number;
}

const MOCK_ACCOUNTS: Account[] = [
  { id: '1', name: 'BCA Utama', type: 'bank', balance: 8500000 },
  { id: '2', name: 'Mandiri Payroll', type: 'bank', balance: 3200000 },
  { id: '3', name: 'GoPay Daily', type: 'ewallet', balance: 1850000 },
  { id: '4', name: 'Uang Tunai', type: 'cash', balance: 1150000 },
];

const ACCOUNT_ICONS = {
  bank: Bank,
  ewallet: Wallet2,
  cash: MoneyArchive,
};

interface DebtPaymentModalProps {
  visible: boolean;
  debt: DebtWithComputed | null;
  onClose: () => void;
  onConfirm: (debtId: string, amount: number, accountId: string, notes: string) => void;
}

export function DebtPaymentModal({ visible, debt, onClose, onConfirm }: DebtPaymentModalProps) {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);
  const isDark = colorScheme === 'dark';

  const [amount, setAmount] = useState('');
  const [selectedAccountId, setSelectedAccountId] = useState(MOCK_ACCOUNTS[0].id);
  const [notes, setNotes] = useState('');
  const [showAccountPicker, setShowAccountPicker] = useState(false);
  const [error, setError] = useState('');

  if (!debt) return null;

  const selectedAccount = MOCK_ACCOUNTS.find(a => a.id === selectedAccountId);
  const amountNum = parseInt(amount.replace(/\D/g, '')) || 0;
  const newRemaining = debt.remaining_amount - amountNum;
  const newProgress = Math.round(((debt.paid_amount + amountNum) / debt.total_amount) * 100);

  const handleConfirm = () => {
    // Validation
    if (amountNum === 0) {
      setError('Masukkan jumlah pembayaran');
      return;
    }
    if (amountNum > debt.remaining_amount) {
      setError('Pembayaran melebihi sisa utang.');
      return;
    }
    if (selectedAccount && amountNum > selectedAccount.balance) {
      setError('Saldo akun tidak mencukupi.');
      return;
    }

    // Call atomic transaction
    onConfirm(debt.id, amountNum, selectedAccountId, notes);
    
    // Reset and close
    setAmount('');
    setNotes('');
    setError('');
    onClose();
  };

  const handleClose = () => {
    setAmount('');
    setNotes('');
    setError('');
    onClose();
  };

  const AccountIcon = selectedAccount ? ACCOUNT_ICONS[selectedAccount.type] : Bank;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={{ flex: 1, justifyContent: 'flex-end' }} onPress={(e) => e.stopPropagation()}>
          <Animated.View entering={FadeInDown.duration(300)} style={[styles.modal, { backgroundColor: isDark ? theme.surface : '#FFFFFF' }]}>
            
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.handleBar} />
              <View style={styles.headerRow}>
                <Text style={[styles.title, { color: theme.textPrimary }]}>Bayar Utang</Text>
                <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  <CloseCircle color={theme.textMuted} size={24} variant="Linear" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Debt Info */}
            <View style={[styles.debtInfo, { backgroundColor: isDark ? theme.surfaceMuted : '#F8FAFC' }]}>
              <Text style={[styles.debtName, { color: theme.textPrimary }]}>{debt.name}</Text>
              <View style={styles.debtAmounts}>
                <View>
                  <Text style={[styles.debtLabel, { color: theme.textMuted }]}>Sisa Utang</Text>
                  <Text style={[styles.debtAmount, { color: theme.expense }]}>
                    {formatCurrency(debt.remaining_amount)}
                  </Text>
                </View>
                <View style={styles.debtDivider} />
                <View>
                  <Text style={[styles.debtLabel, { color: theme.textMuted }]}>Sudah Dibayar</Text>
                  <Text style={[styles.debtAmount, { color: theme.income }]}>
                    {formatCurrency(debt.paid_amount)}
                  </Text>
                </View>
              </View>
            </View>

            {/* Amount Input */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: theme.textPrimary }]}>Jumlah Pembayaran</Text>
              <Input
                placeholder="0"
                value={amount}
                onChangeText={(text) => {
                  setError('');
                  const num = text.replace(/\D/g, '');
                  setAmount(num ? formatCurrency(parseInt(num)) : '');
                }}
                keyboardType="numeric"
              />
              {error ? <Text style={styles.errorText}>{error}</Text> : null}
            </View>

            {/* Account Selector */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: theme.textPrimary }]}>Bayar Dari Akun</Text>
              <TouchableOpacity 
                activeOpacity={0.7}
                onPress={() => setShowAccountPicker(!showAccountPicker)}
                style={[styles.accountSelector, { backgroundColor: isDark ? theme.surfaceMuted : '#F8FAFC', borderColor: isDark ? theme.border : '#E2E8F0' }]}
              >
                <View style={styles.accountRow}>
                  <AccountIcon color={theme.textPrimary} size={20} variant="Bold" />
                  <View style={styles.accountInfo}>
                    <Text style={[styles.accountName, { color: theme.textPrimary }]}>
                      {selectedAccount?.name}
                    </Text>
                    <Text style={[styles.accountBalance, { color: theme.textMuted }]}>
                      Saldo: {formatCurrency(selectedAccount?.balance || 0)}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>

              {/* Account Picker */}
              {showAccountPicker && (
                <Animated.View entering={FadeIn.duration(200)} style={[styles.accountPicker, { backgroundColor: isDark ? theme.surfaceMuted : '#F8FAFC', borderColor: isDark ? theme.border : '#E2E8F0' }]}>
                  {MOCK_ACCOUNTS.map((account) => {
                    const Icon = ACCOUNT_ICONS[account.type];
                    return (
                      <TouchableOpacity
                        key={account.id}
                        activeOpacity={0.7}
                        onPress={() => {
                          setSelectedAccountId(account.id);
                          setShowAccountPicker(false);
                        }}
                        style={[styles.accountOption, selectedAccountId === account.id && { backgroundColor: isDark ? theme.surface : '#E6F4F1' }]}
                      >
                        <Icon color={theme.textPrimary} size={18} variant="Bold" />
                        <View style={styles.accountInfo}>
                          <Text style={[styles.accountName, { color: theme.textPrimary }]}>{account.name}</Text>
                          <Text style={[styles.accountBalance, { color: theme.textMuted }]}>
                            {formatCurrency(account.balance)}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </Animated.View>
              )}
            </View>

            {/* Notes Input */}
            <View style={styles.section}>
              <Text style={[styles.label, { color: theme.textPrimary }]}>Catatan (Opsional)</Text>
              <Input
                placeholder="Cicilan bulan Juli"
                value={notes}
                onChangeText={setNotes}
                multiline
              />
            </View>

            {/* Preview */}
            {amountNum > 0 && (
              <Animated.View entering={FadeIn.duration(200)} style={[styles.preview, { backgroundColor: isDark ? '#0D2B1F' : '#F0FDF4', borderColor: isDark ? '#166534' : '#BBF7D0' }]}>
                <Text style={[styles.previewLabel, { color: theme.textMuted }]}>Setelah Pembayaran</Text>
                <View style={styles.previewRow}>
                  <Text style={[styles.previewText, { color: theme.textPrimary }]}>Sisa Utang:</Text>
                  <Text style={[styles.previewValue, { color: newRemaining > 0 ? theme.expense : theme.income }]}>
                    {formatCurrency(newRemaining)}
                  </Text>
                </View>
                <View style={styles.previewRow}>
                  <Text style={[styles.previewText, { color: theme.textPrimary }]}>Progress:</Text>
                  <Text style={[styles.previewValue, { color: theme.income }]}>
                    {newProgress}% terbayar
                  </Text>
                </View>
              </Animated.View>
            )}

            {/* Action Buttons */}
            <View style={styles.actions}>
              <Button
                title="Batal"
                variant="secondary"
                onPress={handleClose}
                style={{ flex: 1 }}
              />
              <Button
                title="Konfirmasi Bayar"
                variant="primary"
                onPress={handleConfirm}
                style={{ flex: 1 }}
              />
            </View>

          </Animated.View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modal: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 32,
    maxHeight: '90%',
  },
  header: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
  },
  debtInfo: {
    marginHorizontal: 20,
    padding: 16,
    borderRadius: 16,
    gap: 12,
  },
  debtName: {
    fontSize: 16,
    fontWeight: '800',
  },
  debtAmounts: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  debtLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
  },
  debtAmount: {
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  debtDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#E5E7EB',
  },
  section: {
    paddingHorizontal: 20,
    marginTop: 20,
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
  },
  errorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#EF4444',
    marginTop: 4,
  },
  accountSelector: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  accountInfo: {
    flex: 1,
    gap: 2,
  },
  accountName: {
    fontSize: 14,
    fontWeight: '700',
  },
  accountBalance: {
    fontSize: 12,
    fontWeight: '500',
  },
  accountPicker: {
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 8,
    overflow: 'hidden',
  },
  accountOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
  },
  preview: {
    marginHorizontal: 20,
    marginTop: 20,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  previewLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    marginTop: 24,
  },
});
