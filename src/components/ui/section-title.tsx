import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Fonts, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** A small heading above a section: a paw, the title, an optional count and an optional link on the right. */
export function SectionTitle({
  title,
  count,
  action,
}: {
  title: string;
  count?: number;
  action?: { label: string; onPress: () => void };
}) {
  const theme = useTheme();
  return (
    <View style={styles.row}>
      <SymbolView name={{ ios: 'pawprint.fill', android: 'pets', web: 'pets' }} size={14} tintColor={theme.tint} />
      <ThemedText type="smallBold" style={styles.title}>
        {title}
      </ThemedText>
      {count !== undefined ? (
        <ThemedText type="small" themeColor="textSecondary">
          {count}
        </ThemedText>
      ) : null}
      {action ? (
        <Pressable accessibilityRole="link" onPress={action.onPress} hitSlop={8} style={styles.action}>
          <ThemedText type="small" style={{ color: theme.tint }}>
            {action.label}
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.one },
  title: { fontFamily: Fonts.rounded },
  action: { marginLeft: 'auto' },
});
