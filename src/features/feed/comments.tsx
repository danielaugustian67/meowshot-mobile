import { useInfiniteQuery, type InfiniteData } from '@tanstack/react-query';
import { SymbolView } from 'expo-symbols';
import { useState, type Ref } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  type TextInputInstance,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Avatar } from '@/components/avatar';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { SectionTitle } from '@/components/ui/section-title';
import { Spacing } from '@/constants/theme';
import { useModeration } from '@/features/moderation/actions';
import { useStackLinks } from '@/hooks/use-stack-links';
import { useTheme } from '@/hooks/use-theme';
import { postsApi } from '@/lib/api/endpoints';
import { errorMessage } from '@/lib/api/errors';
import { useMe } from '@/lib/auth/session';
import type { Comment, Page, Post } from '@/lib/api/types';
import { daysAgo } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { queryClient, queryKeys } from '@/lib/query';

import { updateCachedPost } from './post-cache';

const AVATAR = 30;
// The server's limit (1-1000 characters after trimming).
const MAX_LENGTH = 1000;

type Comments = InfiniteData<Page<Comment>, string | null>;

/** The post's comments, oldest first, with more loaded on request. */
export function CommentList({ post }: { post: Post }) {
  const t = useT();
  const comments = useInfiniteQuery({
    queryKey: queryKeys.comments(post.id),
    queryFn: ({ pageParam }) => postsApi.comments(post.id, { cursor: pageParam }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.next_cursor,
  });
  const items = comments.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <View style={styles.list}>
      <SectionTitle title={t.comments.title} count={post.comment_count} />
      {comments.isPending ? (
        <ActivityIndicator style={styles.spinner} />
      ) : comments.isError && !comments.data ? (
        <View style={styles.error}>
          <ThemedText type="small" themeColor="textSecondary">
            {errorMessage(comments.error)}
          </ThemedText>
          <Button title={t.common.retry} variant="secondary" size="small" onPress={() => comments.refetch()} />
        </View>
      ) : items.length === 0 ? (
        <ThemedText type="small" themeColor="textSecondary">
          {t.comments.empty}
        </ThemedText>
      ) : (
        items.map((c) => <CommentRow key={c.id} comment={c} />)
      )}
      {comments.hasNextPage ? (
        <Button
          title={t.comments.more}
          variant="ghost"
          size="small"
          onPress={() => comments.fetchNextPage()}
          loading={comments.isFetchingNextPage}
        />
      ) : null}
    </View>
  );
}

/** One comment as a speech bubble. Its author, and the post's owner, can delete it; anyone else can report it. */
function CommentRow({ comment }: { comment: Comment }) {
  const theme = useTheme();
  const t = useT();
  const { openProfile } = useStackLinks();
  const { openMenu } = useModeration();
  const { data: me } = useMe();
  const [deleting, setDeleting] = useState(false);

  function confirmDelete() {
    Alert.alert(t.comments.deleteConfirm, undefined, [
      { text: t.common.cancel, style: 'cancel' },
      { text: t.comments.delete, style: 'destructive', onPress: remove },
    ]);
  }

  async function remove() {
    setDeleting(true);
    try {
      await postsApi.deleteComment(comment.id);
      queryClient.setQueryData<Comments>(queryKeys.comments(comment.post_id), (data) =>
        data
          ? {
              ...data,
              pages: data.pages.map((p) => ({ ...p, items: p.items.filter((c) => c.id !== comment.id) })),
            }
          : data,
      );
      updateCachedPost(comment.post_id, (p) => ({ ...p, comment_count: Math.max(0, p.comment_count - 1) }));
    } catch (e) {
      setDeleting(false);
      Alert.alert(errorMessage(e));
    }
  }

  return (
    <View style={[styles.row, deleting && styles.fading]}>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={t.user.open(comment.author.username)}
        onPress={() => openProfile(comment.author.username)}>
        <Avatar user={comment.author} size={AVATAR} />
      </Pressable>
      <View style={styles.rowBody}>
        <View style={[styles.bubble, { backgroundColor: theme.backgroundElement }]}>
          <ThemedText type="smallBold">@{comment.author.username}</ThemedText>
          <ThemedText type="small">{comment.body}</ThemedText>
        </View>
        <View style={styles.meta}>
          <ThemedText type="small" themeColor="textSecondary" style={styles.metaText}>
            {daysAgo(comment.created_at)}
          </ThemedText>
          {comment.can_delete ? (
            <Pressable accessibilityRole="button" onPress={confirmDelete} disabled={deleting} hitSlop={8}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.metaText}>
                {t.comments.delete}
              </ThemedText>
            </Pressable>
          ) : null}
          {me && me.id !== comment.author.id ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => openMenu('COMMENT', comment.id, comment.author)}
              hitSlop={8}>
              <ThemedText type="small" themeColor="textSecondary" style={styles.metaText}>
                {t.moderation.report}
              </ThemedText>
            </Pressable>
          ) : null}
        </View>
      </View>
    </View>
  );
}

