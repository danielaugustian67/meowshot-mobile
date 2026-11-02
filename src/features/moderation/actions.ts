import type { InfiniteData } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useSyncExternalStore } from 'react';
import { ActionSheetIOS, Alert, Platform } from 'react-native';

import { blocksApi } from '@/lib/api/endpoints';
import { errorMessage } from '@/lib/api/errors';
import type { Comment, Page, Post, ReportTarget } from '@/lib/api/types';
import { useT } from '@/lib/i18n';
import { queryClient, queryKeys } from '@/lib/query';

type Person = { id: number; username: string };

// Who was blocked while the app is open, so a screen showing their content can close once it is in view again.
let blocked = new Set<number>();
const listeners = new Set<() => void>();

function markBlocked(id: number, on: boolean) {
  blocked = new Set(blocked);
  if (on) blocked.add(id);
  else blocked.delete(id);
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Goes back from a post or profile once its owner is blocked, from its own menu or from the report sheet. */
export function useLeaveWhenBlocked(userId: number | undefined) {
  const isBlocked = useSyncExternalStore(subscribe, () => userId !== undefined && blocked.has(userId));
  useFocusEffect(
    useCallback(() => {
      if (isBlocked && router.canGoBack()) router.back();
    }, [isBlocked]),
  );
}

/** Takes their posts and comments out of every loaded list at once; the refetch afterwards confirms it. */
function dropFromCache(userId: number) {
  queryClient.setQueriesData<InfiniteData<Page<Post>>>({ queryKey: queryKeys.postsAll }, (data) => {
    if (!data?.pages) return data;
    return { ...data, pages: data.pages.map((p) => ({ ...p, items: p.items.filter((x) => x.author.id !== userId) })) };
  });
  queryClient.setQueriesData<InfiniteData<Page<Comment>>>({ queryKey: queryKeys.commentsAll }, (data) => {
    if (!data?.pages) return data;
    return { ...data, pages: data.pages.map((p) => ({ ...p, items: p.items.filter((x) => x.author.id !== userId) })) };
  });
}

/** Everything a block or unblock changes: feeds, comments, profiles, friends. */
function refetchAfterBlock() {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.postsAll }),
    queryClient.invalidateQueries({ queryKey: queryKeys.commentsAll }),
    queryClient.invalidateQueries({ queryKey: queryKeys.users }),
    queryClient.invalidateQueries({ queryKey: queryKeys.friends }),
  ]);
}

/** Report and block, from a post, a comment or a profile. Blocking always asks first. */
export function useModeration() {
  const t = useT();

  function confirmBlock(user: Person) {
    Alert.alert(t.moderation.blockConfirm(user.username), t.moderation.blockBody, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.moderation.blockAction,
        style: 'destructive',
        onPress: async () => {
          try {
            await blocksApi.block(user.id);
          } catch (e) {
            Alert.alert(errorMessage(e));
            return;
          }
          dropFromCache(user.id);
          markBlocked(user.id, true);
          Alert.alert(t.moderation.blocked(user.username), undefined, [{ text: t.common.ok }]);
          refetchAfterBlock();
        },
      },
    ]);
  }

  async function unblock(user: Person) {
    await blocksApi.unblock(user.id);
    markBlocked(user.id, false);
    await refetchAfterBlock();
  }

  function openReport(type: ReportTarget, id: number, author: Person) {
    router.push({
      pathname: '/report',
      params: { type, id: String(id), userId: String(author.id), username: author.username },
    });
  }

  /** The "…" menu: report this thing, or block the person behind it. */
  function openMenu(type: ReportTarget, id: number, author: Person) {
    const reportLabel = { POST: t.moderation.reportPost, COMMENT: t.moderation.reportComment, USER: t.moderation.reportUser }[
      type
    ];
    const blockLabel = t.moderation.block(author.username);
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: [reportLabel, blockLabel, t.common.cancel], destructiveButtonIndex: [0, 1], cancelButtonIndex: 2 },
        (i) => {
          if (i === 0) openReport(type, id, author);
          if (i === 1) confirmBlock(author);
        },
      );
      return;
    }
    // Android alerts take three buttons at most, which is exactly this menu.
    Alert.alert(
      `@${author.username}`,
      undefined,
      [
        { text: t.common.cancel, style: 'cancel' },
        { text: blockLabel, onPress: () => confirmBlock(author) },
        { text: reportLabel, onPress: () => openReport(type, id, author) },
      ],
      { cancelable: true },
    );
  }

  return { openMenu, confirmBlock, unblock };
}
