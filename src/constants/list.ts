/**
 * FlatList windowing for photo lists on low-memory phones. The default keeps ~10 screens mounted on each
 * side; this keeps ~2, so photos far off screen unmount and their bitmaps can be freed.
 * Counts are rows, so in a grid one row is several photos.
 */
export const LeanList = {
  windowSize: 5,
  initialNumToRender: 6,
  maxToRenderPerBatch: 6,
} as const;
