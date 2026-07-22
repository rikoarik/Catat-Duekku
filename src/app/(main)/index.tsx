import { Text } from '@/components/ui/text';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, View, useColorScheme } from 'react-native';

import { ScreenWrapper } from '@/components/common/screen-wrapper';
import { FloatingGlassNav, NavTab } from '@/components/navigation/floating-glass-nav';
import { edgeApi, idempotencyKey, type Profile, type Summary } from '@/core/lib/edge-api';
import type { ParseResult } from '@/core/lib/transaction-parser';
import { getTheme } from '@/core/theme/colors';
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
  const [homeError, setHomeError] = useState('');

  const [unreadCount, setUnreadCount] = useState(0);
  const loadSummary = async () => setSummary((await edgeApi.summary()).data);

  useEffect(() => {
    Promise.all([edgeApi.getProfile(), edgeApi.summary(), edgeApi.notifications()]).then(([profileResult, summaryResult, notificationResult]) => {
      setProfile(profileResult.data);
      setSummary(summaryResult.data);
      setUnreadCount(notificationResult.data.unread_count);
    }).catch((error) => setHomeError(error instanceof Error ? error.message : 'Gagal memuat beranda.'));
  }, []);

  const confirmTransaction = async (result: ParseResult) => {
    if (result.intent !== 'create_income' && result.intent !== 'create_expense') throw new Error('Aksi ini belum didukung.');
    const { amount, accountId, categoryName, description } = result.fields;
    if (!accountId || typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) throw new Error('Akun dan nominal valid wajib diisi.');
    await edgeApi.createTransaction({ type: result.intent === 'create_income' ? 'INCOME' : 'EXPENSE', amount, account_id: accountId, category_name: categoryName, description, source: 'PARSER' }, idempotencyKey('parser-transaction'));
    await loadSummary();
  };

  const openTab = (tab: NavTab) => {
    setActiveTab(tab);
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {!profile && !homeError ? <ActivityIndicator color={theme.primary} /> : null}
            {homeError ? <Text style={{ color: theme.expense, paddingHorizontal: 20 }}>{homeError}</Text> : null}
            <DashboardHeader
              userName={profile?.full_name ?? ''}
              hasUnreadNotifications={unreadCount > 0}
              onNotificationPress={() => router.push('/notifications' as Href)}
              onProfilePress={() => setActiveTab('profile')}
            />
            <SavingsBalanceSection
              totalBalance={summary?.total_balance ?? 0}
              monthlyIncomeChange={summary?.total_income_month ?? 0}
              monthlyExpense={summary?.total_expense_month ?? 0}
              remainingDebt={summary?.remaining_debt ?? 0}
              percentChange={summary?.percentage_change ?? 0}
            />
            <AiInputBar onConfirmPreview={confirmTransaction} />
            <HomeCompactPanel income={summary?.total_income_month} expense={summary?.total_expense_month} debt={summary?.remaining_debt} />
          </ScrollView>
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
  scrollContent: { paddingBottom: 28 },
  placeholderCenter: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32, gap: 8 },
  placeholderTitle: { fontSize: 22, fontWeight: '800', textAlign: 'center' },
  placeholderSub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
});
