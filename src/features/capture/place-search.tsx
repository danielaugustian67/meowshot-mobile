import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, TextInput, View, type ViewProps } from 'react-native';

import { FormError } from '@/components/form-screen';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/lib/i18n';

import { ensureLocationPermission, findPlace } from './media';

export const PLACE_SEARCH_HEIGHT = 44;
export const PLACE_ZOOM = 15;

export type PlaceSearchProps = {
  onFound: (place: { lat: number; lng: number }) => void;
  style?: ViewProps['style'];
};

/** Type a place and press search: `onFound` gets where it is. */
export function PlaceSearch({ onFound, style }: PlaceSearchProps) {
  const theme = useTheme();
  const t = useT();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function search() {
    const query = text.trim();
    if (!query) return;
    setError(null);
    setBusy(true);
    // Android's geocoder refuses to run without location access.
    if (Platform.OS === 'android' && !(await ensureLocationPermission())) {
      setBusy(false);
      setError(t.common.searchNeedsLocation);
      return;
    }
    const place = await findPlace(query);
    setBusy(false);
    if (place) onFound(place);
    else setError(t.common.placeNotFound);
  }

  return (
    <View style={[styles.box, { backgroundColor: theme.background }, style]}>
      <View style={styles.row}>
        {busy ? (
          <ActivityIndicator />
        ) : (
          <SymbolView
            name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
            size={18}
            tintColor={theme.textSecondary}
          />
        )}
        <TextInput
          value={text}
          onChangeText={setText}
          onSubmitEditing={search}
          placeholder={t.common.searchPlace}
          placeholderTextColor={theme.textSecondary}
          accessibilityLabel={t.common.searchPlace}
          returnKeyType="search"
          autoCorrect={false}
          style={[styles.input, { color: theme.text }]}
        />
      </View>
      {error ? (
        <View style={styles.error}>
          <FormError message={error} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: PLACE_SEARCH_HEIGHT / 2, boxShadow: '0 2px 8px rgba(0, 0, 0, 0.18)' },
  row: {
    height: PLACE_SEARCH_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  input: { flex: 1, fontSize: 16, padding: 0 },
  error: { paddingHorizontal: Spacing.three, paddingBottom: Spacing.two },
});
