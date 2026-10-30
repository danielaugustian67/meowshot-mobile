import { QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';

import { SessionProvider, useSession } from '@/lib/auth/session';
import { queryClient } from '@/lib/query';

SplashScreen.preventAutoHideAsync();

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

  // Keep the splash screen up until the stored tokens have been read.
  useEffect(() => {
    if (status !== 'loading') SplashScreen.hideAsync();
  }, [status]);

  if (status === 'loading') return null;
  return (
    <Stack screenOptions={{ headerShown: false, headerBackButtonDisplayMode: 'minimal', headerShadowVisible: false }}>
      <Stack.Protected guard={status === 'signedIn'}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
      {/* Signed-out screens live at the root (not in a group) so the guard always has a screen to fall back to. */}
      <Stack.Protected guard={status === 'signedOut'}>
        <Stack.Screen name="sign-in" />
        <Stack.Screen name="sign-up" options={{ headerShown: true, title: 'Daftar' }} />
        <Stack.Screen name="forgot-password" options={{ headerShown: true, title: 'Lupa password' }} />
        <Stack.Screen name="reset-password" options={{ headerShown: true, title: 'Reset password' }} />
      </Stack.Protected>
    </Stack>
  );
}
