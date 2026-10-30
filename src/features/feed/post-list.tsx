import { useInfiniteQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { FormError } from '@/components/form-screen';
import { PawPattern } from '@/components/paw-pattern';
import { Placeholder } from '@/components/placeholder';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { postsApi } from '@/lib/api/endpoints';
import { errorMessage } from '@/lib/api/errors';
import { useT } from '@/lib/i18n';
import { queryKeys, type FeedScope } from '@/lib/query';

import { PostCard } from './post-card';

const PAGE = 20;

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

  if (query.isPending) {
    return (
      <ThemedView style={styles.center}>
        <PawPattern />
        <ActivityIndicator />
      </ThemedView>
    );
  }

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
      data={posts}
      keyExtractor={(p) => String(p.id)}
      renderItem={({ item }) => <PostCard post={item} />}
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
            icon={{ ios: 'person.2.fill', android: 'group', web: 'group' }}
            title={t.feed.emptyTitle}
            body={t.feed.emptyFriends}
          />
        ) : (
          <Placeholder
            icon={{ ios: 'globe', android: 'public', web: 'public' }}
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
  separator: { height: Spacing.four },
  footer: { paddingVertical: Spacing.four },
});
