import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { Cat } from '@/lib/api/types';
import { useT } from '@/lib/i18n';
import { catName, daysAgo, distance } from '@/lib/format';

type Props = {
  selected: boolean;
  onPress: () => void;
} & ({ kind: 'new' } | { kind: 'cat'; cat: Cat; distanceM: number });

/** One choice in "simpan ke": a new cat, or an existing cat seen nearby. */
export function CatOption(props: Props) {
  const theme = useTheme();
  const t = useT();
  const cover = props.kind === 'cat' ? props.cat.cover : null;
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected: props.selected }}
      onPress={props.onPress}
      style={[
        styles.row,
        {
          backgroundColor: props.selected ? theme.backgroundSelected : theme.backgroundElement,
          borderColor: props.selected ? theme.tint : 'transparent',
        },
      ]}>
      {cover?.thumb_url ? (
        <Image
          source={{ uri: cover.thumb_url, cacheKey: `photo-thumb-${cover.photo_id}` }}
          style={styles.thumb}
          contentFit="cover"
        />
      ) : (
        <View style={[styles.thumb, styles.thumbEmpty, { backgroundColor: theme.backgroundSelected }]}>
          <ThemedText>{props.kind === 'new' ? '✨' : '🐈'}</ThemedText>
        </View>
      )}
      <View style={styles.text}>
        {props.kind === 'new' ? (
          <>
            <ThemedText type="smallBold">{t.capture.newCat}</ThemedText>
          </>
        ) : (
          <>
            <ThemedText type="smallBold">{catName(props.cat.name)}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {distance(props.distanceM)}
              {props.cat.last_sighting ? ` · ${daysAgo(props.cat.last_sighting.seen_at)}` : ''}
            </ThemedText>
          </>
        )}
      </View>
      <View style={[styles.radio, { borderColor: props.selected ? theme.tint : theme.border }]}>
        {props.selected ? <View style={[styles.radioDot, { backgroundColor: theme.tint }]} /> : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.two,
    paddingRight: Spacing.three,
    borderRadius: 14,
    borderWidth: 2,
  },
  thumb: { width: 52, height: 52, borderRadius: 10 },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1 },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5 },
});
