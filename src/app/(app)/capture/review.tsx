import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { FormError } from '@/components/form-screen';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { CatOption } from '@/features/capture/cat-option';
import { updateDraft, useCaptureDraft, type DraftLocation } from '@/features/capture/draft';
import { currentLocation } from '@/features/capture/media';
import { capture, catsApi } from '@/lib/api/endpoints';
import { errorMessage } from '@/lib/api/errors';
import { queryClient, queryKeys } from '@/lib/query';

const SUGGEST_RADIUS_M = 300; // same radius the server uses for capture suggestions

function describe(loc: DraftLocation) {
  switch (loc.source) {
    case 'exif':
      return 'Dari data foto';
    case 'manual':
      return 'Dipilih di peta';
    default:
      return loc.accuracy ? `GPS perangkat (±${Math.round(loc.accuracy)} m)` : 'GPS perangkat';
  }
}

export default function ReviewScreen() {
  const theme = useTheme();
  const draft = useCaptureDraft();
  const [label, setLabel] = useState('');
  const [name, setName] = useState('');
  const [target, setTarget] = useState<number | 'new'>('new');
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loc = draft?.location ?? null;
  const nearby = useQuery({
    queryKey: queryKeys.nearbyCats(loc?.lat ?? 0, loc?.lng ?? 0),
    queryFn: () => catsApi.nearby(loc!.lat, loc!.lng, SUGGEST_RADIUS_M),
    enabled: !!loc,
  });

  if (!draft) return <Redirect href="/capture" />;

  const suggestions = loc ? (nearby.data?.items ?? []) : [];
  // A cat chosen earlier may drop out of the list when the location changes.
  const chosen = target !== 'new' && suggestions.some((s) => s.cat.id === target) ? target : 'new';

  async function pickCurrentLocation() {
    setError(null);
    setLocating(true);
    const fix = await currentLocation();
    setLocating(false);
    if (fix) updateDraft({ location: fix });
    else setError('Lokasi tidak tersedia. Izinkan akses lokasi, atau pilih titiknya di peta.');
  }

  async function save() {
    if (!draft) return;
    setError(null);
    setSaving(true);
    try {
      const res = await capture(
        { uri: draft.photo.uri, name: 'kucing.jpg', type: 'image/jpeg' },
        {
          lat: loc?.lat,
          lng: loc?.lng,
          // The server only knows device/manual; EXIF read on the phone counts as device data.
          location_source: loc ? (loc.source === 'manual' ? 'manual' : 'device') : undefined,
          label: label.trim() || undefined,
          seen_at: draft.takenAt ?? undefined,
          cat_id: chosen === 'new' ? undefined : chosen,
          name: chosen === 'new' ? name.trim() || undefined : undefined,
        },
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.cats });
      queryClient.invalidateQueries({ queryKey: queryKeys.me });
      router.replace({
        pathname: '/capture/done',
        params: { catId: res.cat.id, name: res.cat.name ?? '', isNew: chosen === 'new' ? '1' : '0' },
      });
    } catch (e) {
      setError(errorMessage(e));
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={[styles.flex, { backgroundColor: theme.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Image
          source={{ uri: draft.photo.uri }}
          style={[styles.photo, { aspectRatio: draft.photo.width / draft.photo.height || 1 }]}
          contentFit="cover"
          accessibilityLabel="Foto kucing yang akan disimpan"
        />

        <View style={styles.section}>
          <ThemedText type="smallBold">Lokasi</ThemedText>
          <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
            {loc ? (
              <>
                <ThemedText>📍 {describe(loc)}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}
                </ThemedText>
              </>
            ) : (
              <ThemedText themeColor="textSecondary">
                Foto ini tidak punya data lokasi. Pakai lokasimu sekarang atau pilih di peta.
              </ThemedText>
            )}
            <View style={styles.row}>
              <Button
                title="Lokasiku sekarang"
                variant="secondary"
                style={styles.flex}
                onPress={pickCurrentLocation}
                loading={locating}
              />
              <Button
                title="Pilih di peta"
                variant="secondary"
                style={styles.flex}
                onPress={() => router.push('/capture/pick-location')}
              />
            </View>
          </View>
          <TextField
            label="Label lokasi (opsional)"
            placeholder="Depan Indomaret Jl. Melati"
            value={label}
            onChangeText={setLabel}
            maxLength={200}
          />
        </View>

        <View style={styles.section} accessibilityRole="radiogroup">
          <ThemedText type="smallBold">Simpan ke</ThemedText>
          <CatOption kind="new" selected={chosen === 'new'} onPress={() => setTarget('new')} />
          {loc && nearby.isPending ? <ActivityIndicator style={styles.spinner} /> : null}
          {suggestions.length > 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              Kucing yang pernah kamu temui di dekat sini. Apakah salah satunya?
            </ThemedText>
          ) : null}
          {suggestions.map((s) => (
            <CatOption
              key={s.cat.id}
              kind="cat"
              cat={s.cat}
              distanceM={s.distance_m}
              selected={chosen === s.cat.id}
              onPress={() => setTarget(s.cat.id)}
            />
          ))}
          {chosen === 'new' ? (
            <TextField
              label="Nama (opsional)"
              placeholder="Oyen"
              value={name}
              onChangeText={setName}
              maxLength={60}
              hint="Boleh dikosongkan dan diisi belakangan."
            />
          ) : null}
        </View>

        <FormError message={error} />
        <Button title={chosen === 'new' ? 'Simpan kucing baru' : 'Tambahkan foto'} onPress={save} loading={saving} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { padding: Spacing.four, gap: Spacing.four, paddingBottom: Spacing.six },
  photo: { width: '100%', maxHeight: 420, borderRadius: 16 },
  section: { gap: Spacing.two },
  card: { borderRadius: 14, padding: Spacing.three, gap: Spacing.two },
  row: { flexDirection: 'row', gap: Spacing.two, marginTop: Spacing.one },
  spinner: { paddingVertical: Spacing.two },
});
