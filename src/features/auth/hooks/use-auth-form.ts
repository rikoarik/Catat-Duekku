import { useState } from 'react';
import * as WebBrowser from 'expo-web-browser';

import { t } from '@/core/i18n/strings';
import { supabase } from '@/core/lib/supabase';

interface UseAuthFormOptions {
  initialMode?: 'login' | 'register';
  onAuthSuccess?: () => void;
  onRegisterSuccess?: () => void;
}

interface StatusModalState {
  visible: boolean;
  type: 'success' | 'error';
  title: string;
  message: string;
  buttonText?: string;
  onConfirm: () => void;
}

const initialModalState: StatusModalState = {
  visible: false,
  type: 'success',
  title: '',
  message: '',
  onConfirm: () => {},
};

export function useAuthForm({
  initialMode = 'login',
  onAuthSuccess,
  onRegisterSuccess,
}: UseAuthFormOptions) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [modalState, setModalState] = useState<StatusModalState>(initialModalState);

  const closeModal = () => setModalState((current) => ({ ...current, visible: false }));

  const triggerModal = (
    type: 'success' | 'error',
    title: string,
    message: string,
    buttonText: string = t('common.continue'),
    onConfirmCallback?: () => void
  ) => {
    setModalState({
      visible: true,
      type,
      title,
      message,
      buttonText,
      onConfirm: () => {
        closeModal();
        onConfirmCallback?.();
      },
    });
  };

  const handleGoogleSignIn = async () => {
    const redirectTo = 'catatduekku://auth';
    setGoogleLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo, skipBrowserRedirect: true },
      });
      if (error) throw error;
      if (!data.url) throw new Error(t('auth.googleMissingUrl'));

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
      if (result.type !== 'success') return;

      const callbackUrl = new URL(result.url);
      const query = callbackUrl.searchParams;
      const fragment = new URLSearchParams(callbackUrl.hash.replace(/^#/, ''));
      const authError = query.get('error_description') || fragment.get('error_description');
      if (authError) throw new Error(authError);

      const code = query.get('code');
      const accessToken = fragment.get('access_token') || query.get('access_token');
      const refreshToken = fragment.get('refresh_token') || query.get('refresh_token');
      if (code) {
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
        if (exchangeError) throw exchangeError;
      } else if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (sessionError) throw sessionError;
      } else {
        throw new Error(t('auth.googleInvalidCallback'));
      }

      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) throw sessionError;
      if (!sessionData.session) throw new Error(t('auth.googleNoSession'));
      triggerModal('success', t('auth.loginSuccessTitle'), t('auth.loginSuccessMessage'), t('auth.enterApp'), onAuthSuccess);
    } catch (error) {
      triggerModal('error', t('auth.googleFailedTitle'), error instanceof Error ? error.message : t('auth.genericErrorMessage'), t('common.tryAgain'));
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleAction = async () => {
    if (!email.trim() || !password) {
      triggerModal(
        'error',
        t('auth.inputIncompleteTitle'),
        t('auth.inputIncompleteLogin'),
        t('common.tryAgain')
      );
      return;
    }

    if (mode === 'register' && !name.trim()) {
      triggerModal(
        'error',
        t('auth.inputIncompleteTitle'),
        t('auth.inputIncompleteRegister'),
        t('common.tryAgain')
      );
      return;
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          triggerModal(
            'error',
            t('auth.loginFailedTitle'),
            error.message || t('auth.loginFailedMessage'),
            t('common.tryAgain')
          );
          return;
        }

        if (data.session) {
          triggerModal(
            'success',
            t('auth.loginSuccessTitle'),
            t('auth.loginSuccessMessage'),
            t('auth.enterApp'),
            onAuthSuccess
          );
        }

        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: 'https://web-auth-seven.vercel.app/auth/callback',
          data: {
            full_name: name.trim(),
          },
        },
      });

      if (error) {
        triggerModal(
          'error',
          t('auth.registerFailedTitle'),
          error.message || t('auth.registerFailedMessage'),
          t('common.tryAgain')
        );
        return;
      }

      if (!data.session) {
        triggerModal(
          'success',
          'Periksa Email Anda',
          'Konfirmasi alamat email melalui tautan yang kami kirim, lalu masuk ke aplikasi.',
          'Kembali ke Login',
          () => setMode('login')
        );
        return;
      }

      triggerModal(
        'success',
        t('auth.registerSuccessTitle'),
        t('auth.registerSuccessMessage'),
        t('common.continue'),
        onRegisterSuccess || onAuthSuccess
      );
    } catch (error: any) {
      triggerModal(
        'error',
        t('auth.genericErrorTitle'),
        error.message || t('auth.genericErrorMessage'),
        t('common.understand')
      );
    } finally {
      setLoading(false);
    }
  };

  return {
    mode,
    setMode,
    name,
    email,
    password,
    loading,
    googleLoading,
    modalState,
    setName,
    setEmail,
    setPassword,
    closeModal,
    handleAction,
    handleGoogleSignIn,
  };
}
