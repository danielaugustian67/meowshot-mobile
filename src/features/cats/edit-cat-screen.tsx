import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { FormError } from '@/components/form-screen';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { catsApi } from '@/lib/api/endpoints';
import { errorMessage } from '@/lib/api/errors';
import type { Cat } from '@/lib/api/types';
import { catName } from '@/lib/format';
import { useT } from '@/lib/i18n';
import { queryClient, queryKeys } from '@/lib/query';

import { catChanged } from './queries';

// Same limits as the server (mewshot-be cats.go catInput.clean).
const NAME_MAX = 60;
const NOTES_MAX = 2000;

/** A sheet over the cat's page: rename, write notes, or delete the cat with everything it has. */
export default function EditCatScreen() {
  const id = Number(useLocalSearchParams<{ id: string }>().id);
  // Only the cat's page opens this sheet, so the cat is already cached.
  const cat = queryClient.getQueryData<Cat>(queryKeys.cat(id));
  return cat ? <EditCatForm cat={cat} /> : null;
}

function EditCatForm({ cat }: { cat: Cat }) {
  const theme = useTheme();
  const t = useT();
  const [name, setName] = useState(cat.name ?? '');
  const [notes, setNotes] = useState(cat.notes ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    // Only send what changed; an empty string clears the field on the server.
    const nextName = name.trim();
    const nextNotes = notes.trim();
    const renamed = nextName !== (cat.name ?? '');
    const body = {
      name: renamed ? nextName : undefined,
      notes: nextNotes !== (cat.notes ?? '') ? nextNotes : undefined,
    };
    if (body.name === undefined && body.notes === undefined) {
      router.back();
      return;
    }
    setError(null);
    setBusy(true);
    try {
      catChanged(await catsApi.update(cat.id, body), { renamed });
      router.back();
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  async function remove() {
    setError(null);
    setBusy(true);
    try {
      await catsApi.delete(cat.id);
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
      return;
    }
    // Close the sheet, then the cat's page underneath, which has nothing left to show. Its own queries are
    // left to expire: removing them while the page is still on screen would refetch a cat that is gone.
    router.back();
    router.back();
    // Its posts go with it, and the profile counts the cats.
    queryClient.invalidateQueries({ queryKey: queryKeys.catList });
    queryClient.invalidateQueries({ queryKey: queryKeys.postsAll });
    queryClient.invalidateQueries({ queryKey: queryKeys.users });
    queryClient.invalidateQueries({ queryKey: queryKeys.me });
  }

  function confirmRemove() {
    if (Platform.OS === 'web') {
      remove();
      return;
    }
    Alert.alert(t.cats.deleteConfirm(catName(cat.name)), t.cats.deleteBody, [
      { text: t.common.cancel, style: 'cancel' },
      { text: t.cats.deleteForever, style: 'destructive', onPress: remove },
    ]);
  }

  return (
    <ScrollView
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets>
      <ThemedText type="subtitle">{t.cats.editTitle}</ThemedText>
      <TextField
        label={t.cats.name}
        placeholder={t.cats.namePlaceholder}
        value={name}
        onChangeText={setName}
        maxLength={NAME_MAX}
        autoCapitalize="words"
      />
      <TextField
        label={t.cats.notes}
        placeholder={t.cats.notesPlaceholder}
        value={notes}
        onChangeText={setNotes}
        multiline
        maxLength={NOTES_MAX}
        style={styles.notes}
      />
      <FormError message={error} />
      <Button title={t.common.save} onPress={save} loading={busy} />
      <View style={styles.danger}>
        <Pressable
          accessibilityRole="button"
          onPress={confirmRemove}
          disabled={busy}
          hitSlop={8}
          style={({ pressed }) => ({ opacity: pressed || busy ? 0.5 : 1 })}>
          <ThemedText type="smallBold" style={{ color: theme.danger }}>
            {t.cats.delete}
          </ThemedText>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.four, gap: Spacing.three },
  notes: { minHeight: 120, paddingTop: 12, paddingBottom: 12, textAlignVertical: 'top' },
  danger: { alignItems: 'center', paddingTop: Spacing.three },
});
