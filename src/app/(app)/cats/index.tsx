import { useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, View } from 'react-native';

import { FormError } from '@/components/form-screen';
import { PawPattern } from '@/components/paw-pattern';
import { Placeholder } from '@/components/placeholder';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Spacing } from '@/constants/theme';
import { CatTile } from '@/features/cats/cat-tile';
import { useMyCats } from '@/features/cats/queries';
import { useTheme } from '@/hooks/use-theme';
import { errorMessage } from '@/lib/api/errors';
import { useT } from '@/lib/i18n';

export default function CatsScreen() {
  const theme = useTheme();
  const t = useT();
  const [refreshing, setRefreshing] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  const query = useMyCats();

  if (query.isPending) {
    return (
      <ThemedView style={styles.center}>
        <PawPattern />
        <ActivityIndicator />
      </ThemedView>
    );
  }

  if (query.isError && !query.data) {
    return (
      <ThemedView style={[styles.center, styles.error]}>
        <PawPattern />
        <FormError message={errorMessage(query.error)} />
        <Button title={t.common.retry} variant="secondary" onPress={() => query.refetch()} loading={query.isRefetching} />
      </ThemedView>
    );
  }

  const cats = query.data.pages.flatMap((p) => p.items);

  // Only a pull shows the spinner; background refetches on focus stay silent.
  async function refresh() {
    setRefreshing(true);
    await query.refetch();
    setRefreshing(false);
  }

  return (
    <FlatList
      data={cats}
      keyExtractor={(c) => String(c.id)}
      renderItem={({ item }) => <CatTile cat={item} />}
      numColumns={2}
      ItemSeparatorComponent={RowGap}
      onContentSizeChange={(_, h) => setContentHeight(h)}
      ListHeaderComponent={
        // The empty state draws its own pattern.
        cats.length ? (
          // A zero-height header whose overflow spans the whole list, so the paws scroll with the cats.
          // It cannot sit in front of the FlatList: iOS needs the scroll view first for the large title.
          <View style={styles.patternAnchor}>
            <View style={[styles.patternBox, { height: contentHeight }]}>
              <PawPattern inScroll />
            </View>
          </View>
        ) : undefined
      }
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={cats.length ? styles.content : styles.empty}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} />}
      onEndReached={() => {
        if (query.hasNextPage && !query.isFetchingNextPage) query.fetchNextPage();
      }}
      onEndReachedThreshold={0.5}
      ListFooterComponent={query.isFetchingNextPage ? <ActivityIndicator style={styles.footer} /> : undefined}
      ListEmptyComponent={
        <Placeholder
          icon={{ ios: 'pawprint.fill', android: 'pets', web: 'pets' }}
          title={t.cats.emptyTitle}
          body={t.cats.emptyBody}
        />
      }
    />
  );
}

function RowGap() {
  return <View style={styles.rowGap} />;
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  error: { gap: Spacing.three, padding: Spacing.four },
  // Tiles carry half the gutter on each side; this adds the other half at the screen edges.
  content: { paddingVertical: Spacing.three, paddingHorizontal: Spacing.three / 2 },
  rowGap: { height: Spacing.four },
  patternAnchor: { height: 0 },
  // Back out the content padding so the paws reach the screen edges.
  patternBox: { position: 'absolute', top: -Spacing.three, left: -Spacing.three / 2, right: -Spacing.three / 2 },
  empty: { flexGrow: 1 },
  footer: { paddingVertical: Spacing.four },
});
