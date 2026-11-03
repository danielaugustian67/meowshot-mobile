import { useInfiniteQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { FormError } from '@/components/form-screen';
import { PawPattern } from '@/components/paw-pattern';
import { Placeholder } from '@/components/placeholder';
import { PostListSkeleton } from '@/components/skeleton';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { LeanList } from '@/constants/list';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { postsApi } from '@/lib/api/endpoints';
import { errorMessage } from '@/lib/api/errors';
import { useT } from '@/lib/i18n';
import type { Post } from '@/lib/api/types';
import { queryKeys, type FeedScope } from '@/lib/query';

import { PostCard } from './post-card';
import { preloadThumbnails } from './preload';

const PAGE = 20;

// Outside the component, so a new render of the list doesn't count as a new way to draw each post.
function renderPost({ item }: { item: Post }) {
  return <PostCard post={item} />;
}

/** "friends" is /feed (own and friends' posts); "public" is /explore (everyone's public posts). */
export function PostList({ scope }: { scope: FeedScope }) {
  const theme = useTheme();
  const t = useT();
  const [refreshing, setRefreshing] = useState(false);
  const query = useInfiniteQuery({
    queryKey: queryKeys.posts(scope),
    queryFn: ({ pageParam }) =>
      (scope === 'friends' ? postsApi.feed : postsApi.explore)({ cursor: pageParam, limit: PAGE }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.next_cursor,
  });
  const newestPage = query.data?.pages.at(-1);

  useEffect(() => {
    if (newestPage) preloadThumbnails(newestPage.items);
  }, [newestPage]);

  if (query.isPending) return <PostListSkeleton />;

  if (query.isError && !query.data) {
    return (
      <ThemedView style={[styles.center, styles.error]}>
        <PawPattern />
        <FormError message={errorMessage(query.error)} />
        <Button title={t.common.retry} variant="secondary" onPress={() => query.refetch()} loading={query.isRefetching} />
      </ThemedView>
    );
  }

  const posts = query.data.pages.flatMap((p) => p.items);

  // Only a pull shows the spinner; background refetches on focus stay silent.
  async function refresh() {
    setRefreshing(true);
    await query.refetch();
    setRefreshing(false);
  }

  return (
    <FlatList
      {...LeanList}
      data={posts}
      keyExtractor={(p) => String(p.id)}
      renderItem={renderPost}
      ItemSeparatorComponent={Separator}
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={posts.length ? styles.content : styles.empty}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      onEndReached={() => {
        if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
      }}
      onEndReachedThreshold={0.5}
      ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator style={styles.footer} /> : undefined}
      ListEmptyComponent={
        scope === 'friends' ? (
          <Placeholder
            icon={{ ios: 'pawprint.fill', android: 'pets', web: 'pets' }}
            title={t.feed.emptyTitle}
            body={t.feed.emptyFriends}
          />
        ) : (
          <Placeholder
            icon={{ ios: 'pawprint.fill', android: 'pets', web: 'pets' }}
            title={t.feed.emptyTitle}
            body={t.feed.emptyPublic}
          />
        )
      }
    />
  );
}

function Separator() {
  return <View style={styles.separator} />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  error: { gap: Spacing.three, padding: Spacing.four },
  content: { paddingVertical: Spacing.three },
  empty: { flexGrow: 1 },
  // The next card's ears already add space above it.
  separator: { height: Spacing.three },
  footer: { paddingVertical: Spacing.four },
});
