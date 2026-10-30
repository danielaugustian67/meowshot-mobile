import { readItem, writeItem } from '@/lib/storage';

export type Tokens = { access: string; refresh: string };

const KEY = 'meowshot.tokens';

// Kept in memory so every request does not hit the keychain; the store is only the source on startup.
let current: Tokens | null = null;

export async function loadTokens(): Promise<Tokens | null> {
  const raw = await readItem(KEY);
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
  await writeItem(KEY, tokens ? JSON.stringify(tokens) : null);
}
