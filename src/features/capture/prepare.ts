import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';

import { setDraft, type CaptureDraft, type DraftLocation } from './draft';
import { readExif } from './exif';
import { compressPhoto } from './media';

type Source = { uri: string; width: number; height: number };

/** Compresses the photo, keeps it as the capture draft and opens the review form. */
export async function startDraft(
  source: Source,
  origin: CaptureDraft['origin'],
  location: DraftLocation | null,
  takenAt: string | null,
) {
  const photo = await compressPhoto(source.uri, source.width, source.height);
  setDraft({ photo, origin, location, takenAt });
  router.push('/capture/review');
}

/**
 * The system photo picker: used on web and when the app may not read the library itself.
 * Resolves false when the user cancels.
 */
export async function pickFromSystemLibrary(): Promise<boolean> {
  const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', exif: true, quality: 1 });
  if (res.canceled || !res.assets?.length) return false;
  const asset = res.assets[0];
  const exif = readExif(asset.exif);
  // A gallery photo may be old, so only its own GPS counts, never the current position.
  await startDraft(asset, 'library', exif.coords ? { ...exif.coords, source: 'exif' } : null, exif.takenAt);
  return true;
}
