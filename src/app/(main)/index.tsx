import { Text } from '@/components/ui/text';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, AppState, Platform, RefreshControl, StyleSheet, View, useColorScheme } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

import { ScreenWrapper } from '@/components/common/screen-wrapper';
import { Button } from '@/components/ui/button';
import { FloatingGlassNav, NavTab } from '@/components/navigation/floating-glass-nav';
import { edgeApi, idempotencyKey, type BalanceBreakdown, type BudgetCycleSummary, type Profile, type Summary } from '@/core/lib/edge-api';
import type { ParseResult } from '@/core/lib/transaction-parser';
import { getTheme } from '@/core/theme/colors';
import { formatCurrency } from '@/core/utils/formatters';
import { AnalyticsScreen } from '@/features/analytics/screens/analytics-screen';
import { AiInputBar } from '@/features/dashboard/components/ai-input-bar';
import { DashboardHeader } from '@/features/dashboard/components/dashboard-header';
import { HomeCompactPanel } from '@/features/dashboard/components/home-compact-panel';
import { SavingsBalanceSection } from '@/features/dashboard/components/savings-balance-section';
import { ManageScreen } from '@/features/manage/screens/manage-screen';
import { ProfileScreen } from '@/features/profile/screens/profile-screen';
import { router, type Href } from 'expo-router';

