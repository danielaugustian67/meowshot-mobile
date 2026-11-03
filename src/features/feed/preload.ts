import { Image } from 'expo-image';

import type { Post } from '@/lib/api/types';

const loaded = new Set<number>();

/**
 * Puts the thumbnails of a page of posts in the image cache, so fast scrolling past what the list has mounted
 * still shows something at once. Full photos are left to the list: it already mounts those a couple of screens
 * ahead, and a whole page of them would cost several megabytes. `Image.prefetch` can't do this, since it takes
 * no cache key and would store them where `PostCard` never looks.
 */
export async function preloadThumbnails(posts: Post[]) {
  for (const post of posts) {
    const photo = post.photos[0];
    if (!photo?.thumb_url || loaded.has(photo.id)) continue;
    loaded.add(photo.id);
    try {
      const image = await Image.loadAsync({ uri: photo.thumb_url, cacheKey: `photo-thumb-${photo.id}` });
      image.release();
    } catch {
      // Only a head start: the card asks for it again when it mounts.
      loaded.delete(photo.id);
    }
  }
}
