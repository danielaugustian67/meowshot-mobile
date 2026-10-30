import { router, useSegments } from 'expo-router';

/**
 * Opens someone's profile on top of the current tab, so Back returns to where it was tapped.
 * The screen is routed in both the Feed and Profil stacks; every other tab falls back to Feed.
 */
export function useOpenProfile() {
  const segments = useSegments();
  const inProfileTab = (segments as string[]).includes('profile');
  return (username: string) =>
    router.push(
      inProfileTab
        ? { pathname: '/profile/user/[username]', params: { username } }
        : { pathname: '/user/[username]', params: { username } },
    );
}
