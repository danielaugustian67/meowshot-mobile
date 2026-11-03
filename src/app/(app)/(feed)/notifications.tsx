import { useInfiniteQuery } from '@tanstack/react-query';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { FormError } from '@/components/form-screen';
import { PawPattern } from '@/components/paw-pattern';
import { RowsSkeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Spacing } from '@/constants/theme';
import { useUnreadCount } from '@/features/notifications/queries';
import { useStackLinks } from '@/hooks/use-stack-links';
import { useTheme } from '@/hooks/use-theme';
import { notificationsApi } from '@/lib/api/endpoints';
import { errorMessage } from '@/lib/api/errors';
import type { AppNotification, NotificationType } from '@/lib/api/types';
import { timeAgo } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { queryClient, queryKeys } from '@/lib/query';

const PAGE = 30;
const AVATAR = 44;

const EMOJI: Record<NotificationType, string> = {
  friend_request: '👋',
  friend_accepted: '🤝',
  reaction: '😻',
  comment: '💬',
};

/** Reactions, comments and friend news, newest first. Opening it marks everything read. */
export default function NotificationsScreen() {
  const theme = useTheme();
  const t = useT();
  const unread = useUnreadCount();
  const [refreshing, setRefreshing] = useState(false);
  const query = useInfiniteQuery({
    queryKey: queryKeys.notifications,
    queryFn: ({ pageParam }) => notificationsApi.list({ cursor: pageParam, limit: PAGE }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.next_cursor,
  });
  const { refetch } = query;

  // Something new is unread: fetch it before marking all read, so a cached list can't hide it.
  // The list keeps its unread highlights for this visit; only the count drops to zero.
  useFocusEffect(
    useCallback(() => {
      if (!unread) return;
      let active = true;
      refetch({ cancelRefetch: false }).then((result) => {
        if (!active || result.isError) return;
        queryClient.setQueryData(queryKeys.unreadCount, { unread: 0 });
        notificationsApi
          .markRead('all')
          .catch(() => queryClient.invalidateQueries({ queryKey: queryKeys.unreadCount }));
      });
      return () => {
        active = false;
      };
    }, [unread, refetch]),
  );

  async function refresh() {
    setRefreshing(true);
    await Promise.all([query.refetch(), queryClient.invalidateQueries({ queryKey: queryKeys.unreadCount })]);
    setRefreshing(false);
  }

  return (
    <FlatList
      data={query.data?.pages.flatMap((p) => p.items) ?? []}
      keyExtractor={(n) => String(n.id)}
      renderItem={({ item }) => <NotificationRow item={item} />}
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      ListHeaderComponent={<PawPattern inScroll />}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      onEndReached={() => {
        if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
      }}
      onEndReachedThreshold={0.5}
      ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator style={styles.spinner} /> : undefined}
      ListEmptyComponent={
        query.isPending ? (
          <RowsSkeleton />
        ) : query.isError ? (
          <View style={styles.error}>
            <FormError message={errorMessage(query.error)} />
            <Button title={t.common.retry} variant="secondary" onPress={() => query.refetch()} />
          </View>
        ) : (
          <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
            {t.notifications.empty}
          </ThemedText>
        )
      }
    />
  );
}

/** Who did what, and when. Reactions and comments open the post; friend news opens the person. */
function NotificationRow({ item }: { item: AppNotification }) {
  const theme = useTheme();
  const t = useT();
  const { openProfile, openPost } = useStackLinks();
  const actor = item.actor;
  const verb = {
    friend_request: t.notifications.friendRequest,
    friend_accepted: t.notifications.friendAccepted,
    reaction: t.notifications.reaction,
    comment: t.notifications.comment,
  }[item.type];
  const unread = !item.read_at;

  function open() {
    if ((item.type === 'reaction' || item.type === 'comment') && item.ref_id) openPost(item.ref_id);
    else if (actor) openProfile(actor.username);
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={open}
      style={({ pressed }) => [
        styles.row,
        unread && { backgroundColor: theme.backgroundElement },
        pressed && { backgroundColor: theme.backgroundSelected },
      ]}>
      <View>
        {actor ? (
          <Avatar user={actor} size={AVATAR} />
        ) : (
          <View style={[styles.ghost, { backgroundColor: theme.backgroundSelected }]} />
        )}
        <View style={[styles.emoji, { backgroundColor: theme.background }]}>
          <Text style={styles.emojiText}>{EMOJI[item.type]}</Text>
        </View>
      </View>
      <View style={styles.text}>
        <ThemedText type="small" numberOfLines={3}>
          <Text style={styles.name}>{actor ? `@${actor.username}` : t.notifications.someone}</Text> {verb}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {timeAgo(item.created_at)}
        </ThemedText>
      </View>
      {unread ? <View style={[styles.dot, { backgroundColor: theme.tint }]} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.three, gap: Spacing.one },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: 16,
  },
  ghost: { width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2 },
  emoji: {
    position: 'absolute',
    right: -4,
    bottom: -4,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emojiText: { fontSize: 13, lineHeight: 16 },
  text: { flex: 1, gap: 2 },
  name: { fontWeight: 700 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  spinner: { paddingVertical: Spacing.four },
  error: { gap: Spacing.three },
  empty: { textAlign: 'center', paddingVertical: Spacing.four, paddingHorizontal: Spacing.three },
});
