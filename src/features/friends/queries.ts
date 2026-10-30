import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Alert } from 'react-native';

import { friendsApi } from '@/lib/api/endpoints';
import { errorMessage } from '@/lib/api/errors';
import { queryClient, queryKeys } from '@/lib/query';

// One page is plenty for now; the list is not paged in the UI yet.
const FRIEND_LIMIT = 100;

export function useFriends() {
  return useQuery({ queryKey: queryKeys.friendList, queryFn: () => friendsApi.list({ limit: FRIEND_LIMIT }) });
}

export function useFriendRequests(direction: 'incoming' | 'outgoing') {
  return useQuery({ queryKey: queryKeys.friendRequests(direction), queryFn: () => friendsApi.requests(direction) });
}

/**
 * Runs one friend action at a time and remembers which, so only that row shows a spinner.
 * Afterwards everything that depends on friendships is refetched, including the friends feed.
 */
export function useFriendAction() {
  const [busy, setBusy] = useState<string | null>(null);

  async function run(key: string, action: () => Promise<unknown>) {
    setBusy(key);
    try {
      await action();
    } catch (e) {
      Alert.alert(errorMessage(e));
    } finally {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.friends }),
        queryClient.invalidateQueries({ queryKey: queryKeys.users }),
        queryClient.invalidateQueries({ queryKey: queryKeys.postsAll }),
      ]);
      setBusy(null);
    }
  }

  return { busy, run };
}
