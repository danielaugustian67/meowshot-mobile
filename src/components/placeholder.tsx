import type { SymbolViewProps } from 'expo-symbols';
import { StyleSheet } from 'react-native';

import { HeroIcon } from '@/components/hero-icon';
import { PawPattern } from '@/components/paw-pattern';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';

/** Temporary body for screens that are routed but not built yet. */
export function Placeholder({ icon, title, body }: { icon: SymbolViewProps['name']; title: string; body: string }) {
  return (
    <ThemedView style={styles.container}>
      <PawPattern />
      <HeroIcon name={icon} />
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
  center: { textAlign: 'center' },
});
