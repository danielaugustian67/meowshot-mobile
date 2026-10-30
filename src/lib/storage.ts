import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Small string values that must survive restarts: the keychain/keystore on native, localStorage on web.

export async function readItem(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(key);
}

export async function writeItem(key: string, value: string | null) {
  if (Platform.OS === 'web') {
    try {
      if (value === null) localStorage.removeItem(key);
      else localStorage.setItem(key, value);
    } catch {}
    return;
  }
  if (value === null) await SecureStore.deleteItemAsync(key);
  else await SecureStore.setItemAsync(key, value);
}
