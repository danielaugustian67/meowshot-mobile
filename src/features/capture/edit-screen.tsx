import { Image } from 'expo-image';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FormError } from '@/components/form-screen';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/ui/segmented';
import { Spacing } from '@/constants/theme';
import { updateDraft, useCaptureDraft } from '@/features/capture/draft';
import { cropPhoto } from '@/features/capture/media';
import { INITIAL_CROP, type CropState } from '@/features/photo-edit/crop';
import { CropCanvas, CropControls } from '@/features/photo-edit/crop-editor';
import { DecorationControls, DecorationPrint, useDecorationEditor } from '@/features/photo-edit/decoration-editor';
import { useDiscardGuard } from '@/features/photo-edit/use-discard-guard';
import { useTheme } from '@/hooks/use-theme';
import type { PhotoDecoration } from '@/lib/api/types';
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
  const editor = useDecorationEditor(opened.decoration);
  const decoration = editor.decoration;
  const [area, setArea] = useState({ width: 0, height: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const leave = useDiscardGuard(crop !== opened.crop || decoration !== opened.decoration);

  if (!draft || !source || !cropped.photo) return <Redirect href="/capture" />;
  const photo = cropped.photo;
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
    editor.setSelected(null);
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
      leave();
      router.back();
    });
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
          <DecorationPrint
            editor={editor}
            tab={tab}
            // The cat isn't known yet for a new one, so "Auto" previews the first colour and pattern.
            catId={0}
            area={area}
            width={photo.width}
            height={photo.height}
            photo={
              <Image
                source={{ uri: photo.uri }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                accessibilityLabel={t.capture.photoAlt}
              />
            }
          />
        )}
      </View>

      {tab === 'crop' ? (
        <CropControls photo={source} crop={crop} onChange={setCrop} />
      ) : (
        <DecorationControls editor={editor} tab={tab} catId={0} />
      )}

      <FormError message={error} />
      <Button title={t.capture.editDone} onPress={finish} loading={busy} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: Spacing.three, paddingTop: Spacing.two, gap: Spacing.three },
  area: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 0 },
});
