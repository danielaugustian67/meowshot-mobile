import { Stack } from 'expo-router';

import { useT } from '@/lib/i18n';

export default function CatsLayout() {
  const t = useT();
  return (
    <Stack screenOptions={{ headerShadowVisible: false, headerBackButtonDisplayMode: 'minimal' }}>
      <Stack.Screen name="index" options={{ title: t.tabs.cats, headerLargeTitle: true }} />
    </Stack>
  );
}
