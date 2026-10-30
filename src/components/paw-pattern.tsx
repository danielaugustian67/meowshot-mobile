import { Image, StyleSheet, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

const TILE = require('@/assets/images/paw-pattern.png');

// How far the pattern reaches past scroll content: covers the large-title header inset and overscroll.
const BLEED = 600;

/**
 * Faint paw-print wallpaper. Render it as the first child of a screen's container.
 *
 * Inside a ScrollView pass `inScroll` and put it in the content instead of in front of the ScrollView:
 * iOS finds a screen's scroll view (large titles, scroll edge effects) by following first subviews,
 * so nothing may sit before it.
 */
export function PawPattern({ inScroll = false }: { inScroll?: boolean }) {
  const theme = useTheme();
  return (
    <View style={[inScroll ? styles.bleed : StyleSheet.absoluteFill, styles.passive]}>
      {/* An Image without its own size takes the tile's size, so it fills a sized wrapper instead. */}
      <Image source={TILE} resizeMode="repeat" style={[styles.fill, { tintColor: theme.pattern }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  bleed: { position: 'absolute', top: -BLEED, bottom: -BLEED, left: 0, right: 0 },
  passive: { pointerEvents: 'none' },
  fill: { width: '100%', height: '100%' },
});
