import { Text } from '@/components/ui/text';
import React from 'react';
import { StyleSheet, View, TouchableOpacity, useColorScheme } from 'react-native';
;
import { Notification } from 'iconsax-react-native';
import { t } from '@/core/i18n/strings';
import { getTheme } from '@/core/theme/colors';

interface DashboardHeaderProps {
  userName?: string;
  onNotificationPress?: () => void;
  onProfilePress?: () => void;
}

export function DashboardHeader({
  userName = t('dashboard.fallbackUserName'),
  onNotificationPress,
  onProfilePress,
}: DashboardHeaderProps) {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);

  const getInitial = (name: string) => {
    return name.trim().charAt(0).toUpperCase() || 'U';
  };

  return (
    <View style={styles.container}>
      {/* Top Bar: Left Profile Avatar + Greeting Text Inline, Right Notification */}
      <View style={styles.topBar}>
        {/* Left Side: Avatar + Text "Halo Budi, Selamat Datang!" */}
        <View style={styles.profileGreetingGroup}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={[styles.avatarBtn, { backgroundColor: theme.primary }]}
            onPress={onProfilePress}>
            <Text style={styles.avatarText}>{getInitial(userName)}</Text>
          </TouchableOpacity>

          <View style={styles.greetingTextWrapper}>
            <Text style={[styles.subGreeting, { color: theme.textMuted }]}>
              {t('dashboard.greetingHello')} {userName.split(' ')[0]} 👋
            </Text>
            <Text style={[styles.mainTitle, { color: theme.textPrimary }]}>
              {t('dashboard.greetingWelcome')}
            </Text>
          </View>
        </View>

        {/* Right Side: Notification Bell */}
        <TouchableOpacity
          activeOpacity={0.75}
          style={[
            styles.circleBtn,
            { backgroundColor: colorScheme === 'dark' ? theme.surfaceMuted : theme.surfaceButton },
          ]}
          onPress={onNotificationPress}>
          <Notification color={theme.textPrimary} size={20} variant="Outline" />
          <View style={[styles.badge, { backgroundColor: theme.expense }]} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileGreetingGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatarBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: getTheme('light').onSurfaceStrong,
    fontSize: 18,
    fontWeight: '700',
  },
  greetingTextWrapper: {
    gap: 2,
    flex: 1,
  },
  subGreeting: {
    fontSize: 12,
    fontWeight: '600',
  },
  mainTitle: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.4,
  },
  circleBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  badge: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
