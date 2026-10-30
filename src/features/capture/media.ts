import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as Location from 'expo-location';

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
 */
export async function currentLocation(): Promise<DraftLocation | null> {
  if (!(await ensureLocationPermission())) return null;
  try {
    const cached = await Location.getLastKnownPositionAsync({ maxAge: 60_000, requiredAccuracy: 100 });
    const fix = cached ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }));
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
