import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as Location from 'expo-location';
import { Platform } from 'react-native';

import { changesPhoto, cropRect, type CropState } from '@/features/photo-edit/crop';

import type { DraftLocation } from './draft';

const MAX_EDGE = 1600; // matches the server's display size; anything larger is thrown away there

/**
 * Resize to at most 1600 px on the long edge and re-encode as JPEG (~0.3–0.8 MB).
 * Re-encoding drops EXIF, so read GPS from the picker result before calling this.
 */
export async function compressPhoto(uri: string, width: number, height: number) {
  const ctx = ImageManipulator.manipulate(uri);
  if (Math.max(width, height) > MAX_EDGE) {
    ctx.resize(width >= height ? { width: MAX_EDGE, height: null } : { width: null, height: MAX_EDGE });
  }
  const image = await ctx.renderAsync();
  const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });
  return { uri: result.uri, width: result.width, height: result.height };
}

/** Applies the editor's quarter turns and crop. A photo that would come out the same is handed straight back. */
export async function cropPhoto(photo: { uri: string; width: number; height: number }, crop: CropState) {
  if (!changesPhoto(crop, photo.width, photo.height)) return photo;
  const ctx = ImageManipulator.manipulate(photo.uri);
  if (crop.turns % 4) ctx.rotate(crop.turns * 90);
  ctx.crop(cropRect(crop, photo.width, photo.height));
  const image = await ctx.renderAsync();
  const result = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.8 });
  return { uri: result.uri, width: result.width, height: result.height };
}

/** Asks for foreground location access if it has not been decided yet. */
export async function ensureLocationPermission(): Promise<boolean> {
  const current = await Location.getForegroundPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  return (await Location.requestForegroundPermissionsAsync()).granted;
}

/**
 * A GPS fix for "where am I now". A recent cached fix is used when it is precise enough,
 * because a fresh one can take several seconds and capture should feel instant.
 * On Android a fix can open Google's "turn on Location Accuracy" dialog; pass `askToEnable: false`
 * when the user did not ask for their location, so that dialog only follows a tap.
 */
export async function currentLocation({ askToEnable = true } = {}): Promise<DraftLocation | null> {
  if (!(await ensureLocationPermission())) return null;
  try {
    const cached = await Location.getLastKnownPositionAsync({ maxAge: 60_000, requiredAccuracy: 100 });
    const fix =
      cached ??
      (await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        mayShowUserSettingsDialog: askToEnable,
      }));
    return {
      lat: fix.coords.latitude,
      lng: fix.coords.longitude,
      source: 'device',
      accuracy: fix.coords.accuracy,
    };
  } catch {
    return null;
  }
}

/** The fix if it arrives within `ms`, otherwise null, for callers that cannot keep the user waiting for GPS. */
export function fixWithin(fix: Promise<DraftLocation | null>, ms: number): Promise<DraftLocation | null> {
  return Promise.race([fix, new Promise<null>((resolve) => setTimeout(() => resolve(null), ms))]);
}

/**
 * A district-level name for a point, or null when the phone's geocoder has none.
 * Street and building names are left out on purpose: the name ends up on posts.
 */
export async function placeName(lat: number, lng: number): Promise<string | null> {
  try {
    // Android's geocoder refuses to run without location access, and a suggestion is not worth a prompt.
    if (Platform.OS === 'android' && !(await Location.getForegroundPermissionsAsync()).granted) return null;
    const [place] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    if (!place) return null;
    const parts = [place.district || place.city, place.subregion || place.city || place.region];
    return [...new Set(parts.filter(Boolean))].join(', ') || null;
  } catch {
    return null;
  }
}

/** Where a typed place is, from the phone's own geocoder, or null when it finds nothing. */
export async function findPlace(query: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const [place] = await Location.geocodeAsync(query);
    return place ? { lat: place.latitude, lng: place.longitude } : null;
  } catch {
    return null;
  }
}
