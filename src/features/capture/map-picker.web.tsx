import { Placeholder } from '@/components/placeholder';

import type { MapPickerProps } from './map-picker';

// react-native-maps has no web implementation; the app targets iOS and Android.
export function MapPicker(_: MapPickerProps) {
  return (
    <Placeholder
      icon={{ web: 'map' }}
      title="Peta hanya di aplikasi"
      body="Pakai tombol Lokasiku."
    />
  );
}
