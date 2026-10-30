import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export type Tokens = { access: string; refresh: string };

const KEY = 'meowshot.tokens';

// Kept in memory so every request does not hit the keychain; the store is only the source on startup.
let current: Tokens | null = null;

async function read(): Promise<string | null> {
  if (Platform.OS === 'web') {
    try {
      return localStorage.getItem(KEY);
    } catch {
      return null;
    }
  }
  return SecureStore.getItemAsync(KEY);
}

async function write(value: string | null) {
  if (Platform.OS === 'web') {
    try {
      if (value === null) localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, value);
    } catch {}
    return;
  }
  if (value === null) await SecureStore.deleteItemAsync(KEY);
  else await SecureStore.setItemAsync(KEY, value);
}

export async function loadTokens(): Promise<Tokens | null> {
  const raw = await read();
  if (!raw) return (current = null);
  try {
    current = JSON.parse(raw) as Tokens;
  } catch {
    current = null;
  }
  return current;
}

export function getTokens(): Tokens | null {
  return current;
}

export async function saveTokens(tokens: Tokens | null) {
  current = tokens;
  await write(tokens ? JSON.stringify(tokens) : null);
}
