import { getTheme } from '@/core/theme/colors';
import * as Haptics from 'expo-haptics';
import { Chart2, Home3, Profile, Scan, Setting2 } from 'iconsax-react-native';
import { useEffect } from 'react';
import {
  Platform,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';

export type NavTab = 'home' | 'manage' | 'analytics' | 'profile';

interface FloatingGlassNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onScanPress?: () => void;
}

const TABS: NavTab[] = ['home', 'manage', 'analytics', 'profile'];
const TAB_SLOT_WIDTH = 64;

export function FloatingGlassNav({
  activeTab,
  onTabChange,
  onScanPress,
}: FloatingGlassNavProps) {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);

  const activeIndex = TABS.indexOf(activeTab);

  const translateX = useSharedValue(activeIndex * TAB_SLOT_WIDTH);
  const indicatorScale = useSharedValue(1);

  useEffect(() => {
    indicatorScale.value = withSequence(
      withSpring(1.15, { damping: 10, stiffness: 300 }),
      withSpring(1, { damping: 14, stiffness: 200 })
    );

    translateX.value = withSpring(activeIndex * TAB_SLOT_WIDTH, {
      damping: 18,
      stiffness: 180,
      mass: 0.8,
    });
  }, [activeIndex]);

  const indicatorAnimStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { scale: indicatorScale.value },
    ],
  }));

  const handleScanPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onScanPress?.();
  };

  return (
    <View pointerEvents="box-none" style={styles.container}>
      <View style={styles.floatingRow}>
        {/* Navigation Bar Glass Pill */}
        <View style={styles.shadowWrapper}>
          <View
            style={[
              styles.navPill,
              {
                backgroundColor: theme.deepTeal,
                borderColor: theme.border,
              },
            ]}>
            {/* Sliding Indicator Circle */}
            <Animated.View
              style={[
                styles.slidingIndicator,
                { backgroundColor: theme.softLime },
                indicatorAnimStyle,
              ]}
            />

            {/* Tab 1: Home */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.tabItem}
              onPress={() => onTabChange('home')}>
              <Home3
                color={activeTab === 'home' ? theme.deepTeal : theme.onSurfaceStrong}
                size={24}
                variant={activeTab === 'home' ? 'Bold' : 'Outline'}
              />
            </TouchableOpacity>

            {/* Tab 2: Kelola */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.tabItem}
              onPress={() => onTabChange('manage')}>
              <Setting2
                color={activeTab === 'manage' ? theme.deepTeal : theme.onSurfaceStrong}
                size={24}
                variant={activeTab === 'manage' ? 'Bold' : 'Outline'}
              />
            </TouchableOpacity>

            {/* Tab 3: Analytics */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.tabItem}
              onPress={() => onTabChange('analytics')}>
              <Chart2
                color={activeTab === 'analytics' ? theme.deepTeal : theme.onSurfaceStrong}
                size={24}
                variant={activeTab === 'analytics' ? 'Bold' : 'Outline'}
              />
            </TouchableOpacity>

            {/* Tab 4: Profile */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.tabItem}
              onPress={() => onTabChange('profile')}>
              <Profile
                color={activeTab === 'profile' ? theme.deepTeal : theme.onSurfaceStrong}
                size={24}
                variant={activeTab === 'profile' ? 'Bold' : 'Outline'}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Floating Scan Button (Di Sebelah Kanan Nav) */}
        <TouchableOpacity
          activeOpacity={0.85}
          style={[
            styles.scanButton,
            {
              backgroundColor: theme.primary,
              borderColor: theme.border,
            },
          ]}
          onPress={handleScanPress}>
          <Scan
            color={theme.onPrimary}
            size={34}
            variant="Linear"
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 16,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 99,
  },
  floatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  shadowWrapper: {
    borderRadius: 34,
  },
  navPill: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 269,
    height: 70,
    borderRadius: 34,
    paddingHorizontal: 5,
    position: 'relative',
  },
  slidingIndicator: {
    position: 'absolute',
    left: 12,
    width: 50,
    height: 50,
    borderRadius: 99999,
    shadowColor: '#A3E635',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
  },
  tabItem: {
    width: 64,
    height: 68,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  scanButton: {
    width: 74,
    height: 74,
    borderRadius: 99999,
    justifyContent: 'center',
    alignItems: 'center'
  },
});