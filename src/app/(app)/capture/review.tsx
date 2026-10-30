import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Redirect, router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { FormError } from '@/components/form-screen';
import { PawPattern } from '@/components/paw-pattern';
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
import { useT, type Strings } from '@/lib/i18n';
import { queryClient, queryKeys } from '@/lib/query';

const SUGGEST_RADIUS_M = 300; // same radius the server uses for capture suggestions

function describe(loc: DraftLocation, t: Strings) {
  switch (loc.source) {
    case 'exif':
      return t.capture.fromPhoto;
    case 'manual':
      return t.capture.fromMap;
    default:
      return loc.accuracy ? `GPS (±${Math.round(loc.accuracy)} m)` : 'GPS';
  }
}

export default function ReviewScreen() {
  const theme = useTheme();
  const t = useT();
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
    else setError(t.common.locationUnavailable);
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
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        <PawPattern inScroll />
        <Image
          source={{ uri: draft.photo.uri }}
          style={[styles.photo, { aspectRatio: draft.photo.width / draft.photo.height || 1 }]}
          contentFit="cover"
          accessibilityLabel={t.capture.photoAlt}
        />

        <View style={styles.section}>
          <ThemedText type="smallBold">{t.capture.location}</ThemedText>
          <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
            {loc ? (
              <>
                <ThemedText>📍 {describe(loc, t)}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {loc.lat.toFixed(5)}, {loc.lng.toFixed(5)}
                </ThemedText>
              </>
            ) : (
              <ThemedText themeColor="textSecondary">{t.capture.noLocation}</ThemedText>
            )}
            <View style={styles.row}>
              <Button
                title={t.common.myLocation}
                variant="secondary"
                style={[styles.cardButton, { backgroundColor: theme.background }]}
                onPress={pickCurrentLocation}
                loading={locating}
              />
              <Button
                title={t.capture.pickOnMap}
                variant="secondary"
                style={[styles.cardButton, { backgroundColor: theme.background }]}
                onPress={() => router.push('/capture/pick-location')}
              />
            </View>
          </View>
          <TextField
            label={t.capture.place}
            placeholder={t.capture.placeExample}
            value={label}
            onChangeText={setLabel}
            maxLength={200}
          />
        </View>

        <View style={styles.section} accessibilityRole="radiogroup">
          <ThemedText type="smallBold">{t.capture.saveTo}</ThemedText>
          <CatOption kind="new" selected={chosen === 'new'} onPress={() => setTarget('new')} />
          {loc && nearby.isPending ? <ActivityIndicator style={styles.spinner} /> : null}
          {suggestions.length > 0 ? (
            <ThemedText type="small" themeColor="textSecondary">
              {t.capture.nearby}
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
              label={t.capture.name}
              placeholder="Oyen"
              value={name}
              onChangeText={setName}
              maxLength={60}
            />
          ) : null}
        </View>

        <FormError message={error} />
        <Button title={t.common.save} onPress={save} loading={saving} />
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
  // The card shares the secondary button colour, so these sit on the page background instead.
  cardButton: { flex: 1 },
  spinner: { paddingVertical: Spacing.two },
});
