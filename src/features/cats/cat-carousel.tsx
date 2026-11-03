import { FlatList, StyleSheet } from 'react-native';

import { LeanList } from '@/constants/list';
import { Spacing } from '@/constants/theme';
import type { CollectionCat, Sighting } from '@/lib/api/types';

import { CatTile } from './cat-tile';

/**
 * Collection prints in a row that scrolls sideways. It reaches the screen edges: pass the side
 * padding of the screen as `inset`. The padding around the cards leaves room for their tilt, so no
 * corner is clipped.
 * A list rather than a plain row, so only the cards near the screen are mounted.
 */
export function CatCarousel({
  cats,
  inset,
  onPressCat,
}: {
  cats: (CollectionCat & { last_sighting?: Sighting | null })[];
  inset: number;
  /** Your own collection only; see CatTile. */
  onPressCat?: (id: number) => void;
}) {
  return (
    <FlatList
      {...LeanList}
      horizontal
      data={cats}
      keyExtractor={(cat) => String(cat.id)}
      renderItem={({ item }) => (
        <CatTile cat={item} style={styles.card} onPress={onPressCat ? () => onPressCat(item.id) : undefined} />
      )}
      showsHorizontalScrollIndicator={false}
      style={{ marginHorizontal: -inset }}
      contentContainerStyle={[styles.row, { paddingHorizontal: inset + TILT_ROOM }]}
    />
  );
}

// How far a tilted corner reaches past the card, plus a little air.
const TILT_ROOM = Spacing.one;
const CARD = 156;

const styles = StyleSheet.create({
  row: { gap: Spacing.three, paddingTop: Spacing.three, paddingBottom: Spacing.three },
  // The basis because on web `flex: 0` means a basis of 0, which would ignore the width.
  card: { flex: 0, flexBasis: CARD, width: CARD, maxWidth: CARD, paddingHorizontal: 0 },
});
