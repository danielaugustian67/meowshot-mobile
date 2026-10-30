import { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { type Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FormError } from '@/components/form-screen';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

import { currentLocation } from './media';

export type MapPickerProps = {
  initial: { lat: number; lng: number } | null;
  onConfirm: (point: { lat: number; lng: number }) => void;
};

// Monas, Jakarta: a neutral starting point when nothing better is known.
const FALLBACK = { lat: -6.1754, lng: 106.8272 };
const ZOOMED = { latitudeDelta: 0.004, longitudeDelta: 0.004 };
const PIN_SIZE = 48;

/** Drag the map under a fixed centre pin; the centre is the chosen point. */
export function MapPicker({ initial, onConfirm }: MapPickerProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const map = useRef<MapView>(null);
  const start = initial ?? FALLBACK;
  const [center, setCenter] = useState(start);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function goToMe() {
    setError(null);
    setLocating(true);
    const fix = await currentLocation();
    setLocating(false);
    if (!fix) {
      setError('Lokasi tidak tersedia. Geser peta secara manual.');
      return;
    }
    map.current?.animateToRegion({ latitude: fix.lat, longitude: fix.lng, ...ZOOMED }, 400);
  }

  return (
    <View style={styles.flex}>
      <View style={styles.flex}>
        <MapView
          ref={map}
          style={styles.flex}
          initialRegion={{
            latitude: start.lat,
            longitude: start.lng,
            ...(initial ? ZOOMED : { latitudeDelta: 0.08, longitudeDelta: 0.08 }),
          }}
          showsUserLocation
          onRegionChangeComplete={(r: Region) => setCenter({ lat: r.latitude, lng: r.longitude })}
        />
        <View pointerEvents="none" style={styles.pinWrap}>
          <ThemedText style={styles.pin}>📍</ThemedText>
        </View>
      </View>
      <View
        style={[
          styles.panel,
          { backgroundColor: theme.background, paddingBottom: insets.bottom + Spacing.three },
        ]}>
        <ThemedText type="small" themeColor="textSecondary">
          Geser peta sampai pin berada di tempat kamu bertemu kucingnya.
        </ThemedText>
        <FormError message={error} />
        <View style={styles.row}>
          <Button title="Lokasiku" variant="secondary" onPress={goToMe} loading={locating} />
          <Button title="Pakai titik ini" style={styles.flex} onPress={() => onConfirm(center)} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  // Padding by the pin's own height puts its tip (bottom of the emoji) on the map centre.
  pinWrap: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', paddingBottom: PIN_SIZE },
  pin: { fontSize: 40, lineHeight: PIN_SIZE },
  panel: { padding: Spacing.three, gap: Spacing.two },
  row: { flexDirection: 'row', gap: Spacing.two },
});
