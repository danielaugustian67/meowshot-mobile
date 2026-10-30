import { Placeholder } from '@/components/placeholder';
import { useT } from '@/lib/i18n';

import type { MapPickerProps } from './map-picker';

// react-native-maps has no web implementation; the app targets iOS and Android.
export function MapPicker(_: MapPickerProps) {
  const t = useT();
  return (
    <Placeholder
      icon={{ web: 'map' }}
      title={t.capture.mapAppOnly}
      body={t.capture.mapUseButton}
    />
  );
}
