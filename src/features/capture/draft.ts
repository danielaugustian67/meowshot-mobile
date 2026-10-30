import { useSyncExternalStore } from 'react';

// The photo being captured, shared by the capture screens (pick → review → map picker).
// It lives in memory only: a capture abandoned when the app is killed is simply lost.

export type DraftLocation = {
  lat: number;
  lng: number;
  /** exif: read from the photo; device: GPS fix when the photo was taken; manual: picked on the map. */
  source: 'exif' | 'device' | 'manual';
  /** Metres, for device fixes. */
  accuracy?: number | null;
};

export type CaptureDraft = {
  /** Compressed JPEG (≤1600 px, no EXIF) ready to upload. */
  photo: { uri: string; width: number; height: number };
  origin: 'camera' | 'library';
  location: DraftLocation | null;
  /** RFC 3339 from EXIF; the server uses "now" when absent. */
  takenAt: string | null;
};

let draft: CaptureDraft | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

export function setDraft(next: CaptureDraft | null) {
  draft = next;
  emit();
}

export function updateDraft(patch: Partial<CaptureDraft>) {
  if (!draft) return;
  draft = { ...draft, ...patch };
  emit();
}

export function getDraft() {
  return draft;
}

export function useCaptureDraft() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => draft,
  );
}
