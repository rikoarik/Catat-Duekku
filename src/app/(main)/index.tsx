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
import { ManageScreen } from '@/features/manage/screens/manage-screen';
import { AnalyticsScreen } from '@/features/analytics/screens/analytics-screen';
import { ProfileScreen } from '@/features/profile/screens/profile-screen';
import { router } from 'expo-router';

export default function MainPage() {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);
  const [activeTab, setActiveTab] = useState<NavTab>('home');

  const openTab = (tab: NavTab) => {
    setActiveTab(tab);
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
