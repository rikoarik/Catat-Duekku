import React from 'react';
import { View, ActivityIndicator, useColorScheme } from 'react-native';

import { getTheme } from '@/core/theme/colors';
import { useAuthGate } from '@/features/auth/hooks/use-auth-gate';

/**
 * Auth Gate — runs on every cold start:
 *  - No session            → /auth
 *  - Session + PIN set     → /pin-lock
 *  - Session + no PIN yet  → /setup-pin
 */
export default function IndexPage() {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);
  const { isChecking } = useAuthGate();

  if (!isChecking) {
    return null;
  }

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.background,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <ActivityIndicator color={theme.primary} size="large" />
    </View>
  );
}
