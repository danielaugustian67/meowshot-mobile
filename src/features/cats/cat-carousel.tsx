import { ScrollView, StyleSheet } from 'react-native';

import { Spacing } from '@/constants/theme';
import type { CollectionCat, Sighting } from '@/lib/api/types';

import { CatTile } from './cat-tile';

/**
 * Collection polaroids in a row that scrolls sideways. It reaches the screen edges: pass the side
 * padding of the screen as `inset`. The padding around the cards leaves room for their tilt, the paw
 * beads on the frame and the sticker that pokes out of the top-left corner, so none of it is clipped.
 */
export function CatCarousel({
  cats,
  inset,
}: {
  cats: (CollectionCat & { last_sighting?: Sighting | null })[];
  inset: number;
}) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ marginHorizontal: -inset }}
      contentContainerStyle={[styles.row, { paddingHorizontal: inset + STICKER_OVERHANG }]}>
      {cats.map((cat) => (
        <CatTile key={cat.id} cat={cat} style={styles.card} />
      ))}
    </ScrollView>
  );
}

// How far the corner sticker reaches past the card, plus a little air.
const STICKER_OVERHANG = Spacing.two;
const CARD = 156;

const styles = StyleSheet.create({
  row: { gap: Spacing.three, paddingTop: Spacing.three, paddingBottom: Spacing.three },
  card: { flex: 0, width: CARD, maxWidth: CARD, paddingHorizontal: 0 },
});
