import { Text } from '@/components/ui/text';
import { useState } from 'react';
import { StyleSheet, ScrollView, View, useColorScheme } from 'react-native';

import { ScreenWrapper } from '@/components/common/screen-wrapper';
import { FloatingGlassNav, NavTab } from '@/components/navigation/floating-glass-nav';
import { DashboardHeader } from '@/features/dashboard/components/dashboard-header';
import { SavingsBalanceSection } from '@/features/dashboard/components/savings-balance-section';
import { AiInputBar } from '@/features/dashboard/components/ai-input-bar';
import { HomeCompactPanel } from '@/features/dashboard/components/home-compact-panel';
import { getTheme } from '@/core/theme/colors';
import { ManageScreen, type ManageSection } from '@/features/manage/screens/manage-screen';
import { BudgetScreen } from '@/features/budget/screens/budget-screen';
import { DebtsScreen } from '@/features/debts/screens/debts-screen';
import { WalletsScreen } from '@/features/wallets/screens/wallets-screen';
import { AnalyticsScreen } from '@/features/analytics/screens/analytics-screen';
import { SavingsScreen } from '@/features/savings/screens/savings-screen';
import { CategoriesScreen } from '@/features/categories/screens/categories-screen';

type OpenManageSection = ManageSection | 'hub';

export default function MainPage() {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [manageSection, setManageSection] = useState<OpenManageSection>('hub');

  const openTab = (tab: NavTab) => {
    setActiveTab(tab);
    if (tab === 'manage') setManageSection('hub');
  };

  const renderManageContent = () => {
    if (manageSection === 'hub') {
      return <ManageScreen onOpen={setManageSection} />;
    }

    const onBack = () => setManageSection('hub');
    switch (manageSection) {
      case 'accounts':
        return <WalletsScreen />;
      case 'budget':
        return <BudgetScreen />;
      case 'savings':
        return <SavingsScreen onBack={onBack} />;
      case 'debts':
        return <DebtsScreen />;
      case 'categories':
        return <CategoriesScreen onBack={onBack} />;
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            <DashboardHeader userName="Budi Pratama" />
            <SavingsBalanceSection />
            <AiInputBar />
            <HomeCompactPanel />
          </ScrollView>
        );
      case 'manage':
        return renderManageContent();
      case 'analytics':
        return <AnalyticsScreen />;
      case 'profile':
        return (
          <View style={styles.placeholderCenter}>
            <Text style={[styles.placeholderTitle, { color: theme.textPrimary }]}>Profil</Text>
            <Text style={[styles.placeholderSub, { color: theme.textMuted }]}>Pengaturan akun akan tersedia di sini.</Text>
          </View>
        );
    }
  };

  return (
    <ScreenWrapper withSafeArea style={{ backgroundColor: theme.surfaceHighlight }}>
      <View style={styles.container}>
        {renderContent()}
        <FloatingGlassNav activeTab={activeTab} onTabChange={openTab} />
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
