import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

const SIZE = 96;
const PAW: SymbolViewProps['name'] = { ios: 'pawprint.fill', android: 'pets', web: 'pets' };

/** Brand-coloured symbol in a soft orange circle: the illustration at the top of simple screens. */
export function HeroIcon({ name = PAW }: { name?: SymbolViewProps['name'] }) {
  const theme = useTheme();
  return (
    // A 12% tint (1F) over the page colour, so the paw pattern behind it does not show through.
    <View style={[styles.circle, { backgroundColor: theme.background }]}>
      <View style={[styles.circle, styles.wash, { backgroundColor: `${theme.tint}1F` }]} />
      <SymbolView name={name} size={SIZE / 2} tintColor={theme.tint} />
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { width: SIZE, height: SIZE, borderRadius: SIZE / 2, alignItems: 'center', justifyContent: 'center' },
  wash: { position: 'absolute' },
});
