/**
 * PIN & Biometric Security Storage
 *
 * Strategy:
 * - PIN is hashed with SHA-256 before storage. Plaintext never leaves the device.
 * - Hashed PIN + biometric preference are saved to:
 *   1. Supabase user_metadata (source of truth, works across reinstalls)
 *   2. AsyncStorage (local cache, offline fallback)
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { supabase } from '@/core/lib/supabase';

const CACHE_PIN_HASH_KEY = '@catat_duekku/pin_hash';
const CACHE_BIOMETRIC_KEY = '@catat_duekku/biometric_enabled';

// ---------------------------------------------------------------------------
// Hashing
// ---------------------------------------------------------------------------

async function hashPin(pin: string): Promise<string> {
  return Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    pin
  );
}

// ---------------------------------------------------------------------------
// PIN — Save / Verify / Clear
// ---------------------------------------------------------------------------

/**
 * Hash and save PIN to both Supabase user_metadata and local AsyncStorage cache.
 */
export async function savePin(pin: string): Promise<void> {
  const hash = await hashPin(pin);

  // 1. Push to Supabase (authoritative)
  const { error } = await supabase.auth.updateUser({
    data: { pin_hash: hash },
  });
  if (error) throw error;

  // 2. Cache locally
  await AsyncStorage.setItem(CACHE_PIN_HASH_KEY, hash);
}

/**
 * Verify PIN against Supabase metadata (with local cache fallback).
 */
export async function verifyPin(pin: string): Promise<boolean> {
  const inputHash = await hashPin(pin);

  // Try Supabase first
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const storedHash: string | undefined = user?.user_metadata?.pin_hash;
    if (storedHash) {
      // Refresh local cache
      await AsyncStorage.setItem(CACHE_PIN_HASH_KEY, storedHash);
      return storedHash === inputHash;
    }
  } catch {
    // Network error — fall through to local cache
  }

  // Fallback: local AsyncStorage cache
  const cached = await AsyncStorage.getItem(CACHE_PIN_HASH_KEY);
  return cached !== null && cached === inputHash;
}

/**
 * Check if the current user has a PIN set (Supabase first, then cache).
 */
export async function hasPin(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const hash: string | undefined = user?.user_metadata?.pin_hash;
    if (hash && hash.length > 0) {
      await AsyncStorage.setItem(CACHE_PIN_HASH_KEY, hash);
      return true;
    }
    return false;
  } catch {
    // Offline: check local cache
    const cached = await AsyncStorage.getItem(CACHE_PIN_HASH_KEY);
    return cached !== null && cached.length > 0;
  }
}

/**
 * Remove PIN from Supabase and local cache (used on logout or PIN reset).
 */
export async function clearPin(): Promise<void> {
  try {
    await supabase.auth.updateUser({ data: { pin_hash: null } });
  } catch {
    // best-effort
  }
  await AsyncStorage.removeItem(CACHE_PIN_HASH_KEY);
}

// ---------------------------------------------------------------------------
// Biometric preference — Save / Read
// ---------------------------------------------------------------------------

/**
 * Save biometric preference to Supabase user_metadata and local cache.
 */
export async function setBiometricEnabled(enabled: boolean): Promise<void> {
  try {
    await supabase.auth.updateUser({
      data: { biometric_enabled: enabled },
    });
  } catch {
    // best-effort
  }
  await AsyncStorage.setItem(CACHE_BIOMETRIC_KEY, enabled ? '1' : '0');
}

/**
 * Read biometric preference (Supabase first, then local cache).
 */
export async function isBiometricEnabled(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    const val: boolean | undefined = user?.user_metadata?.biometric_enabled;
    if (val !== undefined) {
      await AsyncStorage.setItem(CACHE_BIOMETRIC_KEY, val ? '1' : '0');
      return val;
    }
  } catch {
    // Offline fallback
  }
  const cached = await AsyncStorage.getItem(CACHE_BIOMETRIC_KEY);
  return cached === '1';
}
