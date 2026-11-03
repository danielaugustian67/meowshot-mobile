import { StyleSheet, Text, View } from 'react-native';

import { useMapStyle } from '@/lib/map-style';
import { Camera, Map, Marker } from '@/lib/maplibre';

export type LocationPreviewProps = { lat: number; lng: number };

/** A small, still map with a pin, to show exactly what an EXACT public post reveals. */
export function LocationPreview({ lat, lng }: LocationPreviewProps) {
  const mapStyle = useMapStyle();
  return (
    <View style={styles.frame} pointerEvents="none">
      <Map
        style={StyleSheet.absoluteFill}
        mapStyle={mapStyle}
        logo={false}
        dragPan={false}
        touchZoom={false}
        doubleTapZoom={false}
        doubleTapHoldZoom={false}
        touchRotate={false}
        touchPitch={false}>
        <Camera initialViewState={{ center: [lng, lat], zoom: 16 }} />
        <Marker lngLat={[lng, lat]} anchor="bottom">
          <Text style={styles.pin}>📍</Text>
        </Marker>
      </Map>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { height: 160, borderRadius: 12, overflow: 'hidden' },
  pin: { fontSize: 28, lineHeight: 34 },
});
