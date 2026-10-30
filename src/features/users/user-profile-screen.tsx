import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Fragment, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { FormError } from '@/components/form-screen';
import { PawPattern } from '@/components/paw-pattern';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Fonts, Pastels, Spacing } from '@/constants/theme';
import { useFriendAction } from '@/features/friends/queries';
import { RelationAction } from '@/features/friends/relation-action';
import { useStackLinks } from '@/hooks/use-stack-links';
import { useTheme } from '@/hooks/use-theme';
import { usersApi } from '@/lib/api/endpoints';
import { errorMessage } from '@/lib/api/errors';
import type { Post, Profile } from '@/lib/api/types';
import { catName } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { queryKeys } from '@/lib/query';

const PAGE = 30;
const COLUMNS = 3;

/** Someone's profile and the posts of theirs you may see: public ones, plus friends-only once you are friends. */
export default function UserProfileScreen() {
  const t = useT();
  const { username } = useLocalSearchParams<{ username: string }>();
  const profile = useQuery({
    queryKey: queryKeys.userProfile(username),
    queryFn: () => usersApi.profile(username),
  });

  return (
    <>
      {/* The name is in the header card already; the bar only carries Back. */}
      <Stack.Screen options={{ title: '' }} />
      {profile.data ? (
        <PostGrid profile={profile.data} refetchProfile={profile.refetch} />
      ) : (
        <ThemedView style={styles.center}>
          <PawPattern />
          {profile.isPending ? (
            <ActivityIndicator />
          ) : (
            <>
              {/* Blocked and suspended users answer 404, so this also covers them. */}
              <FormError message={errorMessage(profile.error)} />
              <Button
                title={t.common.retry}
                variant="secondary"
                onPress={() => profile.refetch()}
                loading={profile.isRefetching}
              />
            </>
          )}
        </ThemedView>
      )}
    </>
  );
}

function PostGrid({ profile, refetchProfile }: { profile: Profile; refetchProfile: () => Promise<unknown> }) {
  const theme = useTheme();
  const t = useT();
  const [refreshing, setRefreshing] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const posts = useInfiniteQuery({
    queryKey: queryKeys.userPosts(profile.username),
    queryFn: ({ pageParam }) => usersApi.posts(profile.username, { cursor: pageParam, limit: PAGE }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.next_cursor,
  });
  const items = posts.data?.pages.flatMap((p) => p.items) ?? [];

  // Only a pull shows the spinner; background refetches on focus stay silent.
  async function refresh() {
    setRefreshing(true);
    // The header's counts and friend button come from the profile query.
    await Promise.all([posts.refetch(), refetchProfile()]);
    setRefreshing(false);
  }

  return (
    <FlatList
      data={items}
      keyExtractor={(p) => String(p.id)}
      numColumns={COLUMNS}
      renderItem={({ item }) => <PostTile post={item} />}
      onContentSizeChange={(_, h) => setContentHeight(h)}
      ListHeaderComponent={
        <>
          {/* A zero-height anchor whose overflow spans the whole list, so the paws scroll with the grid. */}
          <View style={styles.patternAnchor}>
            <View style={[styles.patternBox, { height: contentHeight }]}>
              <PawPattern inScroll />
            </View>
          </View>
          <ProfileHeader profile={profile} />
        </>
      }
      ListEmptyComponent={
        posts.isPending ? (
          <ActivityIndicator style={styles.spinner} />
        ) : posts.isError ? (
          <View style={styles.note}>
            <FormError message={errorMessage(posts.error)} />
          </View>
        ) : (
          <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
            {t.user.emptyPosts}
          </ThemedText>
        )
      }
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      onEndReached={() => {
        if (posts.hasNextPage && !posts.isFetchingNextPage) posts.fetchNextPage();
      }}
      onEndReachedThreshold={0.5}
      ListFooterComponent={posts.isFetchingNextPage ? <ActivityIndicator style={styles.spinner} /> : undefined}
    />
  );
}

/** Where the banner's paws sit, as fractions of its width and height, with a slight tilt each. */
const BANNER_PAWS = [
  { x: 0.06, y: 0.18, size: 22, rotate: '-18deg' },
  { x: 0.24, y: 0.52, size: 16, rotate: '12deg' },
  { x: 0.42, y: 0.12, size: 18, rotate: '-6deg' },
  { x: 0.62, y: 0.5, size: 22, rotate: '20deg' },
  { x: 0.8, y: 0.14, size: 16, rotate: '-14deg' },
  { x: 0.9, y: 0.58, size: 20, rotate: '8deg' },
] as const;

/**
 * A pastel banner scattered with paws, coloured per user like the Kucingku polaroids,
 * with the avatar resting on its lower edge and the name, bio and counts below.
 */
function ProfileHeader({ profile }: { profile: Profile }) {
  const theme = useTheme();
  const t = useT();
  const { busy, run } = useFriendAction();
  const { status } = profile.relationship;
  const colour = Pastels[profile.id % Pastels.length];
  const counts = [
    { value: profile.cat_count, label: t.user.cats },
    { value: profile.post_count, label: t.user.postsLabel },
    { value: profile.friend_count, label: t.user.friends },
  ];

  return (
    <View style={styles.header}>
      {/* The page colour under the translucent wash, so the wallpaper does not show through. */}
      <View style={[styles.banner, { backgroundColor: theme.background }]}>
        <View style={[StyleSheet.absoluteFill, { backgroundColor: `${colour}55` }]} />
        {BANNER_PAWS.map((paw, i) => (
          <View
            key={i}
            style={[
              styles.bannerPaw,
              { left: `${paw.x * 100}%`, top: `${paw.y * 100}%`, transform: [{ rotate: paw.rotate }] },
            ]}>
            <SymbolView name={{ ios: 'pawprint.fill', android: 'pets', web: 'pets' }} size={paw.size} tintColor={colour} />
          </View>
        ))}
      </View>
      <View style={[styles.avatarRing, { backgroundColor: theme.background }]}>
        <Avatar user={profile} size={AVATAR} />
      </View>
      <ThemedText style={styles.username}>@{profile.username}</ThemedText>
      {profile.bio ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.bio}>
          {profile.bio}
        </ThemedText>
      ) : null}
      <ThemedText type="small" themeColor="textSecondary" style={styles.counts}>
        {counts.map((c, i) => (
          <Fragment key={c.label}>
            {i > 0 ? '  ·  ' : ''}
            <ThemedText type="smallBold">{c.value}</ThemedText> {c.label}
          </Fragment>
        ))}
      </ThemedText>
      <View style={styles.action}>
        <RelationAction user={profile} busy={busy} run={run} />
      </View>
      {status !== 'friends' && status !== 'self' ? (
        <View style={styles.lockNote}>
          <SymbolView name={{ ios: 'lock.fill', android: 'lock', web: 'lock' }} size={11} tintColor={theme.textSecondary} />
          <ThemedText type="small" themeColor="textSecondary" style={styles.lockText}>
            {t.user.friendsOnly}
          </ThemedText>
        </View>
      ) : null}
    </View>
  );
}

