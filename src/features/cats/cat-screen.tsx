import { Image } from 'expo-image';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, useWindowDimensions, View } from 'react-native';

import { FormError } from '@/components/form-screen';
import { PawPattern } from '@/components/paw-pattern';
import { CatSkeleton, PhotoGridSkeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { ActionMenu, showNativeActionMenu, type MenuAction } from '@/components/ui/action-menu';
import { Button } from '@/components/ui/button';
import { SectionTitle } from '@/components/ui/section-title';
import { LeanList } from '@/constants/list';
import { Fonts, PaperInk, Pastels, Spacing } from '@/constants/theme';
import { editPhotoHref, sharePhotoHref, useStackLinks } from '@/hooks/use-stack-links';
import { useTheme } from '@/hooks/use-theme';
import { Alert } from '@/lib/alert';
import { catsApi, photosApi } from '@/lib/api/endpoints';
import { errorMessage } from '@/lib/api/errors';
import type { Cat, Photo, Sighting } from '@/lib/api/types';
import { confirmDestructive } from '@/lib/confirm';
import { catName, daysAgo, timeAgo } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { queryClient, queryKeys } from '@/lib/query';

import { BoothMark, PaperMotif } from './cat-tile';
import { catChanged, photoRemoved, useCat, useCatPhotos, useCatSightings } from './queries';
import { StickerLayer } from '@/features/photo-edit/sticker-layer';

const COLUMNS = 3;
const GAP = Spacing.one;

/**
 * One of your cats: a big photobooth print of the cover, what you know about them, where they were seen and every photo.
 * Photos can become the cover, be shared, open the post they were shared in, get a new frame or be deleted; the pencil edits the name and notes.
 */
export default function CatScreen() {
  const theme = useTheme();
  const t = useT();
  const id = Number(useLocalSearchParams<{ id: string }>().id);
  const cat = useCat(id);
  const photos = useCatPhotos(id);
  const [refreshing, setRefreshing] = useState(false);
  // An exact size rather than flex, so a short last row keeps the same squares.
  const tile = (useWindowDimensions().width - 2 * Spacing.four - (COLUMNS - 1) * GAP) / COLUMNS;

  if (!cat.data) {
    if (!cat.isError) return <CatSkeleton />;
    return (
      <ThemedView style={[styles.center, styles.error]}>
        <PawPattern />
        <FormError message={errorMessage(cat.error)} />
        <Button title={t.common.retry} variant="secondary" onPress={() => cat.refetch()} loading={cat.isRefetching} />
      </ThemedView>
    );
  }

  const current = cat.data;

  async function refresh() {
    setRefreshing(true);
    await Promise.all([
      cat.refetch(),
      photos.refetch(),
      queryClient.invalidateQueries({ queryKey: queryKeys.catSightings(id) }),
    ]);
    setRefreshing(false);
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: catName(current.name),
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t.cats.edit}
              onPress={() => router.push({ pathname: '/edit-cat', params: { id: String(id) } })}
              hitSlop={8}>
              <SymbolView name={{ ios: 'pencil', android: 'edit', web: 'edit' }} size={22} tintColor={theme.text} />
            </Pressable>
          ),
        }}
      />
      <FlatList
        {...LeanList}
        data={photos.data?.pages.flatMap((p) => p.items) ?? []}
        keyExtractor={(p) => String(p.id)}
        renderItem={({ item }) => <PhotoTile photo={item} cat={current} size={tile} />}
        numColumns={COLUMNS}
        columnWrapperStyle={styles.photoRow}
        contentInsetAdjustmentBehavior="automatic"
        style={{ backgroundColor: theme.background }}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
        ListHeaderComponent={
          <View style={styles.header}>
            <PawPattern inScroll />
            <Hero cat={current} />
            <Facts cat={current} />
            {current.notes ? <Notes notes={current.notes} /> : null}
            <Sightings cat={current} />
            <SectionTitle title={t.cats.gallery} count={current.photo_count} />
          </View>
        }
        onEndReached={() => {
          if (photos.hasNextPage && !photos.isFetchingNextPage) photos.fetchNextPage();
        }}
        onEndReachedThreshold={0.5}
        ListFooterComponent={photos.isFetchingNextPage ? <ActivityIndicator style={styles.spinner} /> : undefined}
        ListEmptyComponent={
          photos.isPending ? (
            <PhotoGridSkeleton />
          ) : photos.isError ? (
            <View style={styles.error}>
              <FormError message={errorMessage(photos.error)} />
              <Button title={t.common.retry} variant="secondary" onPress={() => photos.refetch()} />
            </View>
          ) : (
            <ThemedText type="small" themeColor="textSecondary">
              {t.cats.noPhotos}
            </ThemedText>
          )
        }
      />
    </>
  );
}

