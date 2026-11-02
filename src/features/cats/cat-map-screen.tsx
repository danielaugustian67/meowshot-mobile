import { Image } from 'expo-image';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FormError } from '@/components/form-screen';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Pastels, Spacing } from '@/constants/theme';
import { currentLocation } from '@/features/capture/media';
import { useHideTabBar } from '@/hooks/use-hide-tab-bar';
import { useStackLinks } from '@/hooks/use-stack-links';
import { useTheme } from '@/hooks/use-theme';
import { errorMessage } from '@/lib/api/errors';
import type { MapMarker } from '@/lib/api/types';
import { catName, timeAgo } from '@/lib/format';
import { useT } from '@/lib/i18n';

import { clusterMarkers, spread, type Cluster } from './cluster';
import { useCatMap } from './queries';

const PIN = 48;
// Pins closer than this on screen merge into one, a little under a pin's width so they barely touch first.
const CLUSTER_RADIUS = PIN * 0.9;
// About 20 m: cats this close stay one pin at any zoom, so tapping them lists them instead of zooming.
const SAME_SPOT = 0.0002;
const ZOOMED = { latitudeDelta: 0.004, longitudeDelta: 0.004 };
// Monas, Jakarta, as in the capture map: somewhere to start when there is nothing to show yet.
const FALLBACK: Region = { latitude: -6.1754, longitude: 106.8272, latitudeDelta: 0.08, longitudeDelta: 0.08 };
const EDGE = { top: 80, right: 60, bottom: 80, left: 60 };
const NO_MARKERS: MapMarker[] = [];

/** All your cats on a map, each at the last place it was seen. Close pins merge into a count. */
export default function CatMapScreen() {
  const theme = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  // The header floats over the map, so the map's own controls and framing start below it.
  const headerHeight = useHeaderHeight();
  const { openCat } = useStackLinks();
  // The full height is the map's; the card at the bottom takes the tab bar's place.
  useHideTabBar();
  const query = useCatMap();
  const markers = query.data?.items ?? NO_MARKERS;
  const map = useRef<MapView>(null);
  const [ready, setReady] = useState(false);
  const fitted = useRef(false);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [region, setRegion] = useState<Region>(FALLBACK);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [cardHeight, setCardHeight] = useState(0);
  const [locating, setLocating] = useState(false);
  const [located, setLocated] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Read from the latest data, so a cat deleted or renamed meanwhile is not shown stale.
  const selected = markers.filter((m) => selectedIds.includes(m.cat_id));
  const clusters = size ? clusterMarkers(markers, region, size, CLUSTER_RADIUS) : [];

  function showAll(animated: boolean) {
    if (markers.length === 1) {
      const [only] = markers;
      map.current?.animateToRegion({ latitude: only.lat, longitude: only.lng, ...ZOOMED }, animated ? 400 : 0);
    } else if (markers.length > 1) {
      map.current?.fitToCoordinates(
        markers.map((m) => ({ latitude: m.lat, longitude: m.lng })),
        { edgePadding: EDGE, animated },
      );
    }
  }

  // Frame every cat once, as soon as both the map and the markers are there.
  useEffect(() => {
    if (!ready || fitted.current || !markers.length) return;
    fitted.current = true;
    showAll(false);
  });

  function pressCluster(c: Cluster) {
    if (c.markers.length === 1 || spread(c.markers) < SAME_SPOT) {
      setSelectedIds(c.markers.map((m) => m.cat_id));
      return;
    }
    setSelectedIds([]);
    map.current?.fitToCoordinates(
      c.markers.map((m) => ({ latitude: m.lat, longitude: m.lng })),
      { edgePadding: EDGE, animated: true },
    );
  }

  async function goToMe() {
    setLocationError(null);
    setLocating(true);
    const fix = await currentLocation();
    setLocating(false);
    if (!fix) {
      setLocationError(t.common.locationUnavailable);
      return;
    }
    setLocated(true);
    map.current?.animateToRegion({ latitude: fix.lat, longitude: fix.lng, ...ZOOMED }, 400);
  }

  const status = query.isPending ? (
    <ActivityIndicator />
  ) : query.isError ? (
    <View style={styles.gap}>
      <FormError message={errorMessage(query.error)} />
      <Button title={t.common.retry} variant="secondary" onPress={() => query.refetch()} loading={query.isRefetching} />
    </View>
  ) : !markers.length ? (
    <View style={styles.gapSmall}>
      <ThemedText type="smallBold">{t.cats.mapEmptyTitle}</ThemedText>
      <ThemedText type="small" themeColor="textSecondary">
        {t.cats.mapEmptyBody}
      </ThemedText>
    </View>
  ) : null;
  const card = status || selected.length || locationError;

  return (
    <View style={styles.flex} onLayout={(e) => setSize(e.nativeEvent.layout)}>
      <MapView
        ref={map}
        style={styles.flex}
        initialRegion={FALLBACK}
        // Keeps the map's legal notice and "show all" framing clear of the header, the card and the home indicator.
        mapPadding={{ top: headerHeight, right: 0, left: 0, bottom: card ? cardHeight : insets.bottom }}
        // Only after asking for it, so opening the map never pops the location prompt by itself.
        showsUserLocation={located}
        showsMyLocationButton={false}
        toolbarEnabled={false}
        onMapReady={() => setReady(true)}
        onRegionChangeComplete={setRegion}
        onPress={(e) => {
          // Android reports marker taps here too.
          if (e.nativeEvent.action !== 'marker-press') setSelectedIds([]);
        }}>
        {clusters.map((c) => (
          <CatPin
            // A new pin when the count changes: Android draws a marker's view once, as a bitmap.
            key={`${c.key}-${c.markers.length}`}
            cluster={c}
            onPress={() => pressCluster(c)}
          />
        ))}
      </MapView>

      <View style={[styles.tools, { top: headerHeight + Spacing.three }]}>
        <RoundButton
          icon={{ ios: 'location.fill', android: 'my_location', web: 'my_location' }}
          label={t.common.myLocation}
          onPress={goToMe}
          busy={locating}
        />
        {markers.length ? (
          <RoundButton
            icon={{ ios: 'pawprint.fill', android: 'pets', web: 'pets' }}
            label={t.cats.mapShowAll}
            onPress={() => {
              setSelectedIds([]);
              showAll(true);
            }}
          />
        ) : null}
      </View>

      {card ? (
        <View
          onLayout={(e) => setCardHeight(e.nativeEvent.layout.height)}
          style={[styles.card, { backgroundColor: theme.background, paddingBottom: insets.bottom + Spacing.three }]}>
          <FormError message={locationError} />
          {status ??
            (selected.length ? (
              <Selection cats={selected} onClose={() => setSelectedIds([])} onOpen={openCat} />
            ) : null)}
        </View>
      ) : null}
    </View>
  );
}