/**
 * The text box pinned to the bottom of the post screen, or a note when the owner turned comments off.
 * `keyboardOpen` drops the home-indicator padding while the keyboard covers that edge anyway.
 */
export function CommentInput({
  post,
  keyboardOpen,
  inputRef,
  onSent,
}: {
  post: Post;
  keyboardOpen: boolean;
  inputRef?: Ref<TextInputInstance>;
  onSent?: () => void;
}) {
  const theme = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  // Android already pads native tab screens by the bottom inset.
  const bottom = Spacing.two + (Platform.OS === 'ios' && !keyboardOpen ? insets.bottom : 0);
  const body = text.trim();

  async function send() {
    if (!body || sending) return;
    setSending(true);
    try {
      const comment = await postsApi.addComment(post.id, body);
      queryClient.setQueryData<Comments>(queryKeys.comments(post.id), (data) => {
        if (!data) return data;
        const last = data.pages[data.pages.length - 1];
        // With newer pages still unloaded, the comment shows up when they are; appending here would skip them.
        if (last.next_cursor) return data;
        return { ...data, pages: [...data.pages.slice(0, -1), { ...last, items: [...last.items, comment] }] };
      });
      updateCachedPost(post.id, (p) => ({ ...p, comment_count: p.comment_count + 1 }));
      setText('');
      onSent?.();
    } catch (e) {
      Alert.alert(errorMessage(e));
    } finally {
      setSending(false);
    }
  }

  if (post.comments_disabled && !post.is_owner) {
    return (
      <View style={[styles.bar, { paddingBottom: bottom, borderColor: theme.border, backgroundColor: theme.background }]}>
        <ThemedText type="small" themeColor="textSecondary" style={styles.off}>
          {t.comments.disabled}
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={[styles.bar, { paddingBottom: bottom, borderColor: theme.border, backgroundColor: theme.background }]}>
      <TextInput
        ref={inputRef}
        value={text}
        onChangeText={setText}
        placeholder={t.comments.placeholder}
        placeholderTextColor={theme.textSecondary}
        multiline
        maxLength={MAX_LENGTH}
        style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.comments.send}
        accessibilityState={{ disabled: !body || sending, busy: sending }}
        disabled={!body || sending}
        onPress={send}
        style={[styles.send, { backgroundColor: theme.tint, opacity: body ? 1 : 0.4 }]}>
        {sending ? (
          <ActivityIndicator color={theme.onTint} />
        ) : (
          <SymbolView name={{ ios: 'arrow.up', android: 'arrow_upward', web: 'arrow_upward' }} size={18} tintColor={theme.onTint} />
        )}
      </Pressable>
    </View>
  );
}

const SEND = 40;

const styles = StyleSheet.create({
  list: { gap: Spacing.three, paddingHorizontal: Spacing.four },
  spinner: { paddingVertical: Spacing.three },
  error: { gap: Spacing.two, alignItems: 'flex-start' },
  row: { flexDirection: 'row', gap: Spacing.two, alignItems: 'flex-start' },
  fading: { opacity: 0.4 },
  rowBody: { flex: 1, gap: Spacing.half },
  // Square top-left corner points the bubble at the avatar beside it.
  bubble: {
    alignSelf: 'flex-start',
    maxWidth: '100%',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderRadius: 18,
    borderTopLeftRadius: 4,
  },
  meta: { flexDirection: 'row', gap: Spacing.three, paddingLeft: Spacing.two },
  metaText: { fontSize: 12, lineHeight: 16 },
  bar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    paddingTop: Spacing.two,
    paddingHorizontal: Spacing.three,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  input: {
    flex: 1,
    minHeight: SEND,
    maxHeight: 120,
    borderRadius: SEND / 2,
    paddingHorizontal: Spacing.three,
    paddingTop: 10,
    paddingBottom: 10,
    fontSize: 16,
  },
  send: { width: SEND, height: SEND, borderRadius: SEND / 2, alignItems: 'center', justifyContent: 'center' },
  off: { flex: 1, textAlign: 'center', paddingVertical: Spacing.two },
});
