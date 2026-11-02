import { useQuery } from '@tanstack/react-query';

import { notificationsApi } from '@/lib/api/endpoints';
import { queryKeys } from '@/lib/query';

// No push yet, so the count is polled; react-query pauses it while the app is in the background.
const POLL_MS = 60_000;

/** How many notifications are unread, for the bell and the Feed tab badge. */
export function useUnreadCount() {
  const query = useQuery({
    queryKey: queryKeys.unreadCount,
    queryFn: notificationsApi.unreadCount,
    refetchInterval: POLL_MS,
    staleTime: 0,
  });
  return query.data?.unread ?? 0;
}

/** A badge label: the count, capped so it stays a small pill. */
export function badgeText(count: number) {
  return count > 99 ? '99+' : String(count);
}
