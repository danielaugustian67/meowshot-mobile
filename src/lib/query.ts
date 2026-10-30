import { focusManager, QueryClient } from '@tanstack/react-query';
import { AppState, Platform } from 'react-native';

import { ApiError } from './api/client';

// React Native has no window focus event; treat the app returning to the foreground as focus.
if (Platform.OS !== 'web') {
  focusManager.setEventListener((setFocused) => {
    const sub = AppState.addEventListener('change', (state) => setFocused(state === 'active'));
    return () => sub.remove();
  });
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Photo URLs are signed for ~15 minutes, so data older than that is refetched on focus.
      staleTime: 60_000,
      gcTime: 10 * 60_000,
      retry: (count, err) => {
        if (err instanceof ApiError && err.status >= 400 && err.status < 500) return false;
        return count < 2;
      },
    },
  },
});

export type FeedScope = 'friends' | 'public';

export const queryKeys = {
  me: ['me'] as const,
  /** Prefix for every cat query; invalidate it after anything that adds or changes cats. */
  cats: ['cats'] as const,
  catList: ['cats', 'list'] as const,
  nearbyCats: (lat: number, lng: number) => ['cats', 'nearby', lat, lng] as const,
  /** Prefix for every post list; invalidate it when friendships change, since the friends feed does. */
  postsAll: ['posts'] as const,
  posts: (scope: FeedScope) => ['posts', scope] as const,
  /** Prefix for the friend list and requests; invalidate it after any friend action. */
  friends: ['friends'] as const,
  friendList: ['friends', 'list'] as const,
  friendRequests: (direction: 'incoming' | 'outgoing') => ['friends', 'requests', direction] as const,
  /** Prefix for search and profiles: both carry each user's relationship, so friend actions make them stale too. */
  users: ['users'] as const,
  userSearch: (q: string) => ['users', 'search', q] as const,
  userProfile: (username: string) => ['users', 'profile', username] as const,
  userPosts: (username: string) => ['posts', 'user', username] as const,
  // Under `users`, so a friend action refetches it: becoming friends opens the collection.
  userCats: (username: string) => ['users', 'cats', username] as const,
  post: (id: number) => ['posts', 'detail', id] as const,
};
