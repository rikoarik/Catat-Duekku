import { TouchableOpacity, View, StyleSheet, useColorScheme } from 'react-native';
import { ArrowLeft } from 'iconsax-react-native';
import { router, useLocalSearchParams } from 'expo-router';

import { ScreenWrapper } from '@/components/common/screen-wrapper';
import { Text } from '@/components/ui/text';
import { getTheme } from '@/core/theme/colors';
import { ManageScreen, type ManageSection } from '@/features/manage/screens/manage-screen';

export default function ManageSectionPage() {
  const { section } = useLocalSearchParams<{ section: ManageSection }>();
  const theme = getTheme(useColorScheme());
  return (
    <ScreenWrapper withSafeArea style={{ backgroundColor: theme.surfaceHighlight }}>
      <View style={styles.header}>
        <TouchableOpacity accessibilityLabel="Kembali" style={[styles.back, { borderColor: theme.border }]} onPress={() => router.back()}><ArrowLeft color={theme.textPrimary} size={22} /></TouchableOpacity>
        <Text style={[styles.title, { color: theme.textPrimary }]} weight="bold">Pengaturan</Text>
      </View>
      <ManageScreen settingsSection={section} />
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingTop: 8 },
  back: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22 },
});
