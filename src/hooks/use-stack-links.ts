import { router, useSegments } from 'expo-router';

/**
 * Opens a profile, a post or one of your cats on top of the current tab, so Back returns to where it was tapped.
 * The Feed, Kucingku and Profil stacks each route all three screens; the Foto tab falls back to Feed.
 */
export function useStackLinks() {
  const segments = useSegments() as string[];
  const tab = segments.includes('profile') ? 'profile' : segments.includes('cats') ? 'cats' : 'feed';
  return {
    openProfile: (username: string) => {
      const params = { username };
      router.push(
        tab === 'profile'
          ? { pathname: '/profile/user/[username]', params }
          : tab === 'cats'
            ? { pathname: '/cats/user/[username]', params }
            : { pathname: '/user/[username]', params },
      );
    },
    openPost: (id: number) => {
      const params = { id: String(id) };
      router.push(
        tab === 'profile'
          ? { pathname: '/profile/post/[id]', params }
          : tab === 'cats'
            ? { pathname: '/cats/post/[id]', params }
            : { pathname: '/post/[id]', params },
      );
    },
    openCat: (id: number) => {
      const params = { id: String(id) };
      router.push(
        tab === 'profile'
          ? { pathname: '/profile/cat/[id]', params }
          : tab === 'cats'
            ? { pathname: '/cats/[id]', params }
            : { pathname: '/cat/[id]', params },
      );
    },
  };
}
