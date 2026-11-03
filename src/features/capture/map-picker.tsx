import { useForegroundPermissions } from 'expo-location';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { useRef, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FormError } from '@/components/form-screen';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Spacing } from '@/constants/theme';
import { CatPin, CLUSTER_RADIUS } from '@/features/cats/cat-pin';
import { clusterMarkers } from '@/features/cats/cluster';
import { useCatMap } from '@/features/cats/queries';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/lib/i18n';
import { useMapStyle } from '@/lib/map-style';
import {
  Camera,
  Map,
  UserLocation,
  type CameraRef,
  type LngLatBounds,
  type MapRef,
} from '@/lib/maplibre';

import { currentLocation } from './media';
import { PLACE_ZOOM, PlaceSearch } from './place-search';

export type MapPickerProps = {
  initial: { lat: number; lng: number } | null;
  onConfirm: (point: { lat: number; lng: number }) => void;
};

// Monas, Jakarta: a neutral starting point when nothing better is known.
const FALLBACK = { lat: -6.1754, lng: 106.8272 };
const ZOOM_CLOSE = 16;
const ZOOM_CITY = 12;
const PIN_SIZE = 48;

/** Drag the map under a fixed centre pin; the centre is the chosen point. */
export function MapPicker({ initial, onConfirm }: MapPickerProps) {
  const theme = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const mapStyle = useMapStyle();
  const map = useRef<MapRef>(null);
  const camera = useRef<CameraRef>(null);
  const markers = useCatMap().data?.items;
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [bounds, setBounds] = useState<LngLatBounds | null>(null);
  const clusters = markers && size && bounds ? clusterMarkers(markers, bounds, size, CLUSTER_RADIUS) : [];
  const start = initial ?? FALLBACK;
  const [center, setCenter] = useState(start);
  // Only reads the permission: the dot shows without this screen asking for it by itself.
  const [permission] = useForegroundPermissions();
  const [located, setLocated] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function goToMe() {
    setError(null);
    setLocating(true);
    const fix = await currentLocation();
    setLocating(false);
    if (!fix) {
      setError(t.common.locationUnavailable);
      return;
    }
    setLocated(true);
    camera.current?.easeTo({ center: [fix.lng, fix.lat], zoom: ZOOM_CLOSE, duration: 400 });
  }

  return (
    <View style={styles.flex}>
      <View style={styles.flex} onLayout={(e) => setSize(e.nativeEvent.layout)}>
        <Map
          ref={map}
          style={styles.flex}
          mapStyle={mapStyle}
          logo={false}
          touchRotate={false}
          touchPitch={false}
          onDidFinishLoadingMap={async () => setBounds((await map.current?.getBounds()) ?? null)}
          onRegionDidChange={({ nativeEvent: { center: [lng, lat], bounds: visible } }) => {
            setCenter({ lat, lng });
            setBounds(visible);
          }}>
          <Camera
            ref={camera}
            initialViewState={{ center: [start.lng, start.lat], zoom: initial ? ZOOM_CLOSE : ZOOM_CITY }}
          />
          {located || permission?.granted ? <UserLocation /> : null}
          {clusters.map((c) => (
            <CatPin key={c.key} cluster={c} />
          ))}
        </Map>
        <View pointerEvents="none" style={styles.pinWrap}>
          <ThemedText style={styles.pin}>📍</ThemedText>
        </View>
        <PlaceSearch
          // The iOS header floats over the map.
          style={[styles.search, { top: (Platform.OS === 'ios' ? headerHeight : 0) + Spacing.two }]}
          onFound={(place) =>
            camera.current?.easeTo({ center: [place.lng, place.lat], zoom: PLACE_ZOOM, duration: 400 })
          }
        />
      </View>
      <View
        style={[
          styles.panel,
          { backgroundColor: theme.background, paddingBottom: insets.bottom + Spacing.three },
        ]}>
        <ThemedText type="small" themeColor="textSecondary">
          {t.capture.mapHint}
        </ThemedText>
        <FormError message={error} />
        <View style={styles.row}>
          <Button title={t.common.myLocation} variant="secondary" onPress={goToMe} loading={locating} />
          <Button title={t.capture.choose} style={styles.flex} onPress={() => onConfirm(center)} />
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
  search: { position: 'absolute', left: Spacing.three, right: Spacing.three },
  panel: { padding: Spacing.three, gap: Spacing.two },
  row: { flexDirection: 'row', gap: Spacing.two },
});
