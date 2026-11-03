import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { FormError } from '@/components/form-screen';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/lib/i18n';

import { photoAlbums, type PhotoAlbum } from './library';

const COVER = 56;

/** Slides up over the gallery to choose which album it shows. */
export function AlbumSheet({
  currentId,
  onPick,
  onClose,
}: {
  currentId: string | null;
  onPick: (album: PhotoAlbum | null) => void;
  onClose: () => void;
}) {
  const theme = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const [albums, setAlbums] = useState<PhotoAlbum[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    photoAlbums()
      .then((found) => alive && setAlbums(found))
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <Modal transparent visible animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <Pressable accessibilityRole="button" accessibilityLabel={t.common.cancel} onPress={onClose} style={styles.backdrop} />
      <View style={[styles.sheet, { backgroundColor: theme.background, paddingBottom: insets.bottom + Spacing.two }]}>
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.title}>
          {t.capture.chooseAlbum}
        </ThemedText>
        <FlatList
          data={albums ?? []}
          keyExtractor={(a) => a.id}
          ListHeaderComponent={
            <>
              <Row title={t.capture.allPhotos} active={currentId === null} onPress={() => onPick(null)} />
              {!albums && !failed ? <ActivityIndicator style={styles.spinner} /> : null}
              {failed ? <FormError message={t.capture.albumsFailed} /> : null}
            </>
          }
          renderItem={({ item }) => (
            <Row title={item.title} coverId={item.coverId} active={currentId === item.id} onPress={() => onPick(item)} />
          )}
        />
      </View>
    </Modal>
  );
}

function Row({
  title,
  coverId,
  active,
  onPress,
}: {
  title: string;
  coverId?: string;
  active: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={[styles.cover, { backgroundColor: theme.backgroundElement }]}>
        {coverId ? (
          <Image source={{ uri: coverId }} style={StyleSheet.absoluteFill} contentFit="cover" recyclingKey={coverId} />
        ) : (
          <SymbolView
            name={{ ios: 'photo.on.rectangle', android: 'photo_library', web: 'photo_library' }}
            size={24}
            tintColor={theme.text}
          />
        )}
      </View>
      <ThemedText numberOfLines={1} style={styles.name}>
        {title}
      </ThemedText>
      {active ? (
        <SymbolView name={{ ios: 'checkmark', android: 'check', web: 'check' }} size={20} tintColor={theme.tint} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { maxHeight: '70%', borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: Spacing.three },
  title: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.two },
  spinner: { paddingVertical: Spacing.three },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  pressed: { opacity: 0.5 },
  cover: {
    width: COVER,
    height: COVER,
    borderRadius: 8,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  name: { flex: 1 },
});
