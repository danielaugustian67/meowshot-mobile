import { Pastels } from '@/constants/theme';
import type { PhotoDecoration, PhotoSticker } from '@/lib/api/types';

/** The papers a frame can use. The server stores an index, so only ever add to the end. */
export const FramePapers = [...Pastels, '#D9C2A3', '#EDE7DB'] as const;

/** Stored as the motif when the user wants paper without a pattern. */
export const PLAIN_MOTIF = -1;

export const MAX_STICKERS = 8;
export const MIN_STICKER_SCALE = 0.06;
export const MAX_STICKER_SCALE = 0.8;

// Emoji cost no bitmaps, so a screen full of decorated posts stays light on low-RAM phones.
const STICKERS = {
  paw: '🐾',
  heart: '❤️',
  fish: '🐟',
  crown: '👑',
  glasses: '🕶️',
  bow: '🎀',
  star: '⭐',
  sparkles: '✨',
  flower: '🌸',
  yarn: '🧶',
  mouse: '🐭',
  milk: '🥛',
} as const;

export const STICKER_IDS = Object.keys(STICKERS) as (keyof typeof STICKERS)[];

/** Undefined for a sticker added by a newer version of the app, which older ones skip. */
export function stickerEmoji(id: string): string | undefined {
  return STICKERS[id as keyof typeof STICKERS];
}

/** The paper for a photo: the one chosen for it, otherwise the cat's own colour. */
export function paperColor(decoration: PhotoDecoration | null | undefined, catId: number): string {
  const chosen = decoration?.paper;
  return (chosen !== undefined && FramePapers[chosen]) || Pastels[catId % Pastels.length];
}

export function motifOf(decoration: PhotoDecoration | null | undefined, catId: number): number {
  return decoration?.motif ?? catId;
}

export function hasDecoration(decoration: PhotoDecoration | null | undefined) {
  return !!decoration && (decoration.paper !== undefined || decoration.motif !== undefined || !!decoration.stickers?.length);
}

function round(value: number, places: number) {
  const unit = 10 ** places;
  return Math.round(value * unit) / unit;
}

/** The form field for an upload, or undefined when there is nothing to save. */
export function serializeDecoration(decoration: PhotoDecoration | null | undefined): string | undefined {
  if (!decoration || !hasDecoration(decoration)) return undefined;
  return JSON.stringify({
    ...decoration,
    stickers: decoration.stickers?.map((s) => ({
      id: s.id,
      x: round(s.x, 4),
      y: round(s.y, 4),
      scale: round(s.scale, 4),
      rotation: round(s.rotation, 1),
    })),
  });
}

/** A route param back into a decoration; anything unreadable counts as none. */
export function parseDecoration(raw: string | undefined): PhotoDecoration | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PhotoDecoration;
  } catch {
    return null;
  }
}

/** Very tall or very wide photos are cropped, so one post never fills more than a screen. */
export function displayRatio(width: number | undefined, height: number | undefined) {
  return width && height ? Math.min(Math.max(width / height, 0.8), 1.91) : 1;
}

/** Where a photo with `contentFit="cover"` lands inside a box, which may show only part of it. */
export function coverRect(photoRatio: number, boxWidth: number, boxHeight: number) {
  const width = Math.max(boxWidth, boxHeight * photoRatio);
  const height = width / photoRatio;
  return { width, height, left: (boxWidth - width) / 2, top: (boxHeight - height) / 2 };
}

export function clampSticker(sticker: PhotoSticker): PhotoSticker {
  return {
    ...sticker,
    x: Math.min(Math.max(sticker.x, 0), 1),
    y: Math.min(Math.max(sticker.y, 0), 1),
    scale: Math.min(Math.max(sticker.scale, MIN_STICKER_SCALE), MAX_STICKER_SCALE),
    // Always the short way round, within what the server accepts.
    rotation: ((((sticker.rotation + 180) % 360) + 360) % 360) - 180,
  };
}
