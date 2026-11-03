import { router, Stack } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, View } from 'react-native';

import { FormError } from '@/components/form-screen';
import { PawPattern } from '@/components/paw-pattern';
import { Placeholder } from '@/components/placeholder';
import { CatGridSkeleton } from '@/components/skeleton';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { LeanList } from '@/constants/list';
import { Spacing } from '@/constants/theme';
import { CatTile } from '@/features/cats/cat-tile';
import { MapButton } from '@/features/cats/map-button';
import { catsMerged, useMyCats } from '@/features/cats/queries';
import { useStackLinks } from '@/hooks/use-stack-links';
import { useTheme } from '@/hooks/use-theme';
import { Alert } from '@/lib/alert';
import { catsApi } from '@/lib/api/endpoints';
import { errorMessage } from '@/lib/api/errors';
import { confirmDestructive } from '@/lib/confirm';
import { catName } from '@/lib/format';
import { hapticSuccess } from '@/lib/haptics';
import { useT } from '@/lib/i18n';

export default function CatsScreen() {
  const theme = useTheme();
  const t = useT();
  const [refreshing, setRefreshing] = useState(false);
  const [contentHeight, setContentHeight] = useState(0);
  // Choosing cats to combine into one album; the first chosen is the one the others move into.
  const [choosing, setChoosing] = useState(false);
  const [chosen, setChosen] = useState<number[]>([]);
  const [merging, setMerging] = useState(false);
  const query = useMyCats();
  const { openCat, tab } = useStackLinks();

  if (query.isPending) return <CatGridSkeleton />;

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

  function stopChoosing() {
    setChoosing(false);
    setChosen([]);
  }

  function toggle(id: number) {
    setChosen((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  }

  async function merge() {
    const [into, ...rest] = chosen;
    setMerging(true);
    try {
      for (const id of rest) {
        await catsApi.merge(id, into);
        // So trying again after a failure doesn't ask for a cat that has already moved.
        setChosen((c) => c.filter((x) => x !== id));
      }
      hapticSuccess();
      stopChoosing();
    } catch (e) {
      Alert.alert(errorMessage(e));
    } finally {
      // Also after a failure part way, when some of them have already moved.
      catsMerged();
      setMerging(false);
    }
  }

  function confirmMerge() {
    const main = cats.find((c) => c.id === chosen[0]);
    confirmDestructive({
      title: t.cats.albumConfirm(chosen.length),
      body: t.cats.albumConfirmBody(catName(main?.name ?? null)),
      action: t.cats.albumAction,
      cancel: t.common.cancel,
      onConfirm: merge,
    });
  }

  return (
    <>
      <Stack.Screen
        options={
          choosing
            ? {
                title: t.cats.albumTitle,
                headerLeft: () => <HeaderText label={t.common.cancel} onPress={stopChoosing} disabled={merging} />,
                headerRight: () => (
                  <HeaderText
                    label={t.cats.albumMerge(chosen.length)}
                    onPress={confirmMerge}
                    disabled={merging || chosen.length < 2}
                    bold
                  />
                ),
              }
            : {
                title: t.tabs.cats,
                headerLeft: undefined,
                headerRight: () => (
                  <View style={styles.headerButtons}>
                    {cats.length > 1 ? (
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={t.cats.album}
                        onPress={() => setChoosing(true)}
                        hitSlop={8}>
                        <SymbolView
                          name={{ ios: 'square.stack', android: 'photo_library', web: 'photo_library' }}
                          size={22}
                          tintColor={theme.text}
                        />
                      </Pressable>
                    ) : null}
                    <MapButton />
                  </View>
                ),
              }
        }
      />
      <FlatList
        {...LeanList}
        data={cats}
        extraData={chosen}
        keyExtractor={(c) => String(c.id)}
        renderItem={({ item }) =>
          choosing ? (
            <CatTile
              cat={item}
              onPress={() => toggle(item.id)}
              picked={chosen.includes(item.id)}
              main={chosen[0] === item.id}
            />
          ) : (
            <CatTile
              cat={item}
              onPress={() => openCat(item.id)}
              onShare={() => router.push({ pathname: '/share-pick', params: { catId: String(item.id), tab } })}
            />
          )
        }
        numColumns={2}
        ItemSeparatorComponent={RowGap}
        onContentSizeChange={(_, h) => setContentHeight(h)}
        ListHeaderComponent={
          // The empty state draws its own pattern.
          cats.length ? (
            // A zero-height header whose overflow spans the whole list, so the paws scroll with the cats.
            // It cannot sit in front of the FlatList: iOS needs the scroll view first for the large title.
            <>
              <View style={styles.patternAnchor}>
                <View style={[styles.patternBox, { height: contentHeight }]}>
                  <PawPattern inScroll />
                </View>
              </View>
              {choosing ? (
                <ThemedText type="small" themeColor="textSecondary" style={styles.hint}>
                  {t.cats.albumHint}
                </ThemedText>
              ) : null}
            </>
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
    </>
  );
}

function HeaderText({
  label,
  onPress,
  disabled,
  bold,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  bold?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      style={({ pressed }) => ({ opacity: disabled || pressed ? 0.4 : 1 })}>
      <ThemedText type={bold ? 'smallBold' : 'small'}>{label}</ThemedText>
    </Pressable>
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
  headerButtons: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  hint: { paddingHorizontal: Spacing.three / 2, paddingBottom: Spacing.three },
  // Back out the content padding so the paws reach the screen edges.
  patternBox: { position: 'absolute', top: -Spacing.three, left: -Spacing.three / 2, right: -Spacing.three / 2 },
  empty: { flexGrow: 1 },
  footer: { paddingVertical: Spacing.four },
});
