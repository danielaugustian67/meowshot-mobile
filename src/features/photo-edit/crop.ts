export type CropAspect = 'original' | '1:1' | '4:5' | '16:9';

/** How the photo is cropped. `cx`/`cy` are the centre of the view as fractions of the turned photo. */
export type CropState = { aspect: CropAspect; turns: number; zoom: number; cx: number; cy: number };

export const INITIAL_CROP: CropState = { aspect: 'original', turns: 0, zoom: 1, cx: 0.5, cy: 0.5 };
export const MAX_ZOOM = 4;

const RATIOS: Record<Exclude<CropAspect, 'original'>, number> = { '1:1': 1, '4:5': 0.8, '16:9': 16 / 9 };

/** The photo's size after its quarter turns. */
export function turnedSize(width: number, height: number, turns: number) {
  return turns % 2 ? { width: height, height: width } : { width, height };
}

export function cropRatio(crop: CropState, width: number, height: number) {
  const turned = turnedSize(width, height, crop.turns);
  return crop.aspect === 'original' ? turned.width / turned.height : RATIOS[crop.aspect];
}

/** How much of the turned photo the view shows, as fractions of each side. */
export function cropView(crop: CropState, width: number, height: number) {
  const turned = turnedSize(width, height, crop.turns);
  const photo = turned.width / turned.height;
  const view = cropRatio(crop, width, height);
  return {
    width: (view > photo ? 1 : view / photo) / crop.zoom,
    height: (view > photo ? photo / view : 1) / crop.zoom,
  };
}

/** Keeps the zoom in range and the view inside the photo. */
export function clampCrop(crop: CropState, width: number, height: number): CropState {
  const zoom = Math.min(Math.max(crop.zoom, 1), MAX_ZOOM);
  const view = cropView({ ...crop, zoom }, width, height);
  return {
    ...crop,
    zoom,
    cx: Math.min(Math.max(crop.cx, view.width / 2), 1 - view.width / 2),
    cy: Math.min(Math.max(crop.cy, view.height / 2), 1 - view.height / 2),
  };
}

/** The rectangle to cut from the turned photo, in whole pixels. */
export function cropRect(crop: CropState, width: number, height: number) {
  const turned = turnedSize(width, height, crop.turns);
  const view = cropView(crop, width, height);
  const w = Math.max(1, Math.min(Math.round(view.width * turned.width), turned.width));
  const h = Math.max(1, Math.min(Math.round(view.height * turned.height), turned.height));
  return {
    originX: Math.min(Math.max(Math.round((crop.cx - view.width / 2) * turned.width), 0), turned.width - w),
    originY: Math.min(Math.max(Math.round((crop.cy - view.height / 2) * turned.height), 0), turned.height - h),
    width: w,
    height: h,
  };
}

/** False when the crop would give back the same photo, which then needs no re-encoding. */
export function changesPhoto(crop: CropState, width: number, height: number) {
  const rect = cropRect(crop, width, height);
  return crop.turns % 4 !== 0 || rect.width !== width || rect.height !== height;
}
