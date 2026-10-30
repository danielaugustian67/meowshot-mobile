import { Stack } from 'expo-router';

import { useT } from '@/lib/i18n';

export default function FeedLayout() {
  const t = useT();
  return (
    // Back is a plain chevron, as in the Profil stack, so a pushed profile looks the same from either tab.
    <Stack screenOptions={{ headerShadowVisible: false, headerBackButtonDisplayMode: 'minimal' }}>
      {/* The title is the Teman/Publik switch, set by the screen itself. */}
      <Stack.Screen name="index" options={{ title: t.tabs.feed }} />
    </Stack>
  );
}
