import { useState, type ReactNode } from 'react';

import type { PhotoDecoration, PhotoSticker } from '@/lib/api/types';

import { clampSticker, displayRatio, motifOf, paperColor } from './decoration';
import { FramePicker } from './frame-picker';
import { PhotoPrint, printWidthFor } from './photo-print';
import { StickerCanvas, StickerControls } from './sticker-editor';

export type DecorationTab = 'frame' | 'stickers';

/** The frame and stickers being chosen, and which sticker is selected. Nothing is saved from here. */
export function useDecorationEditor(initial: PhotoDecoration) {
  const [decoration, setDecoration] = useState(initial);
  const [selected, setSelected] = useState<number | null>(null);
  return {
    decoration,
    selected,
    setSelected,
    stickers: decoration.stickers ?? [],
    changeFrame: (patch: Partial<PhotoDecoration>) => setDecoration((d) => ({ ...d, ...patch })),
    setStickers: (next: PhotoSticker[]) =>
      setDecoration((d) => ({ ...d, stickers: next.length ? next : undefined })),
    changeSticker: (index: number, update: (sticker: PhotoSticker) => PhotoSticker) =>
      setDecoration((d) => ({
        ...d,
        stickers: d.stickers?.map((s, i) => (i === index ? clampSticker(update(s)) : s)),
      })),
  };
}

type Editor = ReturnType<typeof useDecorationEditor>;

/** The photo on its print, as large as `area` allows. Stickers can be moved on the stickers tab. */
export function DecorationPrint({
  editor,
  tab,
  catId,
  area,
  width,
  height,
  photo,
}: {
  editor: Editor;
  tab: DecorationTab;
  catId: number;
  area: { width: number; height: number };
  /** The photo's own size. */
  width: number;
  height: number;
  photo: ReactNode;
}) {
  const ratio = displayRatio(width, height);
  const photoRatio = width / height || 1;
  return (
    <PhotoPrint
      color={paperColor(editor.decoration, catId)}
      motif={motifOf(editor.decoration, catId)}
      ratio={ratio}
      photoRatio={photoRatio}
      style={{ width: printWidthFor(area.width, area.height, ratio) }}
      photo={photo}
      stickers={tab === 'frame' ? editor.stickers : undefined}
      overlay={
        tab === 'stickers' ? (
          <StickerCanvas
            stickers={editor.stickers}
            photoRatio={photoRatio}
            selected={editor.selected}
            onSelect={editor.setSelected}
            onChange={editor.changeSticker}
          />
        ) : undefined
      }
    />
  );
}

/** The choices below the print for the open tab. */
export function DecorationControls({ editor, tab, catId }: { editor: Editor; tab: DecorationTab; catId: number }) {
  const { stickers } = editor;
  if (tab === 'frame') {
    return (
      <FramePicker decoration={editor.decoration} color={paperColor(editor.decoration, catId)} onChange={editor.changeFrame} />
    );
  }
  return (
    <StickerControls
      stickers={stickers}
      selected={editor.selected}
      onAdd={(sticker) => {
        editor.setStickers([...stickers, sticker]);
        editor.setSelected(stickers.length);
      }}
      onChange={editor.changeSticker}
      onRemove={(index) => {
        editor.setStickers(stickers.filter((_, i) => i !== index));
        editor.setSelected(null);
      }}
    />
  );
}
