import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { Segmented } from '@/components/ui/segmented';
import { Spacing } from '@/constants/theme';
import { useT } from '@/lib/i18n';

import { clampCrop, cropRatio, INITIAL_CROP, MAX_ZOOM, turnedSize, type CropAspect, type CropState } from './crop';
import { ToolButton } from './tool-button';
import { useTouchTransform } from './use-touch-transform';

type Size = { width: number; height: number };

const ZOOM_STEP = 1.25;

/** The photo under a fixed window: drag and pinch it into place, and what the window shows is what gets kept. */
export function CropCanvas({
  photo,
  crop,
  area,
  onChange,
}: {
  photo: Size & { uri: string };
  crop: CropState;
  area: Size;
  onChange: (update: (current: CropState) => CropState) => void;
}) {
  const ratio = cropRatio(crop, photo.width, photo.height);
  const boxWidth = Math.min(area.width, area.height * ratio);
  const boxHeight = boxWidth / ratio;
  const turned = turnedSize(photo.width, photo.height, crop.turns);
  // How big a photo pixel is at zoom 1, when the photo just covers the window.
  const fit = Math.max(boxWidth / turned.width, boxHeight / turned.height);
  const shownWidth = photo.width * fit;
  const shownHeight = photo.height * fit;

  const handlers = useTouchTransform({
    onChange: ({ dx, dy, scale }) =>
      onChange((c) =>
        clampCrop(
          {
            ...c,
            zoom: c.zoom * scale,
            cx: c.cx - dx / (turned.width * fit * c.zoom),
            cy: c.cy - dy / (turned.height * fit * c.zoom),
          },
          photo.width,
          photo.height,
        ),
      ),
  });

  return (
    <View {...handlers} style={[styles.window, { width: boxWidth, height: boxHeight }]}>
      <Image
        source={{ uri: photo.uri }}
        // Decoded in full, so zooming in shows real detail rather than a stretched preview.
        allowDownscaling={false}
        contentFit="fill"
        pointerEvents="none"
        style={{
          position: 'absolute',
          width: shownWidth,
          height: shownHeight,
          left: (boxWidth - shownWidth) / 2,
          top: (boxHeight - shownHeight) / 2,
          // Moved and scaled rather than resized, so the image never reloads under the finger.
          transform: [
            { translateX: (0.5 - crop.cx) * turned.width * fit * crop.zoom },
            { translateY: (0.5 - crop.cy) * turned.height * fit * crop.zoom },
            { scale: crop.zoom },
            { rotate: `${crop.turns * 90}deg` },
          ],
        }}
      />
      <View style={styles.grid} pointerEvents="none">
        <View style={[styles.line, styles.vertical, { left: '33.33%' }]} />
        <View style={[styles.line, styles.vertical, { left: '66.66%' }]} />
        <View style={[styles.line, styles.horizontal, { top: '33.33%' }]} />
        <View style={[styles.line, styles.horizontal, { top: '66.66%' }]} />
      </View>
    </View>
  );
}

export function CropControls({
  photo,
  crop,
  onChange,
}: {
  photo: Size;
  crop: CropState;
  onChange: (update: (current: CropState) => CropState) => void;
}) {
  const t = useT();
  const update = (patch: Partial<CropState>) =>
    onChange((c) => clampCrop({ ...c, ...patch }, photo.width, photo.height));
  const aspects: { value: CropAspect; label: string }[] = [
    { value: 'original', label: t.capture.aspectOriginal },
    { value: '1:1', label: '1:1' },
    { value: '4:5', label: '4:5' },
    { value: '16:9', label: '16:9' },
  ];
  return (
    <View style={styles.controls}>
      <Segmented options={aspects} value={crop.aspect} onChange={(aspect) => update({ aspect, zoom: 1, cx: 0.5, cy: 0.5 })} />
      <View style={styles.tools}>
        <ToolButton
          icon={{ ios: 'minus', android: 'remove' }}
          label={t.capture.zoomOut}
          disabled={crop.zoom <= 1}
          onPress={() => update({ zoom: crop.zoom / ZOOM_STEP })}
        />
        <ToolButton
          icon={{ ios: 'plus', android: 'add' }}
          label={t.capture.zoomIn}
          disabled={crop.zoom >= MAX_ZOOM}
          onPress={() => update({ zoom: crop.zoom * ZOOM_STEP })}
        />
        <ToolButton
          icon={{ ios: 'rotate.right', android: 'rotate_right' }}
          label={t.capture.rotate}
          onPress={() => update({ turns: (crop.turns + 1) % 4, zoom: 1, cx: 0.5, cy: 0.5 })}
        />
        <ToolButton
          icon={{ ios: 'arrow.counterclockwise', android: 'restart_alt' }}
          label={t.capture.resetCrop}
          onPress={() => onChange(() => INITIAL_CROP)}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  window: { overflow: 'hidden', borderRadius: 4, backgroundColor: '#000000' },
  grid: StyleSheet.absoluteFill,
  line: { position: 'absolute', backgroundColor: 'rgba(255,255,255,0.45)' },
  vertical: { top: 0, bottom: 0, width: StyleSheet.hairlineWidth },
  horizontal: { left: 0, right: 0, height: StyleSheet.hairlineWidth },
  controls: { gap: Spacing.three },
  tools: { flexDirection: 'row', justifyContent: 'center', gap: Spacing.three },
});
