import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';

import { HeroIcon } from '@/components/hero-icon';
import { PawPattern } from '@/components/paw-pattern';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Spacing } from '@/constants/theme';
import { setDraft } from '@/features/capture/draft';
import { catName } from '@/lib/format';
import { useT } from '@/lib/i18n';

export default function CaptureDoneScreen() {
  const { name, isNew } = useLocalSearchParams<{ catId: string; name?: string; isNew: string }>();
  const t = useT();

  // The draft is cleared here rather than in review, which would redirect while it is still on screen.
  useEffect(() => setDraft(null), []);

  return (
    <ThemedView style={styles.container}>
      <PawPattern />
      <View style={styles.hero}>
        <HeroIcon />
        <ThemedText type="smallBold" style={styles.center}>
          {isNew === '1' ? t.capture.newCatSaved : t.capture.savedTo(catName(name))}
        </ThemedText>
      </View>
      <Button title={t.capture.again} onPress={() => router.dismissTo('/capture')} />
      <Button
        title={t.capture.viewCats}
        variant="secondary"
        onPress={() => {
          router.dismissTo('/capture');
          router.navigate('/cats');
        }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: Spacing.four, gap: Spacing.three, justifyContent: 'center' },
  hero: { alignItems: 'center', gap: Spacing.three, paddingBottom: Spacing.four },
  center: { textAlign: 'center' },
});