/** The cover as a large photobooth print on the cat's patterned paper, with the favourite heart on the photo. */
function Hero({ cat }: { cat: Cat }) {
  const theme = useTheme();
  const t = useT();
  const frame = Pastels[cat.id % Pastels.length];
  const cover = cat.cover;
  return (
    <View style={[styles.hero, { backgroundColor: frame }]}>
      <PaperMotif id={cat.id} />
      <View style={[styles.cover, { backgroundColor: theme.backgroundElement }]}>
        {cover?.url ? (
          <Image
            // The tile's thumbnail is already cached, so it shows at once while the full photo loads.
            source={{ uri: cover.url, cacheKey: `photo-${cover.photo_id}` }}
            placeholder={cover.thumb_url ? { uri: cover.thumb_url, cacheKey: `photo-thumb-${cover.photo_id}` } : undefined}
            placeholderContentFit="cover"
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={150}
            accessibilityLabel={t.feed.photoAlt(catName(cat.name))}
          />
        ) : (
          <SymbolView
            name={{ ios: 'pawprint.fill', android: 'pets', web: 'pets' }}
            size={56}
            tintColor={theme.textSecondary}
          />
        )}
        <FavoriteButton cat={cat} />
      </View>
      <ThemedText numberOfLines={2} style={styles.heroName}>
        {catName(cat.name)}
      </ThemedText>
      <BoothMark />
    </View>
  );
}

/** Saved at once and shown before the server answers; a failure puts the heart back. */
function FavoriteButton({ cat }: { cat: Cat }) {
  const theme = useTheme();
  const t = useT();

  async function toggle() {
    const next = !cat.is_favorite;
    queryClient.setQueryData<Cat>(queryKeys.cat(cat.id), { ...cat, is_favorite: next });
    try {
      catChanged(await catsApi.update(cat.id, { is_favorite: next }));
    } catch (e) {
      queryClient.setQueryData<Cat>(queryKeys.cat(cat.id), cat);
      Alert.alert(errorMessage(e));
    }
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={cat.is_favorite ? t.cats.removeFavorite : t.cats.addFavorite}
      accessibilityState={{ selected: cat.is_favorite }}
      onPress={toggle}
      hitSlop={8}
      style={({ pressed }) => [styles.favorite, pressed && styles.pressed]}>
      <SymbolView
        name={
          cat.is_favorite
            ? { ios: 'heart.fill', android: 'favorite', web: 'favorite' }
            : { ios: 'heart', android: 'favorite_border', web: 'favorite_border' }
        }
        size={22}
        tintColor={cat.is_favorite ? theme.tint : '#ffffff'}
      />
    </Pressable>
  );
}

/** Small pills: how many photos, how often seen, how long you've known each other. */
function Facts({ cat }: { cat: Cat }) {
  const t = useT();
  const facts = [
    `📸 ${t.cats.photos(cat.photo_count)}`,
    `👀 ${t.cats.seen(cat.sighting_count)}`,
    `🤝 ${t.cats.met(daysAgo(cat.created_at))}`,
  ];
  return (
    <View style={styles.facts}>
      {facts.map((f) => (
        <Pill key={f} label={f} />
      ))}
    </View>
  );
}

function Pill({ label }: { label: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.pill, { backgroundColor: theme.backgroundElement }]}>
      <ThemedText type="small">{label}</ThemedText>
    </View>
  );
}

function Notes({ notes }: { notes: string }) {
  const theme = useTheme();
  const t = useT();
  return (
    <View style={styles.section}>
      <SectionTitle title={t.cats.notes} />
      <View style={[styles.card, styles.notes, { backgroundColor: theme.backgroundElement }]}>
        <ThemedText>{notes}</ThemedText>
      </View>
    </View>
  );
}

/** The latest few places the cat turned up, with more on request. */
function Sightings({ cat }: { cat: Cat }) {
  const theme = useTheme();
  const t = useT();
  const query = useCatSightings(cat.id);
  const items = query.data?.pages.flatMap((p) => p.items) ?? [];
  return (
    <View style={styles.section}>
      <SectionTitle title={t.cats.sightings} count={cat.sighting_count} />
      {query.isPending ? (
        <ActivityIndicator style={styles.spinner} />
      ) : query.isError ? (
        <FormError message={errorMessage(query.error)} />
      ) : items.length ? (
        <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
          {items.map((s, i) => (
            <SightingRow key={s.id} sighting={s} divider={i > 0} />
          ))}
        </View>
      ) : (
        <ThemedText type="small" themeColor="textSecondary">
          {t.cats.noSightings}
        </ThemedText>
      )}
      {query.hasNextPage ? (
        <Button
          title={t.cats.showMore}
          variant="ghost"
          size="small"
          onPress={() => query.fetchNextPage()}
          loading={query.isFetchingNextPage}
          style={styles.more}
        />
      ) : null}
    </View>
  );
}

