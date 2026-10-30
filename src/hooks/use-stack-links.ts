import { router, useSegments } from 'expo-router';

/**
 * Opens a profile or a post on top of the current tab, so Back returns to where it was tapped.
 * Both screens are routed in the Feed and Profil stacks; every other tab falls back to Feed.
 */
export function useStackLinks() {
  const segments = useSegments();
  const inProfileTab = (segments as string[]).includes('profile');
  return {
    openProfile: (username: string) =>
      router.push(
        inProfileTab
          ? { pathname: '/profile/user/[username]', params: { username } }
          : { pathname: '/user/[username]', params: { username } },
      ),
    openPost: (id: number) =>
      router.push(
        inProfileTab
          ? { pathname: '/profile/post/[id]', params: { id: String(id) } }
          : { pathname: '/post/[id]', params: { id: String(id) } },
      ),
  };
}