export default function MainPage() {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [profile, setProfile] = useState<Profile | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [budget, setBudget] = useState<BudgetCycleSummary | null>(null);
  const [balances, setBalances] = useState<BalanceBreakdown | null>(null);
  const [homeError, setHomeError] = useState('');
  const [homeLoading, setHomeLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [homeValuesVisible, setHomeValuesVisible] = useState(false);

  const loadHome = useCallback(async (pull = false) => {
    if (pull) setRefreshing(true);
    setHomeError('');
    const [profileResult, summaryResult, notificationResult, budgetResult, balanceResult] = await Promise.allSettled([edgeApi.getProfile(), edgeApi.summary(), edgeApi.notifications(), edgeApi.budgetCycle(), edgeApi.balanceBreakdown()]);
    if (profileResult.status === 'fulfilled') setProfile(profileResult.value.data);
    if (summaryResult.status === 'fulfilled') setSummary(summaryResult.value.data);
    if (notificationResult.status === 'fulfilled') setUnreadCount(notificationResult.value.data.unread_count);
    if (budgetResult.status === 'fulfilled') setBudget(budgetResult.value);
    if (balanceResult.status === 'fulfilled') setBalances(balanceResult.value);
    const failure = [profileResult, summaryResult, notificationResult, budgetResult, balanceResult].find((item) => item.status === 'rejected');
    if (failure?.status === 'rejected') setHomeError(failure.reason instanceof Error ? failure.reason.message : 'Gagal memuat beranda.');
    setHomeLoading(false);
    if (pull) setRefreshing(false);
  }, []);

  useEffect(() => {
    queueMicrotask(() => void loadHome());
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void loadHome();
    });
    return () => subscription.remove();
  }, [loadHome]);

  useEffect(() => {
    if (activeTab === 'home') queueMicrotask(() => void loadHome());
  }, [activeTab, loadHome]);

  const confirmTransaction = async (result: ParseResult) => {
    const { amount, accountId, accountName, sourceAccountId, destinationAccountId, accountKind, categoryName, description, debtName, goalName, newBalance } = result.fields;
    if (result.intent === 'create_income' || result.intent === 'create_expense') {
      if (!accountId || typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) throw new Error('Akun dan nominal valid wajib diisi.');
      const key = idempotencyKey('parser-transaction');
      if (result.intent === 'create_expense') {
        const preview = await edgeApi.parserFinancePreview(accountId, amount, 'EXPENSE');
        if (preview.protected_shortfall > 0) {
          await new Promise<void>((resolve, reject) => Alert.alert('Dana terlindungi akan terpakai', `${formatCurrency(preview.protected_shortfall)} akan dilepas:\n${preview.recovery_impacts.map((impact) => `${impact.name}: ${formatCurrency(impact.amount)}`).join('\n')}`, [{ text: 'Batal', style: 'cancel', onPress: () => reject(new Error('Dibatalkan.')) }, { text: 'Gunakan dana terlindungi', style: 'destructive', onPress: () => { void edgeApi.createParserExpense({ account_id: accountId, amount, category_name: categoryName, description, override_protected: true }, key).then(() => resolve(), reject); } }]));
        } else await edgeApi.createParserExpense({ account_id: accountId, amount, category_name: categoryName, description, override_protected: false }, key);
      } else {
        router.push({ pathname: '/income-allocation', params: { amount: String(amount), accountId, category: categoryName ?? '', description: description ?? '', salary: categoryName?.toLocaleLowerCase('id').includes('gaji') ? '1' : '0' } });
        return;
      }
    } else if (result.intent === 'transfer_account') {
      if (!sourceAccountId || !destinationAccountId || typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) throw new Error('Akun sumber, tujuan, dan nominal valid wajib diisi.');
      await edgeApi.transferAccount(sourceAccountId, destinationAccountId, amount, description);
    } else if (result.intent === 'create_account') {
      if (!accountName) throw new Error('Nama akun wajib diisi.');
      await edgeApi.createAccount({ name: accountName, kind: accountKind, opening_balance: newBalance ?? 0 }, idempotencyKey('parser-account'));
    } else if (result.intent === 'create_goal') {
      if (!goalName || typeof amount !== 'number' || !Number.isSafeInteger(amount) || amount <= 0) throw new Error('Nama dan target tabungan wajib diisi.');
      router.push({ pathname: '/savings-setup', params: { name: goalName, amount: String(amount) } });
      return;
    } else if (result.intent === 'create_debt') {
      if (!debtName || !amount) throw new Error('Nama dan nominal utang wajib diisi.');
      await edgeApi.createDebt({ name: debtName, total_amount: amount, tenor_months: 1, paid_installments: 0, start_date: new Date().toISOString().slice(0, 10) }, idempotencyKey('parser-debt'));
    } else throw new Error('Aksi ini perlu dibuka dari detail agar targetnya tidak salah.');
    await loadHome();
  };

  const openTab = (tab: NavTab) => {
    setActiveTab(tab);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <KeyboardAwareScrollView
            enableOnAndroid
            enableAutomaticScroll
            extraHeight={Platform.OS === 'ios' ? 24 : 90}
            extraScrollHeight={Platform.OS === 'ios' ? 24 : 90}
            keyboardOpeningTime={0}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadHome(true)} colors={[theme.accent]} tintColor={theme.deepTeal} progressBackgroundColor={theme.cardBackground} />}
          >
            <DashboardHeader
              userName={profile?.full_name ?? ''}
              hasUnreadNotifications={unreadCount > 0}
              onNotificationPress={() => router.push('/notifications' as Href)}
              onProfilePress={() => setActiveTab('profile')}
            />
            {homeError ? <View style={styles.homeError}><Text style={{ color: theme.expense }}>{homeError}</Text><Button title="Coba lagi" size="small" variant="outline" onPress={() => void loadHome()} /></View> : null}
            {homeLoading ? <View style={styles.homeLoading}><ActivityIndicator color={theme.primary} /><Text style={{ color: theme.textMuted }}>Menyiapkan ringkasan keuangan…</Text></View> : <View style={styles.homeWidgets}>
            <SavingsBalanceSection
              totalBalance={balances?.gross_balance ?? summary?.total_balance ?? 0}
              protectedBalance={balances?.protected_balance ?? 0}
              freeBalance={balances?.free_balance ?? 0}
              monthlyIncomeChange={summary?.total_income_month ?? 0}
              monthlyExpense={summary?.total_expense_month ?? 0}
              remainingDebt={summary?.remaining_debt ?? 0}
              safeToSpend={budget?.totals.safe_to_spend ?? 0}
              budgetTarget={budget?.totals.remaining_flexible ?? 0}
              percentChange={summary?.percentage_change ?? 0}
              valuesVisible={homeValuesVisible}
              onToggleValues={() => setHomeValuesVisible((visible) => !visible)}
            />
            <AiInputBar valuesVisible={homeValuesVisible} onConfirmPreview={confirmTransaction} />
            <HomeCompactPanel income={summary?.total_income_month} expense={summary?.total_expense_month} debt={summary?.remaining_debt} safeToSpend={budget?.totals.safe_to_spend} dailySafeLimit={budget?.totals.daily_safe_limit} valuesVisible={homeValuesVisible} />
            </View>}
          </KeyboardAwareScrollView>
        );
      case 'manage':
        return <ManageScreen />;
      case 'analytics':
        return <AnalyticsScreen />;
      case 'profile':
        return <ProfileScreen />;
    }
  };

  return (
    <ScreenWrapper withSafeArea style={{ backgroundColor: theme.surfaceHighlight }}>
      <View style={styles.container}>
        {renderContent()}
        <FloatingGlassNav
          activeTab={activeTab}
          onTabChange={openTab}
          onScanPress={() => router.push('/scan')}
        />
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, position: 'relative' },
  scrollContent: { paddingBottom: 120 },
  homeWidgets: { gap: 12 },
  homeLoading: { minHeight: 220, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 20 },
  homeError: { marginHorizontal: 20, paddingVertical: 12, gap: 10, alignItems: 'flex-start' },
  placeholderCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, gap: 8 },
  placeholderTitle: { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  placeholderSub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
