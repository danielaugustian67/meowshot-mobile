import { Link, Stack } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/lib/i18n';

export default function ProfileLayout() {
  const theme = useTheme();
  const t = useT();
  return (
    <Stack screenOptions={{ headerShadowVisible: false, headerBackButtonDisplayMode: 'minimal' }}>
      <Stack.Screen
        name="index"
        options={{
          title: t.profile.title,
          headerLargeTitle: true,
          headerRight: () => (
            <Link href="/profile/settings" asChild>
              <Pressable accessibilityRole="button" accessibilityLabel={t.profile.settings} hitSlop={8}>
                <SymbolView
                  name={{ ios: 'gearshape', android: 'settings', web: 'settings' }}
                  size={24}
                  tintColor={theme.text}
                />
              </Pressable>
            </Link>
          ),
        }}
      />
      <Stack.Screen name="friends" options={{ title: t.friends.title }} />
      <Stack.Screen name="settings" options={{ title: t.settings.title }} />
      <Stack.Screen name="edit" options={{ title: t.settings.editProfile }} />
      <Stack.Screen name="password" options={{ title: t.settings.changePassword }} />
      <Stack.Screen name="delete-account" options={{ title: t.settings.deleteAccount }} />
    </Stack>
  );
}
