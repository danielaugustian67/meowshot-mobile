import { useInfiniteQuery, useQuery, type InfiniteData } from '@tanstack/react-query';

import { catsApi } from '@/lib/api/endpoints';
import type { Cat, Page } from '@/lib/api/types';
import { queryClient, queryKeys } from '@/lib/query';

const PAGE = 30;

/** Your own collection, most recently seen first. Kucingku and the Profil tab share this cache. */
export function useMyCats() {
  return useInfiniteQuery({
    queryKey: queryKeys.catList,
    queryFn: ({ pageParam }) => catsApi.list({ cursor: pageParam, limit: PAGE, sort: 'last_seen' }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.next_cursor,
  });
}

/** One of your cats. The list row it was opened from fills the screen while the full cat loads. */
export function useCat(id: number) {
  return useQuery({
    queryKey: queryKeys.cat(id),
    queryFn: () => catsApi.get(id),
    placeholderData: () =>
      queryClient
        .getQueryData<InfiniteData<Page<Cat>>>(queryKeys.catList)
        ?.pages.flatMap((p) => p.items)
        .find((c) => c.id === id),
  });
}

/** A cat's photos, newest first, in pages that fill whole rows of the three-column grid. */
export function useCatPhotos(id: number) {
  return useInfiniteQuery({
    queryKey: queryKeys.catPhotos(id),
    queryFn: ({ pageParam }) => catsApi.photos(id, { cursor: pageParam, limit: PAGE }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.next_cursor,
  });
}

// Sightings sit above the gallery, so only a few show until asked for more.
const SIGHTINGS_PAGE = 5;

/** Where and when a cat was seen, newest first. */
export function useCatSightings(id: number) {
  return useInfiniteQuery({
    queryKey: queryKeys.catSightings(id),
    queryFn: ({ pageParam }) => catsApi.sightings(id, { cursor: pageParam, limit: SIGHTINGS_PAGE }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.next_cursor,
  });
}

/** Every cat of yours with a located sighting, one marker each at the latest spot, newest first. */
export function useCatMap() {
  return useQuery({ queryKey: queryKeys.catMap, queryFn: catsApi.map });
}

/**
 * Stores a cat the server just returned and refetches every list that shows it: Kucingku, the map, your
 * collection on your profile and, when its name changed, the posts that carry it.
 */
export function catChanged(cat: Cat, { renamed = false } = {}) {
  queryClient.setQueryData(queryKeys.cat(cat.id), cat);
  queryClient.invalidateQueries({ queryKey: queryKeys.catList });
  queryClient.invalidateQueries({ queryKey: queryKeys.catMap });
  queryClient.invalidateQueries({ queryKey: queryKeys.users });
  if (renamed) queryClient.invalidateQueries({ queryKey: queryKeys.postsAll });
}
