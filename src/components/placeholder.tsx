import { StyleSheet } from 'react-native';

import { PawPattern } from '@/components/paw-pattern';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

/** Temporary body for screens that are routed but not built yet. */
export function Placeholder({ emoji, title, body }: { emoji: string; title: string; body: string }) {
  return (
    <ThemedView style={styles.container}>
      <PawPattern />
      <ThemedText style={styles.emoji}>{emoji}</ThemedText>
      <ThemedText type="smallBold" style={styles.center}>
        {title}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.center}>
        {body}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.two, padding: Spacing.four },
  emoji: { fontSize: 48, lineHeight: 60 },
  center: { textAlign: 'center' },
});
