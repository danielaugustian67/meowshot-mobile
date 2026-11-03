import { Image } from 'expo-image';
import { Redirect, router, usePreventRemove } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FormError } from '@/components/form-screen';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/ui/segmented';
import { Spacing } from '@/constants/theme';
import { updateDraft, useCaptureDraft } from '@/features/capture/draft';
import { cropPhoto } from '@/features/capture/media';
import { INITIAL_CROP, type CropState } from '@/features/photo-edit/crop';
import { CropCanvas, CropControls } from '@/features/photo-edit/crop-editor';
import { clampSticker, displayRatio, motifOf, paperColor } from '@/features/photo-edit/decoration';
import { FramePicker } from '@/features/photo-edit/frame-picker';
import { PhotoPrint, printWidthFor } from '@/features/photo-edit/photo-print';
import { StickerCanvas, StickerControls } from '@/features/photo-edit/sticker-editor';
import { useTheme } from '@/hooks/use-theme';
import type { PhotoDecoration, PhotoSticker } from '@/lib/api/types';
import { useT } from '@/lib/i18n';

type Tab = 'crop' | 'frame' | 'stickers';

/** Crop, frame and stickers for the photo being captured. Nothing reaches the draft until "Done". */
export default function EditScreen() {
  const theme = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const draft = useCaptureDraft();
  const [tab, setTab] = useState<Tab>('crop');
  // Cropping always starts over from the first photo, so repeated crops never lose quality or detail.
  const source = draft?.source ?? draft?.photo;
  const [opened] = useState<{ crop: CropState; decoration: PhotoDecoration }>(() => ({
    crop: draft?.crop ?? INITIAL_CROP,
    decoration: draft?.decoration ?? {},
  }));
  const [crop, setCrop] = useState(opened.crop);
  const [cropped, setCropped] = useState(() => ({ photo: draft?.photo, crop: opened.crop }));
  const [decoration, setDecoration] = useState(opened.decoration);
  const [selected, setSelected] = useState<number | null>(null);
  const [area, setArea] = useState({ width: 0, height: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [leaving, setLeaving] = useState(false);
  const changed = crop !== opened.crop || decoration !== opened.decoration;
  const allowLeaving = usePreventRemove(changed && !leaving, ({ repeat }) => {
    const leave = () => {
      setLeaving(true);
      repeat();
    };
    if (Platform.OS === 'web') {
      // Alert does nothing on web, which would leave no way out of this screen.
      if (window.confirm(t.capture.editDiscardTitle)) leave();
      return;
    }
    Alert.alert(t.capture.editDiscardTitle, t.capture.editDiscardBody, [
      { text: t.capture.editKeep, style: 'cancel' },
      { text: t.capture.editDiscard, style: 'destructive', onPress: leave },
    ]);
  });

  if (!draft || !source || !cropped.photo) return <Redirect href="/capture" />;
  const photo = cropped.photo;
  const photoRatio = photo.width / photo.height || 1;
  const ratio = displayRatio(photo.width, photo.height);
  const stickers = decoration.stickers ?? [];
  // The cat isn't known yet for a new one, so "Auto" previews the first colour and pattern.
  const color = paperColor(decoration, 0);

  /** The photo as the crop now stands, cut only when the crop changed since last time. */
  async function applyCrop() {
    if (cropped.crop === crop && cropped.photo) return cropped.photo;
    const next = await cropPhoto(source!, crop);
    setCropped({ photo: next, crop });
    return next;
  }

  async function run(work: () => Promise<void>) {
    setError(null);
    setBusy(true);
    try {
      await work();
    } catch {
      setError(t.capture.editFailed);
    } finally {
      setBusy(false);
    }
  }

  function changeTab(next: Tab) {
    setSelected(null);
    if (next === 'crop') setTab(next);
    else run(async () => {
      await applyCrop();
      setTab(next);
    });
  }

  function finish() {
    run(async () => {
      const next = await applyCrop();
      updateDraft({ photo: next, source, crop, decoration });
      setLeaving(true);
      allowLeaving();
      router.back();
    });
  }

  function setStickers(next: PhotoSticker[]) {
    setDecoration((d) => ({ ...d, stickers: next.length ? next : undefined }));
  }

  function changeSticker(index: number, update: (sticker: PhotoSticker) => PhotoSticker) {
    setDecoration((d) => ({
      ...d,
      stickers: d.stickers?.map((s, i) => (i === index ? clampSticker(update(s)) : s)),
    }));
  }

  const tabs: { value: Tab; label: string }[] = [
    { value: 'crop', label: t.capture.tabCrop },
    { value: 'frame', label: t.capture.tabFrame },
    { value: 'stickers', label: t.capture.tabStickers },
  ];

  return (
    <View style={[styles.screen, { backgroundColor: theme.background, paddingBottom: insets.bottom + Spacing.three }]}>
      <Segmented options={tabs} value={tab} onChange={changeTab} />

      <View style={styles.area} onLayout={(e) => setArea(e.nativeEvent.layout)}>
        {area.width === 0 ? null : tab === 'crop' ? (
          <CropCanvas photo={source} crop={crop} area={area} onChange={setCrop} />
        ) : (
          <PhotoPrint
            color={color}
            motif={motifOf(decoration, 0)}
            ratio={ratio}
            photoRatio={photoRatio}
            style={{ width: printWidthFor(area.width, area.height, ratio) }}
            photo={
              <Image
                source={{ uri: photo.uri }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                accessibilityLabel={t.capture.photoAlt}
              />
            }
            stickers={tab === 'frame' ? stickers : undefined}
            overlay={
              tab === 'stickers' ? (
                <StickerCanvas
                  stickers={stickers}
                  photoRatio={photoRatio}
                  selected={selected}
                  onSelect={setSelected}
                  onChange={changeSticker}
                />
              ) : undefined
            }
          />
        )}
      </View>

      {tab === 'crop' ? <CropControls photo={source} crop={crop} onChange={setCrop} /> : null}
      {tab === 'frame' ? (
        <FramePicker decoration={decoration} color={color} onChange={(patch) => setDecoration((d) => ({ ...d, ...patch }))} />
      ) : null}
      {tab === 'stickers' ? (
        <StickerControls
          stickers={stickers}
          selected={selected}
          onAdd={(sticker) => {
            setStickers([...stickers, sticker]);
            setSelected(stickers.length);
          }}
          onChange={changeSticker}
          onRemove={(index) => {
            setStickers(stickers.filter((_, i) => i !== index));
            setSelected(null);
          }}
        />
      ) : null}

      <FormError message={error} />
      <Button title={t.capture.editDone} onPress={finish} loading={busy} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: Spacing.three, paddingTop: Spacing.two, gap: Spacing.three },
  area: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 0 },
});
