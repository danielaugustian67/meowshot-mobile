import { useSyncExternalStore } from 'react';
import { Appearance, Platform } from 'react-native';

import { readItem, writeItem } from '@/lib/storage';

export type ThemePref = 'system' | 'light' | 'dark';
export type LanguagePref = 'system' | 'id' | 'en';
export type Prefs = { theme: ThemePref; language: LanguagePref };

const KEY = 'meowshot.prefs';
const DEFAULTS: Prefs = { theme: 'system', language: 'system' };

let current: Prefs = DEFAULTS;
let ready = false;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// The override reaches native UI too (headers, tab bar, alerts, keyboard), not only our own colours.
function applyTheme(theme: ThemePref) {
  if (Platform.OS === 'web' || typeof Appearance.setColorScheme !== 'function') return;
  Appearance.setColorScheme(theme === 'system' ? 'unspecified' : theme);
}

/** Reads the stored settings once at startup. Unknown or broken values fall back to the defaults. */
export async function loadPrefs() {
  try {
    const raw = await readItem(KEY);
    if (raw) current = { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Prefs>) };
  } catch {
    current = DEFAULTS;
  }
  applyTheme(current.theme);
  ready = true;
  emit();
}

export function getPrefs(): Prefs {
  return current;
}

export function setPrefs(patch: Partial<Prefs>) {
  current = { ...current, ...patch };
  if (patch.theme) applyTheme(patch.theme);
  emit();
  writeItem(KEY, JSON.stringify(current)).catch(() => {});
}

export function usePrefs(): Prefs {
  return useSyncExternalStore(subscribe, getPrefs, getPrefs);
}

/** False until the stored settings have been read, so the first frame uses the right theme and language. */
export function usePrefsReady(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => ready,
    () => ready,
  );
}
