import { useEffect, useState } from 'react';
import { router } from 'expo-router';

import { hasCompletedOnboarding } from '@/core/lib/onboarding-storage';
import { hasPin } from '@/core/lib/pin-storage';
import { supabase } from '@/core/lib/supabase';

export function useAuthGate() {
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const checkSession = async () => {
      const completedOnboarding = await hasCompletedOnboarding();

      if (!completedOnboarding) {
        router.replace('/onboarding' as any);
        if (isMounted) {
          setIsChecking(false);
        }
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace('/auth');
      } else if (await hasPin()) {
        router.replace('/pin-lock');
      } else {
        router.replace('/setup-pin');
      }

      if (isMounted) {
        setIsChecking(false);
      }
    };

    checkSession();

    return () => {
      isMounted = false;
    };
  }, []);

  return { isChecking };
}
