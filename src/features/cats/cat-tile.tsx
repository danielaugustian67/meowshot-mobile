import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Cat } from '@/lib/api/types';
import { catName, daysAgo } from '@/lib/format';
import { useT } from '@/lib/i18n';

/** One cat in the collection grid: square cover, name, when and where it was last seen. */
export function CatTile({ cat }: { cat: Cat }) {
  const theme = useTheme();
  const t = useT();
  const seen = cat.last_sighting;
  return (
    <View style={styles.tile}>
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
      <ThemedText type="smallBold" numberOfLines={1}>
        {catName(cat.name)}
      </ThemedText>
      {seen ? (
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
          {seen.label ? `${daysAgo(seen.seen_at)} · ${seen.label}` : daysAgo(seen.seen_at)}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  // Exactly half the row, so a lone tile in the last row keeps the same size as the others.
  tile: { flex: 1, maxWidth: '50%', gap: Spacing.half, paddingHorizontal: Spacing.three / 2 },
  cover: {
    aspectRatio: 1,
    borderRadius: 16,
    borderCurve: 'continuous',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.one,
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
  favorite: { position: 'absolute', top: Spacing.two, right: Spacing.two },
});