function SightingRow({ sighting, divider }: { sighting: Sighting; divider: boolean }) {
  const theme = useTheme();
  const t = useT();
  const { label, lat, lng } = sighting;
  // Without a name, the coordinates are still worth showing; the cat map will put them on a map.
  const place = label || (lat !== null && lng !== null ? `${lat.toFixed(4)}, ${lng.toFixed(4)}` : t.cats.unnamedPlace);
  return (
    <View style={[styles.sighting, divider && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: theme.border }]}>
      <SymbolView
        name={{ ios: 'mappin.circle.fill', android: 'location_on', web: 'location_on' }}
        size={22}
        tintColor={theme.tint}
      />
      <View style={styles.sightingText}>
        <ThemedText numberOfLines={2}>{place}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {timeAgo(sighting.seen_at)}
        </ThemedText>
      </View>
    </View>
  );
}

/** A square thumbnail; tapping it offers everything you can do with the photo. */
function PhotoTile({ photo, cat, size }: { photo: Photo; cat: Cat; size: number }) {
  const theme = useTheme();
  const t = useT();
  const { openPost, tab } = useStackLinks();
  const isCover = cat.cover?.photo_id === photo.id;
  const postId = photo.post_id;
  const [menuOpen, setMenuOpen] = useState(false);

  async function makeCover() {
    try {
      catChanged(await catsApi.setCover(cat.id, photo.id));
    } catch (e) {
      Alert.alert(errorMessage(e));
    }
  }

  async function remove() {
    try {
      await photosApi.delete(photo.id);
      photoRemoved(photo);
    } catch (e) {
      Alert.alert(errorMessage(e));
    }
  }

  function confirmRemove() {
    confirmDestructive({
      title: t.cats.deletePhotoTitle,
      body: postId ? t.cats.deletePhotoBodyPosted : t.cats.deletePhotoBody,
      action: t.feed.deleteAction,
      cancel: t.common.cancel,
      onConfirm: remove,
    });
  }

  const actions: MenuAction[] = [
    ...(isCover ? [] : [{ label: t.cats.makeCover, run: makeCover }]),
    postId ? { label: t.cats.viewPost, run: () => openPost(postId) } : { label: t.capture.share, run: () => router.push(sharePhotoHref(photo, tab)) },
    { label: t.capture.editDecoration, run: () => router.push(editPhotoHref(photo.id, cat.id)) },
    { label: t.cats.deletePhoto, run: confirmRemove, destructive: true },
  ];

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={isCover ? `${t.cats.photo}, ${t.cats.cover}` : t.cats.photo}
        onPress={() => {
          if (!showNativeActionMenu(actions, t.common.cancel)) setMenuOpen(true);
        }}
        style={({ pressed }) => [
          styles.photo,
          { width: size, height: size, backgroundColor: theme.backgroundElement },
          pressed && styles.pressed,
        ]}>
        {photo.thumb_url ? (
          <Image
            source={{ uri: photo.thumb_url, cacheKey: `photo-thumb-${photo.id}` }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={150}
          />
        ) : null}
        <StickerLayer stickers={photo.decoration?.stickers} photoRatio={photo.width / photo.height || 1} />
        {isCover ? (
          <View style={styles.coverBadge}>
            <SymbolView name={{ ios: 'star.fill', android: 'star', web: 'star' }} size={12} tintColor="#ffffff" />
          </View>
        ) : null}
      </Pressable>
      {menuOpen ? (
        <ActionMenu title={t.cats.photo} actions={actions} cancel={t.common.cancel} onClose={() => setMenuOpen(false)} />
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  error: { gap: Spacing.three, padding: Spacing.four },
  content: { padding: Spacing.four, paddingBottom: Spacing.five },
  header: { gap: Spacing.four, paddingBottom: Spacing.three },
  hero: {
    alignSelf: 'center',
    // Narrower than the screen, so the facts below still show above the fold.
    width: '80%',
    maxWidth: 360,
    marginTop: Spacing.two,
    borderRadius: 4,
    padding: Spacing.three,
    transform: [{ rotate: '-1deg' }],
  },
  cover: {
    aspectRatio: 1,
    borderRadius: 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroName: {
    color: PaperInk,
    fontFamily: Fonts.rounded,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: 800,
    textAlign: 'center',
    paddingTop: Spacing.three,
    paddingBottom: Spacing.one,
  },
  // Always dark behind the white heart, so it reads on any photo in both themes.
  favorite: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  pressed: { opacity: 0.7 },
  facts: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.two },
  pill: { paddingHorizontal: Spacing.three, paddingVertical: Spacing.one, borderRadius: 14 },
  section: { gap: Spacing.two },
  card: { borderRadius: 14, overflow: 'hidden' },
  notes: { padding: Spacing.three },
  sighting: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three },
  sightingText: { flex: 1, gap: 2 },
  more: { alignSelf: 'center' },
  photoRow: { gap: GAP, marginBottom: GAP },
  photo: { borderRadius: 8, overflow: 'hidden' },
  coverBadge: {
    position: 'absolute',
    top: Spacing.one,
    left: Spacing.one,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  spinner: { paddingVertical: Spacing.four },
});
