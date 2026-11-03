import { useIsRestoring } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { SessionProvider, useSession } from '@/lib/auth/session';
import { useT } from '@/lib/i18n';
import { loadPrefs, usePrefsReady } from '@/lib/prefs';
import { queryClient } from '@/lib/query';
import { persistOptions } from '@/lib/query-persist';

SplashScreen.preventAutoHideAsync();
loadPrefs();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
      <SessionProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          {/* Follows the theme chosen in Settings. The camera mounts its own light one on top while it is open. */}
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
          <RootNavigator />
        </ThemeProvider>
      </SessionProvider>
    </PersistQueryClientProvider>
  );
}

function RootNavigator() {
  const { status } = useSession();
  const prefsReady = usePrefsReady();
  const t = useT();
  const restoring = useIsRestoring();
  const loading = status === 'loading' || !prefsReady || restoring;

  // Keep the splash screen up until the stored tokens, settings and lists have been read.
  useEffect(() => {
    if (!loading) SplashScreen.hideAsync();
  }, [loading]);

  if (loading) return null;
  return (
    <Stack screenOptions={{ headerShown: false, headerBackButtonDisplayMode: 'minimal', headerShadowVisible: false }}>
      <Stack.Protected guard={status === 'signedIn'}>
        <Stack.Screen name="(app)" />
        <Stack.Screen
          name="report"
          options={{
            presentation: 'formSheet',
            sheetAllowedDetents: [0.85],
            sheetGrabberVisible: true,
            sheetCornerRadius: 24,
          }}
        />
        <Stack.Screen name="share-pick" options={{ headerShown: true, title: t.share.pickTitle, presentation: 'modal' }} />
        <Stack.Screen name="share-photo" options={{ headerShown: true, title: t.share.title, presentation: 'modal' }} />
        <Stack.Screen name="edit-photo" options={{ headerShown: true, title: t.capture.editDecoration }} />
        <Stack.Screen
          name="edit-post"
          options={{
            presentation: 'formSheet',
            sheetAllowedDetents: [0.85],
            sheetGrabberVisible: true,
            sheetCornerRadius: 24,
          }}
        />
        <Stack.Screen
          name="edit-cat"
          options={{
            presentation: 'formSheet',
            sheetAllowedDetents: [0.85],
            sheetGrabberVisible: true,
            sheetCornerRadius: 24,
          }}
        />
      </Stack.Protected>
      {/* Signed-out screens live at the root (not in a group) so the guard always has a screen to fall back to. */}
      <Stack.Protected guard={status === 'signedOut'}>
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="sign-up" options={{ headerShown: true, title: t.auth.signUpTitle }} />
        <Stack.Screen name="verify-email" options={{ headerShown: true, title: t.auth.verifyTitle }} />
        <Stack.Screen name="forgot-password" options={{ headerShown: true, title: t.auth.forgotTitle }} />
        <Stack.Screen name="reset-password" options={{ headerShown: true, title: t.auth.resetTitle }} />
      </Stack.Protected>
    </Stack>
  );
}