/** One cat's cover in a pastel ring, with a count when it stands for several. */
function CatPin({ cluster, onPress }: { cluster: Cluster; onPress: () => void }) {
  const theme = useTheme();
  const top = cluster.markers[0];
  const thumb = top.thumb_url;
  // Android snapshots the view; keep redrawing until the cover is on screen, then stop for speed.
  const [drawn, setDrawn] = useState(!thumb);
  const count = cluster.markers.length;
  return (
    <Marker
      coordinate={{ latitude: cluster.lat, longitude: cluster.lng }}
      anchor={{ x: 0.5, y: 0.5 }}
      tracksViewChanges={!drawn}
      onPress={(e) => {
        e.stopPropagation();
        onPress();
      }}>
      <View style={styles.pinBox}>
        <View
          style={[
            styles.pin,
            { borderColor: Pastels[top.cat_id % Pastels.length], backgroundColor: theme.backgroundElement },
          ]}>
          {thumb ? (
            <Image
              source={{ uri: thumb }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              onDisplay={() => setDrawn(true)}
              onError={() => setDrawn(true)}
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

/** The cats behind the tapped pin: one, or several seen at the same spot. Each opens its page. */
function Selection({
  cats,
  onClose,
  onOpen,
}: {
  cats: MapMarker[];
  onClose: () => void;
  onOpen: (id: number) => void;
}) {
  const theme = useTheme();
  const t = useT();
  return (
    <View style={styles.gapSmall}>
      <View style={styles.selectionHeader}>
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.flex}>
          {cats.length > 1 ? t.cats.mapHere(cats.length) : t.cats.mapLastSeen}
        </ThemedText>
        <Pressable accessibilityRole="button" accessibilityLabel={t.cats.mapClose} onPress={onClose} hitSlop={12}>
          <SymbolView
            name={{ ios: 'xmark', android: 'close', web: 'close' }}
            size={16}
            tintColor={theme.textSecondary}
          />
        </Pressable>
      </View>
      <ScrollView style={styles.rows} bounces={false}>
        {cats.map((m) => (
          <Pressable
            key={m.cat_id}
            accessibilityRole="link"
            accessibilityLabel={t.cats.open(catName(m.name))}
            onPress={() => onOpen(m.cat_id)}
            style={({ pressed }) => [styles.row, pressed && { backgroundColor: theme.backgroundSelected }]}>
            <View
              style={[
                styles.rowThumb,
                { borderColor: Pastels[m.cat_id % Pastels.length], backgroundColor: theme.backgroundElement },
              ]}>
              {m.thumb_url ? (
                <Image source={{ uri: m.thumb_url }} style={StyleSheet.absoluteFill} contentFit="cover" />
              ) : (
                <SymbolView
                  name={{ ios: 'pawprint.fill', android: 'pets', web: 'pets' }}
                  size={18}
                  tintColor={theme.textSecondary}
                />
              )}
            </View>
            <View style={styles.flex}>
              <ThemedText type="smallBold" numberOfLines={1}>
                {catName(m.name)}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                {m.label ? `${m.label} · ${timeAgo(m.seen_at)}` : timeAgo(m.seen_at)}
              </ThemedText>
            </View>
            <SymbolView
              name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
              size={14}
              tintColor={theme.textSecondary}
            />
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

function RoundButton({
  icon,
  label,
  onPress,
  busy = false,
}: {
  icon: SymbolViewProps['name'];
  label: string;
  onPress: () => void;
  busy?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={busy}
      style={({ pressed }) => [styles.round, { backgroundColor: theme.background, opacity: pressed ? 0.7 : 1 }]}>
      {busy ? <ActivityIndicator /> : <SymbolView name={icon} size={20} tintColor={theme.tint} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: Spacing.three },
  gapSmall: { gap: Spacing.one },
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
  tools: { position: 'absolute', right: Spacing.three, gap: Spacing.two },
  round: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.18)',
  },
  card: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: Spacing.three,
    gap: Spacing.two,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    boxShadow: '0 -2px 12px rgba(0, 0, 0, 0.12)',
  },
  selectionHeader: { flexDirection: 'row', alignItems: 'center' },
  // About three rows; more cats at one spot scroll.
  rows: { maxHeight: 64 * 3 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.one,
    borderRadius: 12,
  },
  rowThumb: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
