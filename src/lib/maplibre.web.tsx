import type { CameraRef, LngLatBounds, MapRef } from '@maplibre/maplibre-react-native';
import { AttributionControl, Map as MapLibre, Marker as MapLibreMarker } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  createContext,
  use,
  useEffect,
  useEffectEvent,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from 'react';
import { createPortal } from 'react-dom';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

// MapLibre React Native has no web build, so the same few components the app uses are drawn with maplibre-gl.

type LngLat = [lng: number, lat: number];
type Padding = { top: number; right: number; bottom: number; left: number };

// Children only render once the map exists.
const MapContext = createContext<MapLibre>(null as unknown as MapLibre);

function boundsOf(map: MapLibre): LngLatBounds {
  const box = map.getBounds();
  return [box.getWest(), box.getSouth(), box.getEast(), box.getNorth()];
}

export function Map({
  ref,
  style,
  mapStyle,
  dragPan = true,
  attributionPosition,
  onDidFinishLoadingMap,
  onRegionDidChange,
  onPress,
  children,
}: {
  ref?: Ref<MapRef>;
  style?: StyleProp<ViewStyle>;
  mapStyle: string;
  dragPan?: boolean;
  attributionPosition?: { bottom: number; left: number };
  onDidFinishLoadingMap?: () => void;
  onRegionDidChange?: (e: { nativeEvent: { center: LngLat; bounds: LngLatBounds } }) => void;
  onPress?: () => void;
  children?: ReactNode;
  // Every map here stays north-up and flat, so the native rotate and pitch switches have no counterpart.
  logo?: boolean;
  touchRotate?: boolean;
  touchPitch?: boolean;
  touchZoom?: boolean;
  doubleTapZoom?: boolean;
  doubleTapHoldZoom?: boolean;
}) {
  const container = useRef<HTMLDivElement>(null);
  const shownStyle = useRef(mapStyle);
  const [map, setMap] = useState<MapLibre | null>(null);
  const finishedLoading = useEffectEvent(() => onDidFinishLoadingMap?.());
  const regionChanged = useEffectEvent((instance: MapLibre) => {
    const { lng, lat } = instance.getCenter();
    onRegionDidChange?.({ nativeEvent: { center: [lng, lat], bounds: boundsOf(instance) } });
  });
  const pressed = useEffectEvent(() => onPress?.());

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const instance = new MapLibre({
      container: element,
      style: shownStyle.current,
      interactive: dragPan,
      dragRotate: false,
      pitchWithRotate: false,
      touchPitch: false,
      maxPitch: 0,
      attributionControl: false,
    });
    instance.touchZoomRotate.disableRotation();
    instance.addControl(new AttributionControl({ compact: true }), 'bottom-left');
    instance.on('load', () => {
      // Folded to its "i" button as on native; a narrow screen would otherwise start with the credit open.
      const credit = element.querySelector('.maplibregl-ctrl-attrib');
      credit?.classList.remove('maplibregl-compact-show');
      credit?.removeAttribute('open');
      finishedLoading();
    });
    instance.on('moveend', () => regionChanged(instance));
    instance.on('click', () => pressed());
    const resize = new ResizeObserver(() => instance.resize());
    resize.observe(element);
    setMap(instance);
    return () => {
      resize.disconnect();
      instance.remove();
      setMap(null);
    };
  }, [dragPan]);

  useEffect(() => {
    if (!map || shownStyle.current === mapStyle) return;
    shownStyle.current = mapStyle;
    map.setStyle(mapStyle);
  }, [map, mapStyle]);

  const creditBottom = attributionPosition?.bottom;
  const creditLeft = attributionPosition?.left;
  useEffect(() => {
    const corner = map?.getContainer().querySelector<HTMLElement>('.maplibregl-ctrl-bottom-left');
    if (!corner) return;
    corner.style.bottom = creditBottom === undefined ? '' : `${creditBottom}px`;
    corner.style.left = creditLeft === undefined ? '' : `${creditLeft}px`;
  }, [map, creditBottom, creditLeft]);

  useImperativeHandle(ref, () => ({ getBounds: async () => (map ? boundsOf(map) : null) }) as unknown as MapRef, [map]);

  return (
    <View style={style}>
      <div ref={container} style={{ position: 'absolute', inset: 0 }} />
      {map ? <MapContext value={map}>{children}</MapContext> : null}
    </View>
  );
}

export function Camera({
  ref,
  initialViewState,
}: {
  ref?: Ref<CameraRef>;
  initialViewState: { center: LngLat; zoom: number };
}) {
  const map = use(MapContext);
  const [start] = useState(initialViewState);

  useEffect(() => {
    map.jumpTo(start);
  }, [map, start]);

  useImperativeHandle(
    ref,
    () =>
      ({
        easeTo: ({ center, zoom, padding, duration }: { center: LngLat; zoom: number; padding?: Padding; duration: number }) =>
          // An offset, not `padding`: maplibre-gl keeps padding for later moves and adds it to the next fitBounds.
          map.easeTo({
            center,
            zoom,
            duration,
            offset: padding ? [(padding.left - padding.right) / 2, (padding.top - padding.bottom) / 2] : [0, 0],
          }),
        fitBounds: (bounds: LngLatBounds, { padding, duration }: { padding: Padding; duration: number }) =>
          map.fitBounds(bounds, { padding, duration }),
      }) as unknown as CameraRef,
    [map],
  );

  return null;
}

export function Marker({
  lngLat: [lng, lat],
  anchor = 'center',
  onPress,
  children,
}: {
  lngLat: LngLat;
  anchor?: 'center' | 'bottom';
  onPress?: () => void;
  children: ReactNode;
}) {
  const map = use(MapContext);
  const [element] = useState(() => document.createElement('div'));
  const marker = useRef<MapLibreMarker | null>(null);

  useEffect(() => {
    const instance = new MapLibreMarker({ element, anchor }).setLngLat([lng, lat]).addTo(map);
    marker.current = instance;
    return () => {
      instance.remove();
    };
    // Moving is the next effect's job, without rebuilding the marker.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, element, anchor]);

  useEffect(() => {
    marker.current?.setLngLat([lng, lat]);
  }, [lng, lat]);

  return createPortal(
    <div onClick={onPress} style={onPress ? { cursor: 'pointer' } : undefined}>
      {children}
    </div>,
    element,
  );
}

/** The blue dot. The browser asks for location the first time it is shown. */
export function UserLocation() {
  const [spot, setSpot] = useState<LngLat | null>(null);

  useEffect(() => {
    const watch = navigator.geolocation?.watchPosition(
      ({ coords }) => setSpot([coords.longitude, coords.latitude]),
      () => setSpot(null),
    );
    return () => {
      if (watch !== undefined) navigator.geolocation.clearWatch(watch);
    };
  }, []);

  return spot ? (
    <Marker lngLat={spot}>
      <View style={styles.dot} />
    </Marker>
  ) : null;
}

const styles = StyleSheet.create({
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 3,
    borderColor: '#ffffff',
    backgroundColor: '#1A73E8',
    boxShadow: '0 1px 4px rgba(0, 0, 0, 0.3)',
  },
});
