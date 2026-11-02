import { FlatList, StyleSheet } from 'react-native';

import { LeanList } from '@/constants/list';
import { Spacing } from '@/constants/theme';
import type { CollectionCat, Sighting } from '@/lib/api/types';

import { CatTile } from './cat-tile';

/**
 * Collection polaroids in a row that scrolls sideways. It reaches the screen edges: pass the side
 * padding of the screen as `inset`. The padding around the cards leaves room for their tilt, the paw
 * beads on the frame and the sticker that pokes out of the top-left corner, so none of it is clipped.
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
      contentContainerStyle={[styles.row, { paddingHorizontal: inset + STICKER_OVERHANG }]}
    />
  );
}

// How far the corner sticker reaches past the card, plus a little air.
const STICKER_OVERHANG = Spacing.two;
const CARD = 156;

const styles = StyleSheet.create({
  row: { gap: Spacing.three, paddingTop: Spacing.three, paddingBottom: Spacing.three },
  card: { flex: 0, width: CARD, maxWidth: CARD, paddingHorizontal: 0 },
});
