import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { Pastels } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { Marker } from '@/lib/maplibre';

import type { Cluster } from './cluster';

const PIN = 48;
// Pins closer than this on screen merge into one, a little under a pin's width so they barely touch first.
export const CLUSTER_RADIUS = PIN * 0.9;

/**
 * Signed URLs change on every fetch, but the path before the query names the photo. Caching by the path
 * keeps a refetched map from downloading and storing every cover again.
 */
export function thumbKey(url: string) {
  return url.split('?')[0];
}

/** One cat's cover in a pastel ring, with a count when it stands for several. */
export function CatPin({ cluster, onPress }: { cluster: Cluster; onPress?: () => void }) {
  const theme = useTheme();
  const top = cluster.markers[0];
  const thumb = top.thumb_url;
  const count = cluster.markers.length;
  return (
    <Marker lngLat={[cluster.lng, cluster.lat]} onPress={onPress}>
      <View style={styles.pinBox}>
        <View
          style={[
            styles.pin,
            { borderColor: Pastels[top.cat_id % Pastels.length], backgroundColor: theme.backgroundElement },
          ]}>
          {thumb ? (
            <Image
              source={{ uri: thumb, cacheKey: thumbKey(thumb) }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
            />
          ) : (
            <SymbolView
              name={{ ios: 'pawprint.fill', android: 'pets', web: 'pets' }}
              size={20}
              tintColor={theme.textSecondary}
            />
          )}
        </View>
        {count > 1 ? (
          <View style={[styles.count, { backgroundColor: theme.tint, borderColor: theme.background }]}>
            <Text style={[styles.countText, { color: theme.onTint }]}>{count}</Text>
          </View>
        ) : null}
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  // Room around the ring for the count badge, which a marker would otherwise clip.
  pinBox: { padding: 6 },
  pin: {
    width: PIN,
    height: PIN,
    borderRadius: PIN / 2,
    borderWidth: 3,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: {
    position: 'absolute',
    top: 0,
    right: 0,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 5,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: { fontSize: 12, lineHeight: 15, fontWeight: 700 },
});
