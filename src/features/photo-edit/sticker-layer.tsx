import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import type { PhotoSticker } from '@/lib/api/types';

import { coverRect, stickerEmoji } from './decoration';

// Emoji are taller than their font size, and the box must not clip them.
const LINE = 1.3;

/** Stickers over a photo shown with `contentFit="cover"`, so they stay on the same spot however it is cropped. */
export function StickerLayer({
  stickers,
  photoRatio,
  selected,
  selectedColor,
}: {
  stickers: PhotoSticker[] | null | undefined;
  photoRatio: number;
  selected?: number | null;
  selectedColor?: string;
}) {
  const [box, setBox] = useState({ width: 0, height: 0 });
  if (!stickers?.length) return null;
  const rect = coverRect(photoRatio, box.width, box.height);
  return (
    <View
      style={styles.layer}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      onLayout={(e) => setBox(e.nativeEvent.layout)}>
      {box.width > 0
        ? stickers.map((s, i) => {
            const emoji = stickerEmoji(s.id);
            if (!emoji) return null;
            const size = s.scale * rect.width;
            const side = size * LINE;
            return (
              <View
                // Stickers never reorder, and two of the same one can sit in the list.
                key={i}
                style={[
                  styles.sticker,
                  {
                    width: side,
                    height: side,
                    left: rect.left + s.x * rect.width - side / 2,
                    top: rect.top + s.y * rect.height - side / 2,
                    transform: [{ rotate: `${s.rotation}deg` }],
                  },
                  i === selected && { borderColor: selectedColor, borderWidth: 2, borderRadius: 8 },
                ]}>
                <Text allowFontScaling={false} style={[styles.emoji, { fontSize: size, lineHeight: side }]}>
                  {emoji}
                </Text>
              </View>
            );
          })
        : null}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { ...StyleSheet.absoluteFill, overflow: 'hidden' },
  sticker: { position: 'absolute', alignItems: 'center', justifyContent: 'center' },
  emoji: { textAlign: 'center', includeFontPadding: false, color: '#000000' },
});
