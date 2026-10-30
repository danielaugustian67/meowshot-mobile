import { useColorScheme as useSystemColorScheme } from 'react-native';

import { usePrefs } from '@/lib/prefs';

/** The scheme the app draws in: the user's choice in Pengaturan, otherwise the device's. */
export function useColorScheme(): 'light' | 'dark' {
  const { theme } = usePrefs();
  const system = useSystemColorScheme();
  if (theme !== 'system') return theme;
  return system === 'dark' ? 'dark' : 'light';
}
