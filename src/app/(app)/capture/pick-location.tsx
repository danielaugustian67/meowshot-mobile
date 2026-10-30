import { router } from 'expo-router';

import { getDraft, updateDraft } from '@/features/capture/draft';
import { MapPicker } from '@/features/capture/map-picker';

export default function PickLocationScreen() {
  const loc = getDraft()?.location ?? null;
  return (
    <MapPicker
      initial={loc}
      onConfirm={(point) => {
        updateDraft({ location: { ...point, source: 'manual' } });
        router.back();
      }}
    />
  );
}
