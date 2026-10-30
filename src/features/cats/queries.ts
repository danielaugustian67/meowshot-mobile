import { useInfiniteQuery } from '@tanstack/react-query';

import { catsApi } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/query';

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
