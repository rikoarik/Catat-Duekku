import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import * as LocalAuthentication from 'expo-local-authentication';

import { edgeApi, type Profile } from '@/core/lib/edge-api';
import {
  clearPin,
  hasPin,
  isBiometricEnabled,
  setBiometricEnabled,
} from '@/core/lib/pin-storage';
import { supabase } from '@/core/lib/supabase';
import { unregisterCurrentPushToken } from '@/core/lib/push-notifications';
import { t } from '@/core/i18n/strings';
import { getLocalTimezone } from '@/features/profile/lib/profile-formatters';

interface StatusModalState {
  visible: boolean;
  type: 'success' | 'error';
  title: string;
  message: string;
}

type ConfirmationAction = 'disablePin' | 'setupPin' | 'resetData' | 'logout';

interface ConfirmationState {
  action: ConfirmationAction | null;
  title: string;
  message: string;
  confirmLabel: string;
  destructive: boolean;
  busy: boolean;
  error?: string;
}

const initialStatusModal: StatusModalState = {
  visible: false,
  type: 'success',
  title: '',
  message: '',
};

const initialConfirmation: ConfirmationState = {
  action: null,
  title: '',
  message: '',
  confirmLabel: '',
  destructive: false,
  busy: false,
};

export function useProfileSettings() {
  const [user, setUser] = useState<Profile | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [pinSet, setPinSet] = useState(false);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  const [biometricsEnabled, setBiometricsEnabledState] = useState(false);
  const [statusModal, setStatusModal] = useState<StatusModalState>(initialStatusModal);
  const [confirmation, setConfirmation] = useState<ConfirmationState>(initialConfirmation);

  useEffect(() => {
    const fetchState = async () => {
      try {
        const [{ data }, activePin, hardware, enrolled] = await Promise.all([
          edgeApi.getProfile(),
          hasPin(),
          LocalAuthentication.hasHardwareAsync(),
          LocalAuthentication.isEnrolledAsync(),
        ]);

        setUser(data);
        setPinSet(activePin);

        const isBiometricReady = hardware && enrolled;
        setBiometricsAvailable(isBiometricReady);

        if (isBiometricReady) {
          setBiometricsEnabledState(await isBiometricEnabled());
        }
      } catch (error) {
        console.error('Gagal mengambil pengaturan profil:', error);
      } finally {
        setLoadingUser(false);
      }
    };

    fetchState();
  }, []);

  const closeStatusModal = () => setStatusModal((current) => ({ ...current, visible: false }));
  const closeConfirmation = () => {
    if (!confirmation.busy) setConfirmation(initialConfirmation);
  };

  const showStatus = (type: 'success' | 'error', title: string, message: string) => {
    setStatusModal({ visible: true, type, title, message });
  };

  const requestConfirmation = (
    action: ConfirmationAction,
    title: string,
    message: string,
    confirmLabel: string,
    destructive = false
  ) => setConfirmation({ action, title, message, confirmLabel, destructive, busy: false });

  const handlePinToggle = (value: boolean) => {
    if (value) {
      router.push('/setup-pin');
      return;
    }

    requestConfirmation(
      'disablePin',
      t('profile.disablePinTitle'),
      t('profile.disablePinMessage'),
      t('profile.disablePinConfirm'),
      true
    );
  };

  const handleBiometricToggle = async (value: boolean) => {
    if (!pinSet && value) {
      requestConfirmation(
        'setupPin',
        t('profile.pinRequiredTitle'),
        t('profile.pinRequiredMessage'),
        t('profile.setupPinNow')
      );
      return;
    }

    if (value) {
      try {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: t('profile.biometricPrompt'),
          cancelLabel: t('common.cancel'),
          disableDeviceFallback: false,
        });

        if (result.success) {
          await setBiometricEnabled(true);
          setBiometricsEnabledState(true);
          showStatus(
            'success',
            t('profile.biometricEnabledTitle'),
            t('profile.biometricEnabledMessage')
          );
        }
      } catch (error) {
        console.error('Error enabling biometrics:', error);
      }
      return;
    }

    await setBiometricEnabled(false);
    setBiometricsEnabledState(false);
  };

  const handleResetData = () => requestConfirmation(
    'resetData',
    t('profile.resetDataTitle'),
    t('profile.resetDataMessage'),
    t('profile.resetDataConfirm'),
    true
  );

  const handleLogout = () => requestConfirmation(
    'logout',
    t('profile.logoutTitle'),
    t('profile.logoutMessage'),
    t('profile.logoutConfirm'),
    true
  );

  const confirmAction = async () => {
    const action = confirmation.action;
    if (!action || confirmation.busy) return;
    if (action === 'setupPin') {
      setConfirmation(initialConfirmation);
      router.push('/setup-pin');
      return;
    }

    setConfirmation((current) => ({ ...current, busy: true, error: undefined }));
    try {
      if (action === 'disablePin') {
        await clearPin();
        await setBiometricEnabled(false);
        setPinSet(false);
        setBiometricsEnabledState(false);
        setConfirmation(initialConfirmation);
        showStatus('success', t('profile.pinDisabledTitle'), t('profile.pinDisabledMessage'));
      } else if (action === 'resetData') {
        await edgeApi.reset();
        setConfirmation(initialConfirmation);
        showStatus('success', t('profile.dataResetTitle'), t('profile.dataResetMessage'));
      } else {
        await unregisterCurrentPushToken().catch(() => {});
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        setConfirmation(initialConfirmation);
        router.replace('/auth');
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : t('profile.genericError');
      setConfirmation((current) => ({ ...current, busy: false, error: message }));
    }
  };

  return {
    user,
    loadingUser,
    pinSet,
    biometricsAvailable,
    biometricsEnabled,
    statusModal,
    confirmation,
    localTimezone: getLocalTimezone(),
    closeStatusModal,
    closeConfirmation,
    confirmAction,
    handlePinToggle,
    handleBiometricToggle,
    handleResetData,
    handleLogout,
  };
}
