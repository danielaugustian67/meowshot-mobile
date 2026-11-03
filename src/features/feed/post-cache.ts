import type { InfiniteData } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useSyncExternalStore } from 'react';

import type { Page, Post, Reaction } from '@/lib/api/types';
import { queryClient, queryKeys } from '@/lib/query';

/**
 * Rewrites one post wherever it is cached: its own screen and every post list (feeds, profile grids),
 * so a reaction or comment shows up everywhere at once without refetching.
 */
export function updateCachedPost(id: number, update: (post: Post) => Post) {
  queryClient.setQueryData<Post>(queryKeys.post(id), (old) => (old ? update(old) : old));
  queryClient.setQueriesData<InfiniteData<Page<Post>>>({ queryKey: queryKeys.postsAll }, (data) => {
    // The post screen's own entry sits under the same prefix but is not a list.
    if (!data?.pages) return data;
    return {
      ...data,
      pages: data.pages.map((page) => ({
        ...page,
        items: page.items.map((p) => (p.id === id ? update(p) : p)),
      })),
    };
  });
}

/** The post as some already loaded list has it. */
export function cachedPost(id: number): Post | undefined {
  const lists = queryClient.getQueriesData<InfiniteData<Page<Post>>>({ queryKey: queryKeys.postsAll });
  for (const [, data] of lists) {
    const found = data?.pages?.flatMap((p) => p.items).find((p) => p.id === id);
    if (found) return found;
  }
}

// Posts deleted while the app is open, so a screen showing one can close once it is in view again.
let gone = new Set<number>();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Takes a deleted post out of every list. Its own screen is left alone: refetching it would only flash a
 * "not found" while `useLeaveWhenPostGone` closes it.
 */
export function dropPost(postId: number) {
  gone = new Set(gone).add(postId);
  listeners.forEach((l) => l());
  queryClient.setQueriesData<InfiniteData<Page<Post>>>({ queryKey: queryKeys.postsAll }, (data) => {
    if (!data?.pages) return data;
    return { ...data, pages: data.pages.map((p) => ({ ...p, items: p.items.filter((x) => x.id !== postId) })) };
  });
  queryClient.invalidateQueries({ queryKey: queryKeys.postsAll, predicate: (q) => q.queryKey[1] !== 'detail' });
  queryClient.invalidateQueries({ queryKey: queryKeys.users });
  queryClient.invalidateQueries({ queryKey: queryKeys.cats });
  queryClient.invalidateQueries({ queryKey: queryKeys.me });
}

/** Goes back from a post once it is deleted, from its own card, its edit sheet or the cat's page. */
export function useLeaveWhenPostGone(id: number) {
  const isGone = useSyncExternalStore(subscribe, () => gone.has(id));
  useFocusEffect(
    useCallback(() => {
      if (!isGone) return;
      if (router.canGoBack()) router.back();
      else router.replace('/');
    }, [isGone]),
  );
}

/** The post with the viewer's reaction changed to `next` (null removes it), counts adjusted to match. */
export function withReaction(post: Post, next: Reaction | null): Post {
  const counts = { ...post.reaction_counts };
  const prev = post.my_reaction;
  if (prev) {
    const left = (counts[prev] ?? 1) - 1;
    if (left > 0) counts[prev] = left;
    else delete counts[prev];
  }
  if (next) counts[next] = (counts[next] ?? 0) + 1;
  return { ...post, reaction_counts: counts, my_reaction: next };
}
