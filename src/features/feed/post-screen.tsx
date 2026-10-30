import { useQuery, type InfiniteData } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { FormError } from '@/components/form-screen';
import { PawPattern } from '@/components/paw-pattern';
import { Button } from '@/components/ui/button';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { postsApi } from '@/lib/api/endpoints';
import { errorMessage } from '@/lib/api/errors';
import type { Page, Post } from '@/lib/api/types';
import { useT } from '@/lib/i18n';
import { queryClient, queryKeys } from '@/lib/query';

import { PostCard } from './post-card';

/** The post as some already loaded list has it, so the screen opens without a spinner. */
function cachedPost(id: number): Post | undefined {
  const lists = queryClient.getQueriesData<InfiniteData<Page<Post>>>({ queryKey: queryKeys.postsAll });
  for (const [, data] of lists) {
    const found = data?.pages?.flatMap((p) => p.items).find((p) => p.id === id);
    if (found) return found;
  }
}

/** One post on its own, opened from a profile's photo grid. */
export default function PostScreen() {
  const theme = useTheme();
  const t = useT();
  const id = Number(useLocalSearchParams<{ id: string }>().id);
  const post = useQuery({
    queryKey: queryKeys.post(id),
    queryFn: () => postsApi.get(id),
    placeholderData: () => cachedPost(id),
  });

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: t.user.posts }} />
      <PawPattern inScroll />
      {post.data ? (
        <PostCard post={post.data} />
      ) : post.isPending ? (
        <ActivityIndicator style={styles.spinner} />
      ) : (
        <View style={styles.error}>
          <FormError message={errorMessage(post.error)} />
          <Button title={t.common.retry} variant="secondary" onPress={() => post.refetch()} loading={post.isRefetching} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingVertical: Spacing.three, gap: Spacing.three },
  spinner: { paddingVertical: Spacing.four },
  error: { gap: Spacing.three, paddingHorizontal: Spacing.four },
});
