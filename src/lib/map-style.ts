import { useColorScheme } from '@/hooks/use-color-scheme';

// OpenFreeMap: OpenStreetMap maps with no key or account. MapLibre shows the attribution they require.
const STYLES = {
  light: 'https://tiles.openfreemap.org/styles/liberty',
  dark: 'https://tiles.openfreemap.org/styles/dark',
};

/** The map style that matches the app's theme. */
export function useMapStyle() {
  return useColorScheme() === 'dark' ? STYLES.dark : STYLES.light;
}
