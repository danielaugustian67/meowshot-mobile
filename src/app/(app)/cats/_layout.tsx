import { Stack } from 'expo-router';

import { MapButton } from '@/features/cats/map-button';
import { useT } from '@/lib/i18n';

export default function CatsLayout() {
  const t = useT();
  return (
    <Stack screenOptions={{ headerShadowVisible: false, headerBackButtonDisplayMode: 'minimal' }}>
      <Stack.Screen
        name="index"
        options={{ title: t.tabs.cats, headerLargeTitle: true, headerRight: () => <MapButton /> }}
      />
      <Stack.Screen name="map" options={{ title: t.cats.map }} />
    </Stack>
  );
}
