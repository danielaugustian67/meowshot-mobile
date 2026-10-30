import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';

import { FormError } from '@/components/form-screen';
import { HeroIcon } from '@/components/hero-icon';
import { PawPattern } from '@/components/paw-pattern';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { setDraft, type DraftLocation } from '@/features/capture/draft';
import { readExif } from '@/features/capture/exif';
import { compressPhoto, currentLocation, ensureLocationPermission } from '@/features/capture/media';

const PICKER_OPTIONS: ImagePicker.ImagePickerOptions = { mediaTypes: 'images', exif: true, quality: 1 };

export default function CaptureScreen() {
  const theme = useTheme();
  const [busy, setBusy] = useState<'camera' | 'library' | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function prepare(
    asset: ImagePicker.ImagePickerAsset,
    origin: 'camera' | 'library',
    locating: Promise<DraftLocation | null> | null,
  ) {
    // GPS order from the PRD (LOC-2): photo EXIF, then the device fix taken with the camera,
    // otherwise the user picks it on the review screen.
    const exif = readExif(asset.exif);
    const photo = await compressPhoto(asset.uri, asset.width, asset.height);
    const location: DraftLocation | null = exif.coords
      ? { ...exif.coords, source: 'exif' }
      : locating
        ? await locating
        : null;
    setDraft({ photo, origin, location, takenAt: exif.takenAt });
    router.push('/capture/review');
  }

  async function fromCamera() {
    setError(null);
    setBusy('camera');
    try {
      let locating: Promise<DraftLocation | null> | null = null;
      // Browsers only open the camera directly from a tap, so nothing may be awaited first on web.
      if (Platform.OS !== 'web') {
        // Ask for location before the camera opens, then let the fix run while the user frames the shot.
        locating = (await ensureLocationPermission()) ? currentLocation() : Promise.resolve(null);
        const cam = await ImagePicker.requestCameraPermissionsAsync();
        if (!cam.granted) {
          setError('Izinkan kamera di Pengaturan.');
          return;
        }
      }
      const res = await ImagePicker.launchCameraAsync(PICKER_OPTIONS);
      if (res.canceled || !res.assets?.length) return;
      await prepare(res.assets[0], 'camera', locating ?? currentLocation());
    } catch {
      setError('Kamera tidak bisa dibuka.');
    } finally {
      setBusy(null);
    }
  }

  async function fromLibrary() {
    setError(null);
    setBusy('library');
    try {
      const res = await ImagePicker.launchImageLibraryAsync(PICKER_OPTIONS);
      if (res.canceled || !res.assets?.length) return;
      // A gallery photo may be old, so the current position is not assumed to be where it was taken.
      await prepare(res.assets[0], 'library', null);
    } catch {
      setError('Foto tidak bisa dibuka.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}>
      <PawPattern inScroll />
      <View style={styles.hero}>
        <HeroIcon />
        <ThemedText type="smallBold">Ketemu kucing?</ThemedText>
      </View>
      <Button title="Ambil foto" onPress={fromCamera} loading={busy === 'camera'} disabled={busy !== null} />
      <Button
        title="Dari galeri"
        variant="secondary"
        onPress={fromLibrary}
        loading={busy === 'library'}
        disabled={busy !== null}
      />
      <FormError message={error} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.four, gap: Spacing.three },
  hero: { alignItems: 'center', gap: Spacing.three, paddingVertical: Spacing.five },
});
