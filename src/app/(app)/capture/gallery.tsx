import { Image } from 'expo-image';
import {
  addListener,
  Asset,
  AssetField,
  MediaType,
  presentPermissionsPicker,
  Query,
  usePermissions,
  type AssetMetadata,
} from 'expo-media-library';
import { Stack } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';

import { FormError } from '@/components/form-screen';
import { HeroIcon } from '@/components/hero-icon';
import { PawPattern } from '@/components/paw-pattern';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { pickFromSystemLibrary, startDraft } from '@/features/capture/prepare';
import { useT } from '@/lib/i18n';

const COLUMNS = 4;
const GAP = 2;
const PAGE = 80;

function recentPhotos(offset: number) {
  return new Query()
    .eq(AssetField.MEDIA_TYPE, MediaType.IMAGE)
    .orderBy({ key: AssetField.CREATION_TIME, ascending: false })
    .offset(offset)
    .limit(PAGE)
    .exeForMetadata();
}

export default function GalleryScreen() {
  const theme = useTheme();
  const [permission, requestPermission] = usePermissions({ granularPermissions: ['photo'] });
  const granted = permission?.granted ?? false;

  if (!permission) return <View style={{ flex: 1, backgroundColor: theme.background }} />;
  if (!granted) return <GalleryPermission canAsk={permission.canAskAgain} onAllow={requestPermission} />;
  return <PhotoGrid limited={permission.accessPrivileges === 'limited'} />;
}

function PhotoGrid({ limited }: { limited: boolean }) {
  const theme = useTheme();
  const t = useT();
  const { width } = useWindowDimensions();
  // The iOS header is translucent and floats over content; start the preview below it.
  const headerHeight = useHeaderHeight();
  const [photos, setPhotos] = useState<AssetMetadata[]>([]);
  const [done, setDone] = useState(false);
  const [selected, setSelected] = useState<AssetMetadata | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cell = (width - GAP * (COLUMNS - 1)) / COLUMNS;

  useEffect(() => {
    let alive = true;
    const reload = () =>
      recentPhotos(0).then((first) => {
        if (!alive) return;
        setPhotos(first);
        setDone(first.length < PAGE);
        setSelected((current) => first.find((p) => p.id === current?.id) ?? first[0] ?? null);
      });
    reload();
    // Fires when photos are added or the user changes which photos a limited grant covers.
    const sub = addListener(() => reload());
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);

  async function loadMore() {
    if (done) return;
    const next = await recentPhotos(photos.length);
    setPhotos([...photos, ...next]);
    setDone(next.length < PAGE);
  }

  async function next() {
    if (!selected) return;
    setError(null);
    setBusy(true);
    try {
      const asset = new Asset(selected.id);
      const [location, w, h] = await Promise.all([
        asset.getLocation(),
        selected.width ?? asset.getWidth(),
        selected.height ?? asset.getHeight(),
      ]);
      // creationTime is in milliseconds on both platforms. A library photo may be old, so only its own
      // location counts, never the current position.
      await startDraft(
        { uri: selected.id, width: w, height: h },
        'library',
        location ? { lat: location.latitude, lng: location.longitude, source: 'exif' } : null,
        selected.creationTime ? new Date(selected.creationTime).toISOString() : null,
      );
    } catch {
      setError(t.common.photoOpenFailed);
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1, paddingTop: headerHeight, backgroundColor: theme.background }}>
      <Stack.Screen
        options={{
          headerRight: () =>
            busy ? (
              <ActivityIndicator color={theme.tint} />
            ) : (
              <Pressable accessibilityRole="button" disabled={!selected} onPress={next} hitSlop={8}>
                <ThemedText type="smallBold" style={{ color: theme.tint, fontSize: 17, opacity: selected ? 1 : 0.4 }}>
                  {t.common.next}
                </ThemedText>
              </Pressable>
            ),
        }}
      />
      <View style={[styles.preview, { height: width * 0.75, backgroundColor: theme.backgroundElement }]}>
        {selected && <Image source={{ uri: selected.id }} style={StyleSheet.absoluteFill} contentFit="cover" />}
      </View>
      <FormError message={error} />
      {limited && (
        <Pressable
          accessibilityRole="button"
          onPress={() => presentPermissionsPicker(['photo']).catch(() => Linking.openSettings())}
          style={[styles.limited, { borderBottomColor: theme.border }]}>
          <ThemedText type="small" themeColor="textSecondary">
            {t.capture.limited}
          </ThemedText>
          <ThemedText type="smallBold" style={{ color: theme.tint }}>
            {t.capture.manage}
          </ThemedText>
        </Pressable>
      )}
      <FlatList
        data={photos}
        keyExtractor={(p) => p.id}
        numColumns={COLUMNS}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.grid}
        contentInsetAdjustmentBehavior="automatic"
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        renderItem={({ item }) => {
          const active = item.id === selected?.id;
          return (
            <Pressable
              accessibilityRole="imagebutton"
              accessibilityState={{ selected: active }}
              onPress={() => setSelected(item)}
              style={{ width: cell, height: cell }}>
              <Image source={{ uri: item.id }} style={StyleSheet.absoluteFill} contentFit="cover" recyclingKey={item.id} />
              {active && (
                <View style={styles.selected}>
                  <SymbolView
                    name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }}
                    size={22}
                    tintColor={theme.tint}
                  />
                </View>
              )}
            </Pressable>
          );
        }}
      />
    </View>
  );
}

function GalleryPermission({ canAsk, onAllow }: { canAsk: boolean; onAllow: () => void }) {
  const theme = useTheme();
  const t = useT();
  const [error, setError] = useState<string | null>(null);

  async function pickOne() {
    setError(null);
    try {
      await pickFromSystemLibrary();
    } catch {
      setError(t.common.photoOpenFailed);
    }
  }

  return (
    <View style={[styles.permission, { backgroundColor: theme.background }]}>
      <PawPattern />
      <View style={styles.hero}>
        <HeroIcon name={{ ios: 'photo.on.rectangle', android: 'photo_library', web: 'photo_library' }} />
        <ThemedText type="smallBold">{t.capture.allowGallery}</ThemedText>
      </View>
      <Button title={canAsk ? t.common.allow : t.common.openSettings} onPress={canAsk ? onAllow : () => Linking.openSettings()} />
      <Button title={t.capture.pickOne} variant="secondary" onPress={pickOne} />
      <FormError message={error} />
    </View>
  );
}

const styles = StyleSheet.create({
  preview: { width: '100%', overflow: 'hidden' },
  limited: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  grid: { gap: GAP, paddingTop: GAP },
  row: { gap: GAP },
  selected: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(255,255,255,0.35)',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    padding: 4,
  },
  permission: { flex: 1, padding: Spacing.four, gap: Spacing.three, justifyContent: 'center' },
  hero: { alignItems: 'center', gap: Spacing.three, paddingBottom: Spacing.four },
});
