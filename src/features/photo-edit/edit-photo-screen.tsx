import type { InfiniteData } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FormError } from '@/components/form-screen';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/ui/segmented';
import { Spacing } from '@/constants/theme';
import { photoChanged } from '@/features/cats/queries';
import { cachedPost } from '@/features/feed/post-cache';
import { useTheme } from '@/hooks/use-theme';
import { photosApi } from '@/lib/api/endpoints';
import { errorMessage } from '@/lib/api/errors';
import type { Page, Photo, PhotoDecoration, Post } from '@/lib/api/types';
import { useT } from '@/lib/i18n';
import { queryClient, queryKeys } from '@/lib/query';

import { cleanDecoration } from './decoration';
import { DecorationControls, DecorationPrint, useDecorationEditor, type DecorationTab } from './decoration-editor';
import { useDiscardGuard } from './use-discard-guard';

type Params = {
  photoId: string;
  catId: string;
  /** Set when opened from the post, whose photo may not be in a loaded gallery. */
  postId?: string;
};

/** The photo as a loaded gallery or post has it. Not sent as a route param: those are decoded again, which can break a signed URL. */
function cachedPhoto({ photoId, catId, postId }: Params) {
  const id = Number(photoId);
  const gallery = queryClient.getQueryData<InfiniteData<Page<Photo>>>(queryKeys.catPhotos(Number(catId)));
  const inGallery = gallery?.pages.flatMap((p) => p.items).find((x) => x.id === id);
  if (inGallery) return inGallery;
  if (!postId) return undefined;
  const post = queryClient.getQueryData<Post>(queryKeys.post(Number(postId))) ?? cachedPost(Number(postId));
  return post?.photos.find((x) => x.id === id);
}

/**
 * Changes the frame and stickers of a photo already saved, wherever it is shown. They are stored as data beside the
 * photo, so this can change them any time. A crop is cut into the file before upload, so it can't be redone here.
 */
export default function EditPhotoScreen() {
  const params = useLocalSearchParams<Params>();
  // Read once: a refetch behind this screen only brings a new signed URL for the same photo.
  const [photo] = useState(() => cachedPhoto(params));
  return photo ? <EditPhotoForm photo={photo} catId={Number(params.catId)} /> : null;
}

function EditPhotoForm({ photo, catId }: { photo: Post['photos'][number]; catId: number }) {
  const theme = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const [opened] = useState<PhotoDecoration>(() => photo.decoration ?? {});
  const editor = useDecorationEditor(opened);
  const [tab, setTab] = useState<DecorationTab>('frame');
  const [area, setArea] = useState({ width: 0, height: 0 });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const leave = useDiscardGuard(editor.decoration !== opened);

  async function save() {
    if (editor.decoration === opened) {
      router.back();
      return;
    }
    setError(null);
    setBusy(true);
    try {
      photoChanged(await photosApi.update(photo.id, { decoration: cleanDecoration(editor.decoration) }));
      leave();
      router.back();
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  const tabs: { value: DecorationTab; label: string }[] = [
    { value: 'frame', label: t.capture.tabFrame },
    { value: 'stickers', label: t.capture.tabStickers },
  ];

  return (
    <View style={[styles.screen, { backgroundColor: theme.background, paddingBottom: insets.bottom + Spacing.three }]}>
      <Segmented
        options={tabs}
        value={tab}
        onChange={(next) => {
          editor.setSelected(null);
          setTab(next);
        }}
      />

      <View style={styles.area} onLayout={(e) => setArea(e.nativeEvent.layout)}>
        {area.width === 0 ? null : (
          <DecorationPrint
            editor={editor}
            tab={tab}
            catId={catId}
            area={area}
            width={photo.width}
            height={photo.height}
            photo={
              <Image
                source={{ uri: photo.url ?? undefined, cacheKey: `photo-${photo.id}` }}
                placeholder={photo.thumb_url ? { uri: photo.thumb_url, cacheKey: `photo-thumb-${photo.id}` } : undefined}
                placeholderContentFit="cover"
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                accessibilityLabel={t.cats.photo}
              />
            }
          />
        )}
      </View>

      <DecorationControls editor={editor} tab={tab} catId={catId} />

      <FormError message={error} />
      <Button title={t.common.save} onPress={save} loading={busy} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: Spacing.three, paddingTop: Spacing.two, gap: Spacing.three },
  area: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 0 },
});
