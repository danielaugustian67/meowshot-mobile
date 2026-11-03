import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { FormError } from '@/components/form-screen';
import { PawPattern } from '@/components/paw-pattern';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/ui/segmented';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { LocationPreview } from '@/features/capture/location-preview';
import { displayRatio, hasDecoration, motifOf, paperColor, parseDecoration } from '@/features/photo-edit/decoration';
import { PhotoPrint } from '@/features/photo-edit/photo-print';
import { postHref, type StackTab } from '@/hooks/use-stack-links';
import { useTheme } from '@/hooks/use-theme';
import { postsApi } from '@/lib/api/endpoints';
import { errorMessage } from '@/lib/api/errors';
import type { LocPrecision, Visibility } from '@/lib/api/types';
import { useT } from '@/lib/i18n';
import { queryClient, queryKeys } from '@/lib/query';

type Params = {
  catId: string;
  photoId: string;
  /** Missing for a photo shared from the collection, which doesn't record where it was taken. */
  sightingId?: string;
  /** The tab a photo from the collection was shared from, where its post opens. */
  tab?: StackTab;
  /** The local copy of a photo just uploaded, so the preview needs no download; otherwise its URL. */
  photoUri: string;
  ratio: string;
  lat?: string;
  lng?: string;
  label?: string;
  /** JSON, when the photo has a chosen frame or stickers. */
  decoration?: string;
};

/** Turns the photo just saved to the collection into a post. Friends only unless public is chosen. */
export default function ShareScreen() {
  const theme = useTheme();
  const t = useT();
  const p = useLocalSearchParams<Params>();
  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('FRIENDS');
  const fromCollection = !p.sightingId;
  const decoration = parseDecoration(p.decoration);
  const catId = Number(p.catId);
  // Until the user picks one, follow the server's default: exact for public posts, approximate otherwise.
  const [picked, setPicked] = useState<LocPrecision | null>(null);
  // The server falls back to the cat's latest sighting, which may not be where this photo was taken: no point for it.
  const precision = fromCollection ? 'HIDDEN' : (picked ?? (visibility === 'PUBLIC' ? 'EXACT' : 'APPROX'));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const point = p.lat && p.lng ? { lat: Number(p.lat), lng: Number(p.lng) } : null;
  // Only the owner sees a private post, so where it was taken is not being shared.
  const showsLocation = visibility !== 'PRIVATE' && (point || p.label);
  const audienceHint = { FRIENDS: t.share.friendsHint, PUBLIC: t.share.publicHint, PRIVATE: t.share.privateHint };
  const precisionHint = { EXACT: t.share.exactHint, APPROX: t.share.approxHint, HIDDEN: t.share.hiddenHint };

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      const post = await postsApi.create({
        cat_id: Number(p.catId),
        photo_ids: [Number(p.photoId)],
        sighting_id: p.sightingId ? Number(p.sightingId) : undefined,
        caption: caption.trim() || undefined,
        visibility,
        loc_precision: precision,
      });
      queryClient.setQueryData(queryKeys.post(post.id), post);
      queryClient.invalidateQueries({ queryKey: queryKeys.postsAll });
      queryClient.invalidateQueries({ queryKey: queryKeys.users });
      queryClient.invalidateQueries({ queryKey: queryKeys.me });
      queryClient.invalidateQueries({ queryKey: queryKeys.cats });
      if (fromCollection) {
        // Back from the post returns to the cat this photo was shared from.
        router.back();
        router.push(postHref(p.tab ?? 'feed', post.id));
        return;
      }
      // Leave this flow and show the new post in the Feed tab.
      router.dismissTo('/capture');
      router.navigate({ pathname: '/post/[id]', params: { id: String(post.id) } });
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        <PawPattern inScroll />
        {hasDecoration(decoration) ? (
          <PhotoPrint
            color={paperColor(decoration, catId)}
            motif={motifOf(decoration, catId)}
            ratio={displayRatio(Number(p.ratio) || 1, 1)}
            photoRatio={Number(p.ratio) || 1}
            stickers={decoration?.stickers}
            photo={
              <Image
                source={{ uri: p.photoUri }}
                style={StyleSheet.absoluteFill}
                contentFit="cover"
                accessibilityLabel={t.capture.photoAlt}
              />
            }
          />
        ) : (
          <Image
            source={{ uri: p.photoUri }}
            style={[styles.photo, { aspectRatio: Number(p.ratio) || 1 }]}
            contentFit="cover"
            accessibilityLabel={t.capture.photoAlt}
          />
        )}

        <TextField
          label={t.share.caption}
          placeholder={t.share.captionPlaceholder}
          value={caption}
          onChangeText={setCaption}
          multiline
          maxLength={2200}
          style={styles.caption}
        />

        <View style={styles.section}>
          <ThemedText type="smallBold">{t.share.audience}</ThemedText>
          <Segmented<Visibility>
            options={[
              { value: 'FRIENDS', label: t.share.friends },
              { value: 'PUBLIC', label: t.share.public },
              { value: 'PRIVATE', label: t.share.private },
            ]}
            value={visibility}
            onChange={setVisibility}
          />
          <ThemedText type="small" themeColor="textSecondary">
            {audienceHint[visibility]}
          </ThemedText>
        </View>

        {fromCollection && visibility !== 'PRIVATE' ? (
          <ThemedText type="small" themeColor="textSecondary">
            {t.share.collectionHint}
          </ThemedText>
        ) : null}

        {showsLocation ? (
          <View style={styles.section}>
            <ThemedText type="smallBold">{t.share.precision}</ThemedText>
            <Segmented<LocPrecision>
              options={[
                { value: 'EXACT', label: t.share.exact },
                { value: 'APPROX', label: t.share.approx },
                { value: 'HIDDEN', label: t.share.hidden },
              ]}
              value={precision}
              onChange={setPicked}
            />
            <ThemedText type="small" themeColor="textSecondary">
              {p.label && precision !== 'HIDDEN' ? `📍 ${p.label} · ${precisionHint[precision]}` : precisionHint[precision]}
            </ThemedText>
            {visibility === 'PUBLIC' && precision === 'EXACT' && point ? (
              <View style={[styles.warning, { borderColor: theme.tint, backgroundColor: theme.backgroundElement }]}>
                <ThemedText type="smallBold">⚠️ {t.share.exactPublicWarning}</ThemedText>
                <LocationPreview lat={point.lat} lng={point.lng} />
              </View>
            ) : null}
          </View>
        ) : null}

        <FormError message={error} />
        <Button title={t.share.post} onPress={submit} loading={busy} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.four, paddingBottom: Spacing.six },
  photo: { width: '100%', maxHeight: 320, borderRadius: 16 },
  caption: { minHeight: 90, paddingTop: Spacing.three, textAlignVertical: 'top' },
  section: { gap: Spacing.two },
  warning: { borderWidth: 1, borderRadius: 14, padding: Spacing.three, gap: Spacing.two },
});
