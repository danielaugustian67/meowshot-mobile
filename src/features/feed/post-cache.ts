import type { InfiniteData } from '@tanstack/react-query';

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
