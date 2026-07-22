import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

import { supabase } from '@/core/lib/supabase';

const PIN_HASH_KEY = '@catat_duekku/pin_hash';
const BIOMETRIC_KEY = '@catat_duekku/biometric_enabled';

async function currentUserId(): Promise<string> {
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (!session?.user.id) throw new Error('Sesi autentikasi tidak tersedia.');
  return session.user.id;
}

async function userKey(key: string): Promise<string> {
  return `${key}:${await currentUserId()}`;
}

async function hashPin(pin: string): Promise<string> {
  if (!/^\d{6}$/.test(pin)) throw new Error('PIN harus terdiri dari 6 digit.');
  return Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, pin);
}

export async function savePin(pin: string): Promise<void> {
  const key = await userKey(PIN_HASH_KEY);
  await AsyncStorage.setItem(key, await hashPin(pin));
}

export async function verifyPin(pin: string): Promise<boolean> {
  const key = await userKey(PIN_HASH_KEY);
  const [storedHash, inputHash] = await Promise.all([
    AsyncStorage.getItem(key),
    hashPin(pin),
  ]);
  return storedHash !== null && storedHash === inputHash;
}

export async function hasPin(): Promise<boolean> {
  const hash = await AsyncStorage.getItem(await userKey(PIN_HASH_KEY));
  return Boolean(hash);
}

export async function clearPin(): Promise<void> {
  await AsyncStorage.removeItem(await userKey(PIN_HASH_KEY));
}

export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  await AsyncStorage.setItem(await userKey(BIOMETRIC_KEY), enabled ? '1' : '0');
}

export async function isBiometricEnabled(): Promise<boolean> {
  return await AsyncStorage.getItem(await userKey(BIOMETRIC_KEY)) === '1';
}
