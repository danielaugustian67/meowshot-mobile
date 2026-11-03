import { router, useSegments } from 'expo-router';

import type { Photo } from '@/lib/api/types';
import { serializeDecoration } from '@/features/photo-edit/decoration';

export type StackTab = 'profile' | 'cats' | 'feed';

/** The post screen in a tab's own stack. */
export function postHref(tab: StackTab, id: number) {
  const params = { id: String(id) };
  return tab === 'profile'
    ? { pathname: '/profile/post/[id]' as const, params }
    : tab === 'cats'
      ? { pathname: '/cats/post/[id]' as const, params }
      : { pathname: '/post/[id]' as const, params };
}

/** The share screen for a photo from the collection, whose post opens in `tab`. */
export function sharePhotoHref(photo: Photo, tab: StackTab) {
  return {
    pathname: '/share-photo' as const,
    params: {
      catId: String(photo.cat_id),
      photoId: String(photo.id),
      photoUri: photo.url ?? photo.thumb_url ?? '',
      ratio: String(photo.width / photo.height),
      decoration: serializeDecoration(photo.decoration) ?? '',
      tab,
    },
  };
}

/** The editor for the frame and stickers of a saved photo, from the collection or from its post. */
export function editPhotoHref(photoId: number, catId: number, postId?: number) {
  return {
    pathname: '/edit-photo' as const,
    params: { photoId: String(photoId), catId: String(catId), ...(postId ? { postId: String(postId) } : {}) },
  };
}

/**
 * Opens a profile, a post or one of your cats on top of the current tab, so Back returns to where it was tapped.
 * The Feed, Kucingku and Profil stacks each route all three screens; the Foto tab falls back to Feed.
 */
export function useStackLinks() {
  const segments = useSegments() as string[];
  const tab: StackTab = segments.includes('profile') ? 'profile' : segments.includes('cats') ? 'cats' : 'feed';
  return {
    tab,
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
    openPost: (id: number) => router.push(postHref(tab, id)),
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
