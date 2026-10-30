import { Placeholder } from '@/components/placeholder';

import type { MapPickerProps } from './map-picker';

// react-native-maps has no web implementation; the app targets iOS and Android.
export function MapPicker(_: MapPickerProps) {
  return (
    <Placeholder
      emoji="🗺️"
      title="Peta belum tersedia di web"
      body="Pilih lokasi di peta hanya bisa di app iOS/Android. Di web, pakai tombol Lokasiku sekarang."
    />
  );
}
