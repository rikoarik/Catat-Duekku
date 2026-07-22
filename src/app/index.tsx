import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, useColorScheme } from 'react-native';
import { router } from 'expo-router';
import { supabase } from '@/core/lib/supabase';
import { hasPin } from '@/core/lib/pin-storage';
import { getTheme } from '@/core/theme/colors';

/**
 * Auth Gate — runs on every cold start:
 *  - No session            → /auth
 *  - Session + PIN set     → /pin-lock  (Option A: biometric/PIN unlock)
 *  - Session + no PIN yet  → /setup-pin (edge case: first-time not yet completed)
 */
export default function IndexPage() {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.replace('/auth');
      } else {
        const pinSet = await hasPin();
        if (pinSet) {
          router.replace('/pin-lock');
        } else {
          router.replace('/setup-pin');
        }
      }

      setReady(true);
    })();
  }, []);

  // While checking, show a full-screen spinner
  return (
    <View style={{ flex: 1, backgroundColor: '#FFFFFF', justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator color={theme.primary} size="large" />
    </View>
  );
}
