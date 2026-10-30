import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Cat } from '@/lib/api/types';
import { catName, daysAgo } from '@/lib/format';
import { useT } from '@/lib/i18n';

// Pastel frames that read on both the off-white and the black page.
const FRAMES = ['#FFB37A', '#F7A8C4', '#8FD6AE', '#9EC2F5', '#F5D46E', '#C5B0F5'];
// A slight, fixed tilt per cat, like photos stuck on a fridge.
const TILTS = ['-1.5deg', '1deg', '0deg', '1.5deg', '-1deg'];

/** One cat in the collection grid, framed like a polaroid: cover, name, when and where it was last seen. */
export function CatTile({ cat }: { cat: Cat }) {
  const theme = useTheme();
  const t = useT();
  const seen = cat.last_sighting;
  const frame = FRAMES[cat.id % FRAMES.length];
  const tilt = TILTS[cat.id % TILTS.length];
  return (
    <View style={styles.tile}>
      {/* The page colour under the 25% wash, so the paw pattern does not show through the card. */}
      <View style={[styles.card, { backgroundColor: theme.background, transform: [{ rotate: tilt }] }]}>
        <View style={[StyleSheet.absoluteFill, styles.wash, { backgroundColor: `${frame}40`, borderColor: frame }]} />
        <View style={[styles.cover, { backgroundColor: theme.backgroundElement }]}>
          {cat.cover?.thumb_url ? (
            <Image
              source={{ uri: cat.cover.thumb_url, cacheKey: `photo-thumb-${cat.cover.photo_id}` }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={150}
            />
          ) : (
            <SymbolView
              name={{ ios: 'pawprint.fill', android: 'pets', web: 'pets' }}
              size={32}
              tintColor={theme.textSecondary}
            />
          )}
          {cat.photo_count > 1 ? (
            <View style={styles.badge}>
              <ThemedText type="small" style={styles.badgeText}>
                {t.cats.photos(cat.photo_count)}
              </ThemedText>
            </View>
          ) : null}
          {cat.is_favorite ? (
            <SymbolView
              name={{ ios: 'heart.fill', android: 'favorite', web: 'favorite' }}
              size={18}
              tintColor={theme.tint}
              style={styles.favorite}
              accessibilityLabel={t.cats.favorite}
            />
          ) : null}
        </View>
        <View style={styles.caption}>
          <ThemedText type="smallBold" numberOfLines={1} style={styles.name}>
            {catName(cat.name)}
          </ThemedText>
          {seen ? (
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {seen.label ? `${daysAgo(seen.seen_at)} · ${seen.label}` : daysAgo(seen.seen_at)}
            </ThemedText>
          ) : null}
        </View>
        <View style={[styles.sticker, { backgroundColor: frame, borderColor: theme.background }]}>
          <SymbolView name={{ ios: 'pawprint.fill', android: 'pets', web: 'pets' }} size={14} tintColor="#ffffff" />
        </View>
      </View>
    </View>
  );
}

const RADIUS = 20;
const INSET = Spacing.two;

const styles = StyleSheet.create({
  // Exactly half the row, so a lone tile in the last row keeps the same size as the others.
  tile: { flex: 1, maxWidth: '50%', paddingHorizontal: Spacing.three / 2 },
  card: { borderRadius: RADIUS, borderCurve: 'continuous', padding: INSET },
  wash: { borderRadius: RADIUS, borderCurve: 'continuous', borderWidth: 3 },
  cover: {
    aspectRatio: 1,
    borderRadius: RADIUS - INSET,
    borderCurve: 'continuous',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  caption: { paddingTop: Spacing.two, paddingHorizontal: Spacing.one, paddingBottom: Spacing.one },
  name: { fontFamily: Fonts.rounded, fontSize: 15 },
  // Always dark behind white text, so it reads on any photo in both themes.
  badge: {
    position: 'absolute',
    left: Spacing.two,
    bottom: Spacing.two,
    paddingHorizontal: Spacing.two,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  badgeText: { color: '#ffffff' },
  favorite: { position: 'absolute', top: Spacing.two, right: Spacing.two },
  // A round paw "sticker" stuck over the top-left corner of the frame.
  sticker: {
    position: 'absolute',
    top: -8,
    left: -8,
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    transform: [{ rotate: '-15deg' }],
  },
});
