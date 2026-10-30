import { CameraView, useCameraPermissions, type CameraType, type FlashMode } from 'expo-camera';
import { Image } from 'expo-image';
import { AssetField, getPermissionsAsync, MediaType, Query } from 'expo-media-library';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HeroIcon } from '@/components/hero-icon';
import { PawPattern } from '@/components/paw-pattern';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { DraftLocation } from '@/features/capture/draft';
import { currentLocation } from '@/features/capture/media';
import { pickFromSystemLibrary, startDraft } from '@/features/capture/prepare';

const CAMERA: SymbolViewProps['name'] = { ios: 'camera.fill', android: 'photo_camera', web: 'photo_camera' };

/** Newest photo in the library for the gallery shortcut, or null when the app may not read it. */
async function latestPhoto(): Promise<string | null> {
  if (Platform.OS === 'web' || !(await getPermissionsAsync()).granted) return null;
  const [first] = await new Query()
    .eq(AssetField.MEDIA_TYPE, MediaType.IMAGE)
    .orderBy({ key: AssetField.CREATION_TIME, ascending: false })
    .limit(1)
    .exeForMetadata();
  return first?.id ?? null;
}

export default function CameraScreen() {
  const camera = useRef<CameraView>(null);
  const locating = useRef<Promise<DraftLocation | null> | null>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [focused, setFocused] = useState(false);
  const [ready, setReady] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<FlashMode>('off');
  const [thumb, setThumb] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      // Only one camera preview may run at a time, so it lives only while this tab is on screen.
      setFocused(true);
      latestPhoto().then(setThumb, () => setThumb(null));
      return () => {
        setFocused(false);
        setReady(false);
      };
    }, []),
  );

  const cameraAllowed = permission?.granted ?? false;
  useEffect(() => {
    // Start the GPS fix while the user frames the shot, so the shutter does not wait for it.
    // Only once the camera is allowed, so the location prompt never comes first.
    if (focused && cameraAllowed) locating.current = currentLocation();
  }, [focused, cameraAllowed]);

  async function shoot() {
    if (!camera.current || !ready || busy) return;
    setError(null);
    setBusy(true);
    try {
      const picture = await camera.current.takePictureAsync({ quality: 1 });
      await startDraft(picture, 'camera', await (locating.current ?? currentLocation()), null);
    } catch {
      setError('Foto gagal diambil.');
    } finally {
      setBusy(false);
    }
  }

  async function openGallery() {
    setError(null);
    if (Platform.OS !== 'web') {
      router.push('/capture/gallery');
      return;
    }
    try {
      await pickFromSystemLibrary();
    } catch {
      setError('Foto tidak bisa dibuka.');
    }
  }

  if (!permission) return <View style={styles.black} />;

  if (!permission.granted) {
    return <CameraPermission canAsk={permission.canAskAgain} onAllow={requestPermission} onGallery={openGallery} />;
  }

  return (
    <View style={styles.black}>
      {focused && <StatusBar style="light" />}
      {focused && !unavailable && (
        <CameraView
          ref={camera}
          style={StyleSheet.absoluteFill}
          facing={facing}
          flash={flash}
          mirror={facing === 'front'}
          onCameraReady={() => setReady(true)}
          onMountError={() => setUnavailable(true)}
        />
      )}
      {unavailable && (
        <View style={styles.center}>
          <Text style={styles.message}>Kamera tidak tersedia.</Text>
        </View>
      )}

      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']} pointerEvents="box-none">
        <View style={styles.topBar}>
          <RoundButton
            icon={flash === 'on' ? { ios: 'bolt.fill', android: 'flash_on', web: 'flash_on' } : { ios: 'bolt.slash.fill', android: 'flash_off', web: 'flash_off' }}
            label={flash === 'on' ? 'Matikan flash' : 'Nyalakan flash'}
            onPress={() => setFlash(flash === 'on' ? 'off' : 'on')}
          />
        </View>

        <View style={styles.bottom}>
          {error && <Text style={styles.message}>{error}</Text>}
          <View style={styles.controls}>
            <Pressable accessibilityRole="button" accessibilityLabel="Galeri" onPress={openGallery} style={styles.thumb}>
              {thumb ? (
                <Image source={{ uri: thumb }} style={StyleSheet.absoluteFill} contentFit="cover" />
              ) : (
                <SymbolView name={{ ios: 'photo.on.rectangle', android: 'photo_library', web: 'photo_library' }} size={22} tintColor="#fff" />
              )}
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Ambil foto"
              disabled={!ready || busy}
              onPress={shoot}
              style={[styles.shutter, { opacity: !ready || busy ? 0.5 : 1 }]}>
              {({ pressed }) => <View style={[styles.shutterInner, pressed && styles.shutterPressed]} />}
            </Pressable>
            <RoundButton
              icon={{ ios: 'arrow.triangle.2.circlepath', android: 'flip_camera_ios', web: 'flip_camera_ios' }}
              label="Balik kamera"
              onPress={() => setFacing(facing === 'back' ? 'front' : 'back')}
            />
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

function RoundButton({ icon, label, onPress }: { icon: SymbolViewProps['name']; label: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [styles.round, pressed && { opacity: 0.6 }]}>
      <SymbolView name={icon} size={22} tintColor="#fff" />
    </Pressable>
  );
}

function CameraPermission({
  canAsk,
  onAllow,
  onGallery,
}: {
  canAsk: boolean;
  onAllow: () => void;
  onGallery: () => void;
}) {
  const theme = useTheme();
  return (
    <SafeAreaView style={[styles.permission, { backgroundColor: theme.background }]} edges={['top', 'bottom']}>
      <PawPattern />
      <View style={styles.hero}>
        <HeroIcon name={CAMERA} />
        <ThemedText type="smallBold">Izinkan kamera</ThemedText>
      </View>
      <Button title={canAsk ? 'Izinkan' : 'Buka Pengaturan'} onPress={canAsk ? onAllow : () => Linking.openSettings()} />
      <Button title="Dari galeri" variant="secondary" onPress={onGallery} />
    </SafeAreaView>
  );
}

const SHUTTER = 78;
const THUMB = 44;

const styles = StyleSheet.create({
  black: { flex: 1, backgroundColor: '#000' },
  overlay: { ...StyleSheet.absoluteFill, justifyContent: 'space-between' },
  center: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center' },
  message: { color: '#fff', fontSize: 15, fontWeight: '600', textAlign: 'center' },
  topBar: { flexDirection: 'row', paddingHorizontal: Spacing.four, paddingTop: Spacing.two },
  bottom: { gap: Spacing.three, paddingBottom: Spacing.four },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.five,
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#fff',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  shutter: {
    width: SHUTTER,
    height: SHUTTER,
    borderRadius: SHUTTER / 2,
    borderWidth: 5,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: { width: SHUTTER - 18, height: SHUTTER - 18, borderRadius: SHUTTER, backgroundColor: '#fff' },
  shutterPressed: { transform: [{ scale: 0.9 }], opacity: 0.8 },
  round: {
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  permission: { flex: 1, padding: Spacing.four, gap: Spacing.three, justifyContent: 'center' },
  hero: { alignItems: 'center', gap: Spacing.three, paddingBottom: Spacing.four },
});
