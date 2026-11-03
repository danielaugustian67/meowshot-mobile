import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { PhotoSticker } from '@/lib/api/types';
import { useT } from '@/lib/i18n';

import { coverRect, MAX_STICKERS, stickerEmoji, STICKER_IDS } from './decoration';
import { StickerLayer } from './sticker-layer';
import { ToolButton } from './tool-button';
import { useTouchTransform } from './use-touch-transform';

const NEW_SCALE = 0.22;
const SCALE_STEP = 1.2;
const TURN_STEP = 15;
// Small stickers stay easy to hit with a finger.
const MIN_TOUCH_RADIUS = 24;

/** Over the picture: tap a sticker to pick it, drag it around, pinch and twist with two fingers. */
export function StickerCanvas({
  stickers,
  photoRatio,
  selected,
  onSelect,
  onChange,
}: {
  stickers: PhotoSticker[];
  photoRatio: number;
  selected: number | null;
  onSelect: (index: number | null) => void;
  onChange: (index: number, update: (sticker: PhotoSticker) => PhotoSticker) => void;
}) {
  const theme = useTheme();
  const [box, setBox] = useState({ width: 0, height: 0 });
  const [hit, setHit] = useState(false);
  const rect = coverRect(photoRatio, box.width, box.height);

  const handlers = useTouchTransform({
    onStart: (x, y) => {
      let found: number | null = null;
      for (let i = stickers.length - 1; i >= 0 && found === null; i--) {
        const s = stickers[i];
        const radius = Math.max((s.scale * rect.width) / 2 + 6, MIN_TOUCH_RADIUS);
        if (Math.hypot(rect.left + s.x * rect.width - x, rect.top + s.y * rect.height - y) <= radius) found = i;
      }
      setHit(found !== null);
      if (found !== null) onSelect(found);
    },
    onChange: ({ dx, dy, scale, rotation }) => {
      if (selected === null) return;
      // A finger that missed may still be half of a pinch around a small sticker, but one alone moves nothing.
      if (!hit && scale === 1 && rotation === 0) return;
      onChange(selected, (s) => ({
        ...s,
        x: s.x + dx / rect.width,
        y: s.y + dy / rect.height,
        scale: s.scale * scale,
        rotation: s.rotation + rotation,
      }));
    },
    onEnd: (moved) => {
      if (!moved && !hit) onSelect(null);
    },
  });

  return (
    <View {...handlers} style={StyleSheet.absoluteFill} onLayout={(e) => setBox(e.nativeEvent.layout)}>
      <StickerLayer stickers={stickers} photoRatio={photoRatio} selected={selected} selectedColor={theme.tint} />
    </View>
  );
}

export function StickerControls({
  stickers,
  selected,
  onAdd,
  onChange,
  onRemove,
}: {
  stickers: PhotoSticker[];
  selected: number | null;
  onAdd: (sticker: PhotoSticker) => void;
  onChange: (index: number, update: (sticker: PhotoSticker) => PhotoSticker) => void;
  onRemove: (index: number) => void;
}) {
  const theme = useTheme();
  const t = useT();
  const full = stickers.length >= MAX_STICKERS;

  function add(id: string) {
    // Each one lands a little apart, so they don't hide under each other.
    const step = (stickers.length % 4) * 0.08;
    onAdd({ id, x: 0.38 + step, y: 0.38 + step, scale: NEW_SCALE, rotation: 0 });
  }

  return (
    <View style={styles.controls}>
      <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
        {full ? t.capture.stickerLimit(MAX_STICKERS) : t.capture.stickerHint}
      </ThemedText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.palette}>
        {STICKER_IDS.map((id) => (
          <Pressable
            key={id}
            accessibilityRole="button"
            accessibilityLabel={t.capture.addSticker(t.capture.stickerNames[id])}
            disabled={full}
            onPress={() => add(id)}
            style={({ pressed }) => [
              styles.option,
              { backgroundColor: theme.backgroundElement, opacity: full ? 0.4 : pressed ? 0.6 : 1 },
            ]}>
            <Text allowFontScaling={false} style={styles.optionEmoji}>
              {stickerEmoji(id)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={styles.tools}>
        <ToolButton
          icon={{ ios: 'minus', android: 'remove' }}
          label={t.capture.stickerSmaller}
          disabled={selected === null}
          onPress={() => selected !== null && onChange(selected, (s) => ({ ...s, scale: s.scale / SCALE_STEP }))}
        />
        <ToolButton
          icon={{ ios: 'plus', android: 'add' }}
          label={t.capture.stickerBigger}
          disabled={selected === null}
          onPress={() => selected !== null && onChange(selected, (s) => ({ ...s, scale: s.scale * SCALE_STEP }))}
        />
        <ToolButton
          icon={{ ios: 'rotate.right', android: 'rotate_right' }}
          label={t.capture.stickerTurn}
          disabled={selected === null}
          onPress={() => selected !== null && onChange(selected, (s) => ({ ...s, rotation: s.rotation + TURN_STEP }))}
        />
        <ToolButton
          icon={{ ios: 'trash', android: 'delete' }}
          label={t.capture.stickerRemove}
          disabled={selected === null}
          onPress={() => selected !== null && onRemove(selected)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  controls: { gap: Spacing.three },
  center: { textAlign: 'center' },
  palette: { gap: Spacing.two, paddingVertical: Spacing.half },
  option: { width: 52, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  optionEmoji: { fontSize: 28, lineHeight: 36, color: '#000000' },
  tools: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.three },
});
