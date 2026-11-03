import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { Image as NativeImage, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Fonts, PaperInk, Pastels, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { CollectionCat, Sighting } from '@/lib/api/types';
import { catName, daysAgo } from '@/lib/format';
import { useT } from '@/lib/i18n';

// A slight, fixed tilt per cat, like prints stuck on a fridge.
const TILTS = ['-1.5deg', '1deg', '0deg', '1.5deg', '-1deg'];

// Seven motifs against nine paper colours: neither count divides the other, so neighbours never match.
const MOTIFS = [
  require('@/assets/images/motif-paw.png'),
  require('@/assets/images/motif-fish.png'),
  require('@/assets/images/motif-dots.png'),
  require('@/assets/images/motif-heart.png'),
  require('@/assets/images/motif-cat.png'),
  require('@/assets/images/motif-stripes.png'),
  require('@/assets/images/motif-star.png'),
];

export const MOTIF_COUNT = MOTIFS.length;

/**
 * One cat in a collection, printed like a photobooth frame on the cat's patterned paper: cover, name and, for
 * your own cats, a stamp of when and where it was last seen. `style` replaces the half-row grid sizing, e.g. with a fixed width in a carousel.
 * Only your own cats take `onPress` and `onShare`: the server shows a cat's page and photos to its owner alone.
 */
export function CatTile({
  cat,
  style,
  onPress,
  onShare,
}: {
  cat: CollectionCat & { last_sighting?: Sighting | null };
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  onShare?: () => void;
}) {
  const theme = useTheme();
  const t = useT();
  const seen = cat.last_sighting;
  const frame = Pastels[cat.id % Pastels.length];
  const tilt = TILTS[cat.id % TILTS.length];
  return (
    <Pressable
      accessibilityRole={onPress ? 'link' : undefined}
      accessibilityLabel={onPress ? t.cats.open(catName(cat.name)) : undefined}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [styles.tile, style, pressed && styles.pressed]}>
      <View style={[styles.card, { backgroundColor: frame, transform: [{ rotate: tilt }] }]}>
        <PaperMotif id={cat.id} />
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
          {onShare && cat.photo_count > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.share.shareCat(catName(cat.name))}
              onPress={onShare}
              hitSlop={6}
              style={({ pressed }) => [styles.share, pressed && styles.pressed]}>
              <SymbolView
                name={{ ios: 'square.and.arrow.up', android: 'share', web: 'share' }}
                size={18}
                tintColor="#ffffff"
              />
            </Pressable>
          ) : null}
        </View>
        <View style={styles.caption}>
          <ThemedText type="smallBold" numberOfLines={1} style={styles.name}>
            {catName(cat.name)}
          </ThemedText>
          {seen ? (
            <ThemedText type="small" numberOfLines={1} style={styles.stamp}>
              {seen.label ? `${daysAgo(seen.seen_at)} · ${seen.label}` : daysAgo(seen.seen_at)}
            </ThemedText>
          ) : null}
          <BoothMark />
        </View>
      </View>
    </Pressable>
  );
}

/**
 * The cat's motif printed across its paper, in white so dark ink on top stays readable. Render it first in the
 * card. Each motif is one small bitmap shared by every card that uses it.
 */
export function PaperMotif({ id }: { id: number }) {
  return (
    <View style={styles.paper}>
      {/* An Image without its own size takes the tile's size, so it fills a sized wrapper instead. */}
      <NativeImage source={MOTIFS[id % MOTIFS.length]} resizeMode="repeat" style={styles.motif} />
    </View>
  );
}

/** The booth's name along the bottom edge of a print. Decoration, so screen readers skip it. */
export function BoothMark() {
  return (
    <ThemedText accessibilityElementsHidden importantForAccessibility="no" style={styles.mark}>
      MEOWSHOT
    </ThemedText>
  );
}

const PAPER_RADIUS = 4;

const styles = StyleSheet.create({
  // Exactly half the row, so a lone tile in the last row keeps the same size as the others.
  tile: { flex: 1, maxWidth: '50%', paddingHorizontal: Spacing.three / 2 },
  pressed: { opacity: 0.8 },
  card: { borderRadius: PAPER_RADIUS, padding: Spacing.two },
  paper: { ...StyleSheet.absoluteFill, borderRadius: PAPER_RADIUS, overflow: 'hidden', pointerEvents: 'none' },
  motif: { width: '100%', height: '100%', opacity: 0.5 },
  cover: {
    aspectRatio: 1,
    borderRadius: 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  caption: { paddingTop: Spacing.two, paddingHorizontal: Spacing.half, paddingBottom: Spacing.half },
  name: { color: PaperInk, fontFamily: Fonts.rounded, fontSize: 15 },
  stamp: { color: PaperInk, fontFamily: Fonts.mono, fontSize: 11, lineHeight: 16 },
  mark: {
    color: PaperInk,
    fontFamily: Fonts.mono,
    fontSize: 9,
    lineHeight: 12,
    letterSpacing: 2,
    textAlign: 'center',
    opacity: 0.7,
    paddingTop: Spacing.two,
  },
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
  share: {
    position: 'absolute',
    right: Spacing.one,
    bottom: Spacing.one,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  favorite: { position: 'absolute', top: Spacing.two, right: Spacing.two },
});
