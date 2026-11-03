import { Album, AssetField, MediaType, Query, type AlbumMetadata, type AssetMetadata } from 'expo-media-library';
import { Platform } from 'react-native';

export type PhotoAlbum = { id: string; title: string; coverId: string; newest: number };

// Android's creation time is DATE_TAKEN, read from EXIF. Photos without it (WhatsApp, downloads, some screenshots)
// have none and sort after every other photo, so a photo saved today can land at the very bottom. DATE_MODIFIED is
// always set. On iOS the modification time also changes with edits and favorites, so creation time is the right one.
const NEWEST_KEY = Platform.OS === 'android' ? AssetField.MODIFICATION_TIME : AssetField.CREATION_TIME;

function photosQuery(albumId: string | null) {
  const query = new Query().eq(AssetField.MEDIA_TYPE, MediaType.IMAGE);
  if (albumId) query.album(new Album(albumId));
  return query.orderBy({ key: NEWEST_KEY, ascending: false });
}

/** A page of photos, newest first, from one album or the whole library. */
export function libraryPhotos(albumId: string | null, offset: number, limit: number): Promise<AssetMetadata[]> {
  return photosQuery(albumId).offset(offset).limit(limit).exeForMetadata();
}

async function withCover(album: AlbumMetadata): Promise<PhotoAlbum | null> {
  const [cover] = await libraryPhotos(album.id, 0, 1);
  if (!cover) return null;
  const newest = (Platform.OS === 'android' ? cover.modificationTime : cover.creationTime) ?? 0;
  return { id: album.id, title: album.title, coverId: cover.id, newest };
}

/** Albums that hold a photo, the one with the newest photo first. An album holding only videos is left out. */
export async function photoAlbums(): Promise<PhotoAlbum[]> {
  const albums = await Album.getAlbumsMetadata();
  // One unreadable album shouldn't hide the others.
  const found = await Promise.all(albums.map((a) => withCover(a).catch(() => null)));
  return found.filter((a) => a !== null).sort((a, b) => b.newest - a.newest);
}
