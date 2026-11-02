import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/lib/i18n';

/** Kucingku's header button to the map of your cats. */
export function MapButton() {
  const theme = useTheme();
  const t = useT();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t.cats.map}
      onPress={() => router.push('/cats/map')}
      hitSlop={8}>
      <SymbolView name={{ ios: 'map', android: 'map', web: 'map' }} size={22} tintColor={theme.text} />
    </Pressable>
  );
}
