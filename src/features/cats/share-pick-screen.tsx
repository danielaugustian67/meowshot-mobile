import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { FormError } from '@/components/form-screen';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { LeanList } from '@/constants/list';
import { Spacing } from '@/constants/theme';
import { postHref, sharePhotoHref, type StackTab } from '@/hooks/use-stack-links';
import { useTheme } from '@/hooks/use-theme';
import { errorMessage } from '@/lib/api/errors';
import type { Photo } from '@/lib/api/types';
import { useT } from '@/lib/i18n';

import { useCatPhotos } from './queries';

const COLUMNS = 3;
const GAP = Spacing.one;

/** Which of a cat's photos to share. A cat with one unshared photo has nothing to choose, so it goes straight on. */
export default function SharePickScreen() {
  const theme = useTheme();
  const t = useT();
  const params = useLocalSearchParams<{ catId: string; tab?: StackTab }>();
  const tab = params.tab ?? 'feed';
  const query = useCatPhotos(Number(params.catId));
  const tile = (useWindowDimensions().width - 2 * Spacing.three - (COLUMNS - 1) * GAP) / COLUMNS;

  if (query.isPending) {
    return (
      <ThemedView style={styles.center}>
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (query.isError && !query.data) {
    return (
      <ThemedView style={[styles.center, styles.error]}>
        <FormError message={errorMessage(query.error)} />
        <Button title={t.common.retry} variant="secondary" onPress={() => query.refetch()} loading={query.isRefetching} />
      </ThemedView>
    );
  }

  const photos = query.data.pages.flatMap((p) => p.items);
  if (photos.length === 1 && !query.hasNextPage && !photos[0].post_id) {
    return <Redirect href={sharePhotoHref(photos[0], tab)} />;
  }

  function choose(photo: Photo) {
    if (photo.post_id) {
      // Back from the post returns to the collection.
      router.back();
      router.push(postHref(tab, photo.post_id));
      return;
    }
    router.replace(sharePhotoHref(photo, tab));
  }

  return (
    <FlatList
      {...LeanList}
      data={photos}
      keyExtractor={(p) => String(p.id)}
      renderItem={({ item }) => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={item.post_id ? t.share.alreadyShared : t.cats.photo}
          onPress={() => choose(item)}
          style={({ pressed }) => [
            styles.photo,
            { width: tile, height: tile, backgroundColor: theme.backgroundElement },
            pressed && styles.pressed,
          ]}>
          {item.thumb_url ? (
            <Image
              source={{ uri: item.thumb_url, cacheKey: `photo-thumb-${item.id}` }}
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={150}
            />
          ) : null}
          {item.post_id ? (
            <View style={styles.shared}>
              <SymbolView name={{ ios: 'checkmark', android: 'check', web: 'check' }} size={12} tintColor="#ffffff" />
            </View>
          ) : null}
        </Pressable>
      )}
      numColumns={COLUMNS}
      columnWrapperStyle={styles.row}
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      ListHeaderComponent={
        <ThemedText type="small" themeColor="textSecondary">
          {photos.some((p) => p.post_id) ? t.share.pickHintShared : t.share.pickHint}
        </ThemedText>
      }
      onEndReached={() => {
        if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
      }}
      onEndReachedThreshold={0.5}
      ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator /> : undefined}
    />
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  error: { gap: Spacing.three, padding: Spacing.four },
  content: { padding: Spacing.three, gap: GAP + Spacing.two },
  row: { gap: GAP },
  photo: { borderRadius: 4, overflow: 'hidden' },
  pressed: { opacity: 0.7 },
  // Always dark behind white, so it reads on any photo in both themes.
  shared: {
    position: 'absolute',
    top: Spacing.one,
    right: Spacing.one,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
});
