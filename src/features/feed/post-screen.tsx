import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type HostInstance,
  type ScrollViewInstance,
  type TextInputInstance,
} from 'react-native';

import { FormError } from '@/components/form-screen';
import { PawPattern } from '@/components/paw-pattern';
import { Button } from '@/components/ui/button';
import { Spacing } from '@/constants/theme';
import { useLeaveWhenBlocked } from '@/features/moderation/actions';
import { useHideTabBar } from '@/hooks/use-hide-tab-bar';
import { useTheme } from '@/hooks/use-theme';
import { postsApi } from '@/lib/api/endpoints';
import { errorMessage } from '@/lib/api/errors';
import { useT } from '@/lib/i18n';
import { queryKeys } from '@/lib/query';

import { CommentInput, CommentList } from './comments';
import { cachedPost, useLeaveWhenPostGone } from './post-cache';
import { PostCard } from './post-card';

/** One post on its own with its comments, opened from a feed card or a profile's photo grid. */
export default function PostScreen() {
  const theme = useTheme();
  const t = useT();
  const id = Number(useLocalSearchParams<{ id: string }>().id);
  const post = useQuery({
    queryKey: queryKeys.post(id),
    queryFn: () => postsApi.get(id),
    placeholderData: () => cachedPost(id),
  });
  const scroll = useRef<ScrollViewInstance>(null);
  const input = useRef<TextInputInstance>(null);
  const root = useRef<HostInstance>(null);
  const keyboardOpen = useKeyboardOpen();
  // Where this screen starts on the window, which the keyboard avoidance has to subtract.
  const [top, setTop] = useState(0);
  // The comment box takes the bottom edge, like a chat.
  useHideTabBar();
  useLeaveWhenBlocked(post.data?.author.id);
  useLeaveWhenPostGone(id);

  return (
    <View ref={root} style={styles.flex} onLayout={() => root.current?.measureInWindow((_x, y) => setTop(y))}>
      <Stack.Screen options={{ title: t.user.posts }} />
      <KeyboardAvoidingView
        style={[styles.flex, { backgroundColor: theme.background }]}
        behavior="padding"
        keyboardVerticalOffset={top}>
        <ScrollView
          ref={scroll}
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          // The list gets shorter when the keyboard opens and when the box grows, which keeps the last comment in view.
          onLayout={() => {
            if (keyboardOpen) scroll.current?.scrollToEnd({ animated: true });
          }}
          contentContainerStyle={styles.content}>
          <PawPattern inScroll />
          {post.data ? (
            <>
              <PostCard post={post.data} onComment={() => input.current?.focus()} />
              <CommentList post={post.data} />
            </>
          ) : post.isPending ? (
            <ActivityIndicator style={styles.spinner} />
          ) : (
            <View style={styles.error}>
              <FormError message={errorMessage(post.error)} />
              <Button title={t.common.retry} variant="secondary" onPress={() => post.refetch()} loading={post.isRefetching} />
            </View>
          )}
        </ScrollView>
        {post.data ? (
          <CommentInput
            post={post.data}
            keyboardOpen={keyboardOpen}
            inputRef={input}
            onSent={() => setTimeout(() => scroll.current?.scrollToEnd({ animated: true }), 100)}
          />
        ) : null}
      </KeyboardAvoidingView>
    </View>
  );
}

function useKeyboardOpen() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    // iOS announces the keyboard before it moves, so the padding changes along with it.
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setOpen(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setOpen(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return open;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingVertical: Spacing.three, gap: Spacing.four },
  spinner: { paddingVertical: Spacing.four },
  error: { gap: Spacing.three, paddingHorizontal: Spacing.four },
});
