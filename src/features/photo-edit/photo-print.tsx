import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Spacing } from '@/constants/theme';
import { BoothMark, PaperMotif } from '@/features/cats/cat-tile';
import { useTheme } from '@/hooks/use-theme';
import type { PhotoSticker } from '@/lib/api/types';

import { PLAIN_MOTIF } from './decoration';
import { StickerLayer } from './sticker-layer';

/**
 * A photo on its patterned paper, with two ears on top, as it appears in the feed. `photo` fills the print's
 * picture area, `overlay` sits over the picture and `children` over the paper, such as the cat's name tag.
 */
export function PhotoPrint({
  color,
  motif,
  ratio,
  photoRatio,
  photo,
  stickers,
  overlay,
  style,
  children,
}: {
  color: string;
  motif: number;
  /** The picture area's shape. */
  ratio: number;
  /** The photo's own shape, which the picture area may crop. */
  photoRatio: number;
  photo: ReactNode;
  stickers?: PhotoSticker[] | null;
  overlay?: ReactNode;
  style?: StyleProp<ViewStyle>;
  children?: ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.print, style]}>
      {/* Drawn before the paper, which hides the lower half of each ear. */}
      <Ear color={color} style={styles.earLeft} />
      <Ear color={color} style={styles.earRight} />
      <View style={[styles.paper, { backgroundColor: color }]}>
        {motif === PLAIN_MOTIF ? null : <PaperMotif id={motif} />}
        {photo ? (
          <View style={[styles.photo, { aspectRatio: ratio, backgroundColor: theme.backgroundElement }]}>
            {photo}
            <StickerLayer stickers={stickers} photoRatio={photoRatio} />
            {overlay}
          </View>
        ) : null}
        <View style={styles.markRow}>
          <BoothMark />
        </View>
        {children}
      </View>
    </View>
  );
}

/** How wide a print can be so all of it fits the given area. */
export function printWidthFor(areaWidth: number, areaHeight: number, ratio: number) {
  const sides = 2 * (SIDE + INSET);
  const photoHeight = Math.min((areaWidth - sides) / ratio, areaHeight - CHROME_HEIGHT);
  return Math.max(photoHeight, 0) * ratio + sides;
}

/** A rounded square turned 45° so one corner points up, with a pale inner ear near the tip. */
function Ear({ color, style }: { color: string; style: object }) {
  return (
    <View style={[styles.ear, { backgroundColor: color }, style]}>
      <View style={styles.innerEar} />
    </View>
  );
}

const RADIUS = 24;
const INSET = Spacing.three;
const SIDE = Spacing.one;
const EAR = 56;
// How far the ear tips stand above the paper.
const EAR_RISE = 30;
// Everything in a print's height but the picture: ears, paper edges and the row with the booth's name.
const CHROME_HEIGHT = EAR_RISE + 2 * INSET + Spacing.five + Spacing.three;

const styles = StyleSheet.create({
  print: { paddingHorizontal: SIDE, paddingTop: EAR_RISE },
  // Clips the motif, which has no idea this paper is rounder than a print.
  paper: { borderRadius: RADIUS, borderCurve: 'continuous', padding: INSET, overflow: 'hidden' },
  ear: {
    position: 'absolute',
    // The turned square's tip sits EAR * 0.707 above its centre; put the tip at the top of the print.
    top: EAR * 0.707 - EAR / 2,
    width: EAR,
    height: EAR,
    borderRadius: 11,
    transform: [{ rotate: '45deg' }],
  },
  earLeft: { left: SIDE + 34 },
  earRight: { right: SIDE + 34 },
  innerEar: {
    position: 'absolute',
    top: 9,
    left: 9,
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  photo: { width: '100%', borderRadius: RADIUS - INSET, borderCurve: 'continuous', overflow: 'hidden' },
  // Leaves the tag room to hang over the bottom of the photo.
  markRow: { alignSelf: 'flex-end', minHeight: Spacing.five, paddingRight: Spacing.one },
});
