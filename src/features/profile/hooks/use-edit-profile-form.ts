import { useEffect, useState } from 'react';
import { router } from 'expo-router';

import { t } from '@/core/i18n/strings';
import { edgeApi } from '@/core/lib/edge-api';

interface StatusModalState {
  visible: boolean;
  type: 'success' | 'error';
  title: string;
  message: string;
  onConfirm: () => void;
}

const initialStatusModal: StatusModalState = {
  visible: false,
  type: 'success',
  title: '',
  message: '',
  onConfirm: () => {},
};

export function useEditProfileForm() {
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [version, setVersion] = useState(0);
  const [statusModal, setStatusModal] = useState<StatusModalState>(initialStatusModal);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data } = await edgeApi.getProfile();
        setFullName(data.full_name);
        setEmail(data.email);
        setVersion(data.version);
      } catch (error) {
        console.error('Error fetching user for edit:', error);
      } finally {
        setFetching(false);
      }
    };

    fetchUser();
  }, []);

  const closeStatusModal = () => setStatusModal((current) => ({ ...current, visible: false }));

  const handleSave = async () => {
    if (!fullName.trim()) {
      setStatusModal({
        visible: true,
        type: 'error',
        title: t('profile.editInputIncompleteTitle'),
        message: t('profile.editInputIncompleteMessage'),
        onConfirm: closeStatusModal,
      });
      return;
    }

    setLoading(true);

    try {
      const { data } = await edgeApi.updateProfile({ full_name: fullName.trim() }, version);
      setVersion(data.version);
      setStatusModal({
        visible: true,
        type: 'success',
        title: t('profile.editSuccessTitle'),
        message: t('profile.editSuccessMessage'),
        onConfirm: () => {
          closeStatusModal();
          router.back();
        },
      });
    } catch (error: any) {
      setStatusModal({
        visible: true,
        type: 'error',
        title: t('auth.genericErrorTitle'),
        message: error.message || t('profile.genericError'),
        onConfirm: closeStatusModal,
      });
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    fetching,
    fullName,
    email,
    statusModal,
    setFullName,
    handleSave,
  };
}
