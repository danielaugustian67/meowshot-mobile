import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { SessionProvider, useSession } from '@/lib/auth/session';
import { useT } from '@/lib/i18n';
import { loadPrefs, usePrefsReady } from '@/lib/prefs';
import { queryClient } from '@/lib/query';

SplashScreen.preventAutoHideAsync();
loadPrefs();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <RootNavigator />
        </ThemeProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}

function RootNavigator() {
  const { status } = useSession();
  const prefsReady = usePrefsReady();
  const t = useT();
  const loading = status === 'loading' || !prefsReady;

  // Keep the splash screen up until the stored tokens and settings have been read.
  useEffect(() => {
    if (!loading) SplashScreen.hideAsync();
  }, [loading]);

  if (loading) return null;
  return (
    <Stack screenOptions={{ headerShown: false, headerBackButtonDisplayMode: 'minimal', headerShadowVisible: false }}>
      <Stack.Protected guard={status === 'signedIn'}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      {/* Signed-out screens live at the root (not in a group) so the guard always has a screen to fall back to. */}
      <Stack.Protected guard={status === 'signedOut'}>
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="sign-up" options={{ headerShown: true, title: t.auth.signUpTitle }} />
        <Stack.Screen name="forgot-password" options={{ headerShown: true, title: t.auth.forgotTitle }} />
        <Stack.Screen name="reset-password" options={{ headerShown: true, title: t.auth.resetTitle }} />
      </Stack.Protected>
    </Stack>
  );
}
