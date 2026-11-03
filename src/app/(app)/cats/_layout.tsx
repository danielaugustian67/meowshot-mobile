import { Stack } from 'expo-router';

import { MapButton } from '@/features/cats/map-button';
import { useT } from '@/lib/i18n';
import { webHeaderOptions } from '@/lib/web-header';

export default function CatsLayout() {
  const t = useT();
  return (
    <Stack screenOptions={{ ...webHeaderOptions, headerShadowVisible: false, headerBackButtonDisplayMode: 'minimal' }}>
      <Stack.Screen
        name="index"
        options={{ title: t.tabs.cats, headerLargeTitle: true, headerRight: () => <MapButton /> }}
      />
      <Stack.Screen name="map" options={{ title: t.cats.map }} />
    </Stack>
  );
}
