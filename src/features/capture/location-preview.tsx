import { Platform, StyleSheet, View } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

export type LocationPreviewProps = { lat: number; lng: number };

/** A small, still map with a pin, to show exactly what an EXACT public post reveals. */
export function LocationPreview({ lat, lng }: LocationPreviewProps) {
  return (
    <View style={styles.frame} pointerEvents="none">
      <MapView
        style={StyleSheet.absoluteFill}
        initialRegion={{ latitude: lat, longitude: lng, latitudeDelta: 0.004, longitudeDelta: 0.004 }}
        // Lite mode draws a bitmap instead of a live map: much lighter on low-end Android.
        liteMode={Platform.OS === 'android'}
        scrollEnabled={false}
        zoomEnabled={false}
        rotateEnabled={false}
        pitchEnabled={false}
        toolbarEnabled={false}>
        <Marker coordinate={{ latitude: lat, longitude: lng }} />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { height: 160, borderRadius: 12, overflow: 'hidden' },
});
