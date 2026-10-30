import { Stack } from 'expo-router';

import { useT } from '@/lib/i18n';

export default function CatsLayout() {
  const t = useT();
  return (
    <Stack screenOptions={{ headerLargeTitle: true, headerShadowVisible: false }}>
      <Stack.Screen name="index" options={{ title: t.tabs.cats }} />
    </Stack>
  );
}
