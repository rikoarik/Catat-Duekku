import { useEffect } from 'react';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { router, type Href } from 'expo-router';

import { edgeApi } from '@/core/lib/edge-api';
import { supabase } from '@/core/lib/supabase';

let currentToken: string | null = null;
let handlerConfigured = false;

const supportsRemotePush = () => Platform.OS !== 'web' && Constants.appOwnership !== 'expo' && Device.isDevice;

async function notificationsModule() {
  if (!supportsRemotePush()) return null;
  const Notifications = await import('expo-notifications');
  if (!handlerConfigured) {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
    handlerConfigured = true;
  }
  return Notifications;
}

export async function requestPushPermission() {
  const Notifications = await notificationsModule();
  if (!Notifications) return false;
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  const permission = await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: true, allowSound: true } });
  return permission.granted;
}

export async function registerCurrentPushToken() {
  const Notifications = await notificationsModule();
  if (!Notifications) return null;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('keuangan', {
      name: 'Pengingat Keuangan',
      description: 'Pengingat budget, cicilan, transaksi, dan insight keuangan.',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#B7E36D',
    });
  }
  const existing = await Notifications.getPermissionsAsync();
  const permission = existing.granted ? existing : await Notifications.requestPermissionsAsync({ ios: { allowAlert: true, allowBadge: true, allowSound: true } });
  if (!permission.granted) return null;
  const projectId = Constants.easConfig?.projectId ?? Constants.expoConfig?.extra?.eas?.projectId;
  if (typeof projectId !== 'string' || !projectId) return null;
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  await edgeApi.registerPushToken(token, Platform.OS as 'android' | 'ios');
  currentToken = token;
  return token;
}

export async function unregisterCurrentPushToken() {
  if (!currentToken) return;
  try {
    await edgeApi.unregisterPushToken(currentToken);
  } finally {
    currentToken = null;
  }
}

function openNotification(notification: { request: { content: { data?: Record<string, unknown> } } }) {
  const url = notification.request.content.data?.url;
  if (typeof url === 'string' && url.startsWith('/')) router.push(url as Href);
}

export function usePushNotifications() {
  useEffect(() => {
    if (!supportsRemotePush()) return;
    let active = true;
    let cleanup = () => {};
    const setup = async () => {
      const Notifications = await notificationsModule();
      if (!Notifications || !active) return;
      const register = () => registerCurrentPushToken().catch(() => null);
      const { data } = await supabase.auth.getSession();
      if (data.session) register();
      const auth = supabase.auth.onAuthStateChange((event, session) => {
        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session) register();
        if (event === 'SIGNED_OUT') currentToken = null;
      });
      const response = Notifications.getLastNotificationResponse();
      if (response?.notification) openNotification(response.notification);
      const responseSubscription = Notifications.addNotificationResponseReceivedListener((value) => openNotification(value.notification));
      const tokenSubscription = Notifications.addPushTokenListener(() => register());
      cleanup = () => {
        auth.data.subscription.unsubscribe();
        responseSubscription.remove();
        tokenSubscription.remove();
      };
    };
    setup().catch(() => {});
    return () => {
      active = false;
      cleanup();
    };
  }, []);
}