/** One post in the grid: its first photo, cropped square. */
function PostTile({ post }: { post: Post }) {
  const theme = useTheme();
  const t = useT();
  const { openPost } = useStackLinks();
  const photo = post.photos[0];
  return (
    <View style={styles.tileCell}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.user.openPost(catName(post.cat.name))}
        onPress={() => openPost(post.id)}
        style={({ pressed }) => [styles.tile, { backgroundColor: theme.backgroundElement, opacity: pressed ? 0.8 : 1 }]}>
        {photo?.thumb_url ? (
          <Image
            source={{ uri: photo.thumb_url, cacheKey: `photo-thumb-${photo.id}` }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={150}
          />
        ) : (
          <SymbolView name={{ ios: 'pawprint.fill', android: 'pets', web: 'pets' }} size={24} tintColor={theme.textSecondary} />
        )}
        {post.visibility === 'FRIENDS' ? (
          <View style={styles.tileBadge}>
            <SymbolView name={{ ios: 'person.2.fill', android: 'group', web: 'group' }} size={11} tintColor="#ffffff" />
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}

const AVATAR = 88;
const RING = 4;
const BANNER = 112;
// Half the outer gap between tiles; the list's side padding makes up the rest of the screen margin.
const TILE_GAP = Spacing.half;
const SIDE = Spacing.three - TILE_GAP;

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three, padding: Spacing.four },
  content: { paddingHorizontal: SIDE, paddingBottom: Spacing.four },
  patternAnchor: { height: 0 },
  // Back out the content padding so the paws reach the screen edges.
  patternBox: { position: 'absolute', left: -SIDE, right: -SIDE },
  header: { alignItems: 'center', paddingHorizontal: TILE_GAP, paddingTop: Spacing.two, paddingBottom: Spacing.four },
  banner: {
    alignSelf: 'stretch',
    height: BANNER,
    borderRadius: 24,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  bannerPaw: { position: 'absolute' },
  // A ring of page colour lifts the avatar off the banner's edge.
  avatarRing: {
    marginTop: -(AVATAR / 2 + RING),
    padding: RING,
    borderRadius: AVATAR / 2 + RING,
  },
  username: { marginTop: Spacing.two, fontFamily: Fonts.rounded, fontSize: 22, lineHeight: 28, fontWeight: 800 },
  bio: { marginTop: Spacing.half, textAlign: 'center', paddingHorizontal: Spacing.four },
  counts: { marginTop: Spacing.two },
  action: { marginTop: Spacing.three },
  lockNote: { marginTop: Spacing.two, flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  lockText: { fontSize: 12 },
  // Exactly a third of the row, so a short last row keeps the same tile size.
  tileCell: { flex: 1, maxWidth: `${100 / COLUMNS}%`, padding: TILE_GAP },
  tile: {
    aspectRatio: 1,
    borderRadius: 10,
    borderCurve: 'continuous',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Always dark behind the white icon, so it reads on any photo.
  tileBadge: {
    position: 'absolute',
    top: Spacing.one + 2,
    right: Spacing.one + 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  spinner: { paddingVertical: Spacing.four },
  note: { paddingHorizontal: TILE_GAP },
});
