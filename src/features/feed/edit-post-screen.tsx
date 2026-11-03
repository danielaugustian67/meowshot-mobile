import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Switch, View } from 'react-native';

import { FormError } from '@/components/form-screen';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/ui/segmented';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { LocationPreview } from '@/features/capture/location-preview';
import { editPhotoHref } from '@/hooks/use-stack-links';
import { useTheme } from '@/hooks/use-theme';
import { postsApi } from '@/lib/api/endpoints';
import { errorMessage } from '@/lib/api/errors';
import type { LocPrecision, Post, Visibility } from '@/lib/api/types';
import { confirmDestructive } from '@/lib/confirm';
import { useT } from '@/lib/i18n';
import { queryClient, queryKeys } from '@/lib/query';

import { cachedPost, dropPost, updateCachedPost } from './post-cache';

/** A sheet over a post of yours: the caption, who sees it, comments, its frame, or deleting it. */
export default function EditPostScreen() {
  const id = Number(useLocalSearchParams<{ id: string }>().id);
  // Only a post on screen opens this sheet, so it is already cached.
  const post = queryClient.getQueryData<Post>(queryKeys.post(id)) ?? cachedPost(id);
  return post ? <EditPostForm post={post} /> : null;
}

function EditPostForm({ post }: { post: Post }) {
  const theme = useTheme();
  const t = useT();
  const [caption, setCaption] = useState(post.caption);
  const [visibility, setVisibility] = useState(post.visibility);
  const [precision, setPrecision] = useState(post.loc_precision);
  const [commentsOn, setCommentsOn] = useState(!post.comments_disabled);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const photo = post.photos[0];
  const location = post.location;
  const point = location?.lat != null && location.lng != null ? { lat: location.lat, lng: location.lng } : null;
  const audienceHint = { FRIENDS: t.share.friendsHint, PUBLIC: t.share.publicHint, PRIVATE: t.share.privateHint };
  const precisionHint = { EXACT: t.share.exactHint, APPROX: t.share.approxHint, HIDDEN: t.share.hiddenHint };
  const showsLocation = visibility !== 'PRIVATE' && (point || location?.label);
  // A hidden post may have borrowed the cat's latest sighting, so unhiding it shows the spot before it is saved.
  const revealing = post.loc_precision === 'HIDDEN' && precision !== 'HIDDEN';
  const exactInPublic = visibility === 'PUBLIC' && precision === 'EXACT';

  /** Sends only what changed, closes the sheet, then does `next`. */
  async function save(next?: () => void) {
    const nextCaption = caption.trim();
    const body = {
      caption: nextCaption !== post.caption ? nextCaption : undefined,
      visibility: visibility !== post.visibility ? visibility : undefined,
      loc_precision: precision !== post.loc_precision ? precision : undefined,
      comments_disabled: commentsOn === post.comments_disabled ? !commentsOn : undefined,
    };
    setError(null);
    setBusy(true);
    try {
      if (Object.values(body).some((v) => v !== undefined)) {
        const updated = await postsApi.update(post.id, body);
        updateCachedPost(post.id, () => updated);
        // Who may see it decides which feeds list it.
        if (body.visibility) {
          queryClient.invalidateQueries({ queryKey: queryKeys.postsAll, predicate: (q) => q.queryKey[1] !== 'detail' });
        }
      }
      router.back();
      next?.();
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  async function remove() {
    setError(null);
    setBusy(true);
    try {
      await postsApi.delete(post.id);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
      return;
    }
    router.back();
    dropPost(post.id);
  }

  function confirmRemove() {
    confirmDestructive({
      title: t.feed.deleteTitle,
      body: t.feed.deleteBody,
      action: t.feed.deleteAction,
      cancel: t.common.cancel,
      onConfirm: remove,
    });
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets>
      <ThemedText type="subtitle">{t.feed.editTitle}</ThemedText>
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
            onChange={setPrecision}
          />
          <ThemedText type="small" themeColor="textSecondary">
            {location?.label && precision !== 'HIDDEN' ? `📍 ${location.label} · ${precisionHint[precision]}` : precisionHint[precision]}
          </ThemedText>
          {revealing || exactInPublic ? (
            <View style={[styles.warning, { borderColor: theme.tint, backgroundColor: theme.backgroundElement }]}>
              {exactInPublic ? <ThemedText type="smallBold">⚠️ {t.share.exactPublicWarning}</ThemedText> : null}
              {revealing ? <ThemedText type="smallBold">⚠️ {t.feed.revealWarning}</ThemedText> : null}
              {point ? <LocationPreview lat={point.lat} lng={point.lng} /> : null}
            </View>
          ) : null}
        </View>
      ) : null}

      <View style={styles.toggle}>
        <ThemedText style={styles.flex}>{t.feed.allowComments}</ThemedText>
        <Switch
          accessibilityLabel={t.feed.allowComments}
          value={commentsOn}
          onValueChange={setCommentsOn}
          trackColor={{ true: theme.tint }}
          thumbColor="#ffffff"
        />
      </View>

      <FormError message={error} />
      <Button title={t.common.save} onPress={() => save()} loading={busy} />
      {photo ? (
        <Button
          title={t.capture.editDecoration}
          variant="secondary"
          onPress={() => save(() => router.push(editPhotoHref(photo.id, post.cat.id, post.id)))}
          disabled={busy}
        />
      ) : null}
      <View style={styles.danger}>
        <Pressable
          accessibilityRole="button"
          onPress={confirmRemove}
          disabled={busy}
          hitSlop={8}
          style={({ pressed }) => ({ opacity: pressed || busy ? 0.5 : 1 })}>
          <ThemedText type="smallBold" style={{ color: theme.danger }}>
            {t.feed.delete}
          </ThemedText>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.three },
  caption: { minHeight: 90, paddingTop: 12, paddingBottom: 12, textAlignVertical: 'top' },
  section: { gap: Spacing.two },
  warning: { borderWidth: 1, borderRadius: 14, padding: Spacing.three, gap: Spacing.two },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  danger: { alignItems: 'center', paddingVertical: Spacing.three },
});
