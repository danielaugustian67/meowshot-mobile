import {
  Camera,
  Map,
  UserLocation,
  type CameraRef,
  type LngLatBounds,
  type MapRef,
} from '@maplibre/maplibre-react-native';
import { Image } from 'expo-image';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FormError } from '@/components/form-screen';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Pastels, Spacing } from '@/constants/theme';
import { currentLocation } from '@/features/capture/media';
import { PLACE_SEARCH_HEIGHT, PLACE_ZOOM, PlaceSearch } from '@/features/capture/place-search';
import { useHideTabBar } from '@/hooks/use-hide-tab-bar';
import { useStackLinks } from '@/hooks/use-stack-links';
import { useTheme } from '@/hooks/use-theme';
import { errorMessage } from '@/lib/api/errors';
import type { MapMarker } from '@/lib/api/types';
import { catName, timeAgo } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { useMapStyle } from '@/lib/map-style';

import { CatPin, CLUSTER_RADIUS, thumbKey } from './cat-pin';
import { boundsOf, clusterMarkers, spread, type Cluster } from './cluster';
import { useCatMap } from './queries';

// About 20 m: cats this close stay one pin at any zoom, so tapping them lists them instead of zooming.
const SAME_SPOT = 0.0002;
const ZOOM_CLOSE = 16;
const PIN_TAP_MS = 300;
// Monas, Jakarta, as in the capture map: somewhere to start when there is nothing to show yet.
const FALLBACK = { center: [106.8272, -6.1754] as [number, number], zoom: 12 };
const EDGE = { top: 80, right: 60, bottom: 80, left: 60 };
const NO_MARKERS: MapMarker[] = [];

/** All your cats on a map, each at the last place it was seen. Close pins merge into a count. */
export default function CatMapScreen() {
  const theme = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  // The iOS header floats over the map, so the map's own controls and framing start below it.
  const headerOverlap = Platform.OS === 'ios' ? headerHeight : 0;
  const { openCat } = useStackLinks();
  // The full height is the map's; the card at the bottom takes the tab bar's place.
  useHideTabBar();
  const query = useCatMap();
  const markers = query.data?.items ?? NO_MARKERS;
  const mapStyle = useMapStyle();
  const map = useRef<MapRef>(null);
  const camera = useRef<CameraRef>(null);
  const [ready, setReady] = useState(false);
  const fitted = useRef(false);
  const pinPressed = useRef(false);
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  const [bounds, setBounds] = useState<LngLatBounds | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [cardHeight, setCardHeight] = useState(0);
  const [locating, setLocating] = useState(false);
  const [located, setLocated] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Read from the latest data, so a cat deleted or renamed meanwhile is not shown stale.
  const selected = markers.filter((m) => selectedIds.includes(m.cat_id));
  const clusters = size && bounds ? clusterMarkers(markers, bounds, size, CLUSTER_RADIUS) : [];

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
  // The header and the card sit over the map, so whatever the camera frames stays clear of them.
  const covered = { top: headerOverlap + Spacing.two + PLACE_SEARCH_HEIGHT, right: 0, left: 0, bottom: card ? cardHeight : insets.bottom };

  function frame(group: MapMarker[], duration: number) {
    camera.current?.fitBounds(boundsOf(group), {
      padding: {
        top: covered.top + EDGE.top,
        right: EDGE.right,
        bottom: covered.bottom + EDGE.bottom,
        left: EDGE.left,
      },
      duration,
    });
  }

  function showAll(animated: boolean) {
    if (markers.length === 1) {
      const [only] = markers;
      camera.current?.easeTo({
        center: [only.lng, only.lat],
        zoom: ZOOM_CLOSE,
        padding: covered,
        duration: animated ? 400 : 0,
      });
    } else if (markers.length > 1) {
      frame(markers, animated ? 400 : 0);
    }
  }

  // Frame every cat once, as soon as both the map and the markers are there.
  useEffect(() => {
    if (!ready || fitted.current || !markers.length) return;
    fitted.current = true;
    showAll(false);
  });

  function pressCluster(c: Cluster) {
    pinPressed.current = true;
    setTimeout(() => (pinPressed.current = false), PIN_TAP_MS);
    if (c.markers.length === 1 || spread(c.markers) < SAME_SPOT) {
      setSelectedIds(c.markers.map((m) => m.cat_id));
      return;
    }
    setSelectedIds([]);
    frame(c.markers, 400);
  }

  function goToPlace(place: { lat: number; lng: number }) {
    setSelectedIds([]);
    camera.current?.easeTo({ center: [place.lng, place.lat], zoom: PLACE_ZOOM, padding: covered, duration: 400 });
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
    camera.current?.easeTo({ center: [fix.lng, fix.lat], zoom: ZOOM_CLOSE, padding: covered, duration: 400 });
  }

  return (
    <View style={styles.flex} onLayout={(e) => setSize(e.nativeEvent.layout)}>
      <Map
        ref={map}
        style={styles.flex}
        mapStyle={mapStyle}
        logo={false}
        // Clustering reads the visible box as north-up and flat.
        touchRotate={false}
        touchPitch={false}
        // Keeps the required map credit clear of the card and the home indicator.
        attributionPosition={{ bottom: covered.bottom + Spacing.two, left: Spacing.two }}
        onDidFinishLoadingMap={async () => {
          setBounds((await map.current?.getBounds()) ?? null);
          setReady(true);
        }}
        onRegionDidChange={(e) => setBounds(e.nativeEvent.bounds)}
        onPress={() => {
          // On iOS a tap on a pin reaches the map too, which would close the card it just opened.
          if (!pinPressed.current) setSelectedIds([]);
        }}>
        <Camera ref={camera} initialViewState={FALLBACK} />
        {/* Only after asking for it, so opening the map never pops the location prompt by itself. */}
        {located ? <UserLocation /> : null}
        {clusters.map((c) => (
          <CatPin key={c.key} cluster={c} onPress={() => pressCluster(c)} />
        ))}
      </Map>

      <View pointerEvents="box-none" style={[styles.overlay, { top: headerOverlap + Spacing.two }]}>
        <PlaceSearch onFound={goToPlace} />
        <View style={styles.tools}>
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
                <Image
                  source={{ uri: m.thumb_url, cacheKey: thumbKey(m.thumb_url) }}
                  style={StyleSheet.absoluteFill}
                  contentFit="cover"
                />
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
  overlay: { position: 'absolute', left: Spacing.three, right: Spacing.three, gap: Spacing.two },
  tools: { alignSelf: 'flex-end', gap: Spacing.two },
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
