// Reads GPS and capture time from the `exif` object expo-image-picker returns. The shape differs
// per platform: iOS nests tags under "{GPS}" / "{Exif}" without the GPS prefix, Android uses flat
// tag names whose GPS values may be decimals or "deg/1,min/1,sec/100" rationals.
// No React Native imports here, so it can be tested with plain Node.

export type ExifInfo = {
  coords: { lat: number; lng: number } | null;
  /** RFC 3339, interpreted in the device's time zone (EXIF stores local time without an offset). */
  takenAt: string | null;
};

type Exif = Record<string, unknown>;

function rational(part: string): number {
  const [n, d] = part.split('/').map(Number);
  return d ? n / d : n;
}

/** Accepts 12.5, "12.5", "12/1,30/1,0/1" or [12, 30, 0]. */
function toDegrees(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  let parts: number[];
  if (Array.isArray(value)) parts = value.map(Number);
  else if (typeof value === 'string') parts = value.split(',').map((p) => rational(p.trim()));
  else return null;
  if (parts.length === 0 || parts.some((p) => !Number.isFinite(p))) return null;
  const [deg, min = 0, sec = 0] = parts;
  return deg + min / 60 + sec / 3600;
}

function signed(value: number, ref: unknown, negative: string): number {
  return typeof ref === 'string' && ref.trim().toUpperCase().startsWith(negative) ? -Math.abs(value) : value;
}

function readCoords(exif: Exif): ExifInfo['coords'] {
  const gps = (exif['{GPS}'] ?? exif.GPS) as Exif | undefined;
  const latRaw = gps?.Latitude ?? exif.GPSLatitude;
  const lngRaw = gps?.Longitude ?? exif.GPSLongitude;
  const latRef = gps?.LatitudeRef ?? exif.GPSLatitudeRef;
  const lngRef = gps?.LongitudeRef ?? exif.GPSLongitudeRef;
  const lat = toDegrees(latRaw);
  const lng = toDegrees(lngRaw);
  if (lat === null || lng === null) return null;
  const out = { lat: signed(lat, latRef, 'S'), lng: signed(lng, lngRef, 'W') };
  // 0,0 is what some apps write when location was unavailable.
  if (Math.abs(out.lat) > 90 || Math.abs(out.lng) > 180 || (out.lat === 0 && out.lng === 0)) return null;
  return out;
}

function readTakenAt(exif: Exif): string | null {
  const nested = (exif['{Exif}'] ?? exif.Exif) as Exif | undefined;
  const raw = nested?.DateTimeOriginal ?? exif.DateTimeOriginal ?? exif.DateTime;
  if (typeof raw !== 'string') return null;
  const m = raw.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/);
  if (!m) return null;
  const [, y, mo, d, h, mi, s] = m.map(Number);
  const date = new Date(y, mo - 1, d, h, mi, s);
  if (Number.isNaN(date.getTime()) || date.getTime() > Date.now() + 60_000) return null;
  return date.toISOString();
}

export function readExif(exif: Exif | null | undefined): ExifInfo {
  if (!exif) return { coords: null, takenAt: null };
  return { coords: readCoords(exif), takenAt: readTakenAt(exif) };
}
