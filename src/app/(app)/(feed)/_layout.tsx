import { Stack } from 'expo-router';

import { useT } from '@/lib/i18n';

export default function FeedLayout() {
  const t = useT();
  return (
    <Stack screenOptions={{ headerShadowVisible: false }}>
      {/* The title is the Teman/Publik switch, set by the screen itself. */}
      <Stack.Screen name="index" options={{ title: t.tabs.feed }} />
    </Stack>
  );
}
