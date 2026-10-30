import { SymbolView } from 'expo-symbols';
import type { PropsWithChildren } from 'react';
import { Children, Fragment } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** A titled group of settings, like an iOS grouped table section. */
export function ListSection({ title, children }: PropsWithChildren<{ title?: string }>) {
  return (
    <View style={styles.section}>
      {title ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.title}>
          {title}
        </ThemedText>
      ) : null}
      {children}
    </View>
  );
}

/** Rows on one rounded card, separated by hairlines. */
export function ListCard({ children }: PropsWithChildren) {
  const theme = useTheme();
  const rows = Children.toArray(children).filter(Boolean);
  return (
    <View style={[styles.card, { backgroundColor: theme.backgroundElement }]}>
      {rows.map((row, i) => (
        <Fragment key={i}>
          {i > 0 && <View style={[styles.separator, { backgroundColor: theme.border }]} />}
          {row}
        </Fragment>
      ))}
    </View>
  );
}

export function ListRow({
  label,
  onPress,
  destructive,
  chevron = true,
  detail,
  badge,
}: {
  label: string;
  onPress: () => void;
  destructive?: boolean;
  chevron?: boolean;
  /** Secondary text before the chevron, such as a count. */
  detail?: string;
  /** Something waiting for the user, such as unanswered requests; hidden at 0. */
  badge?: number;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { backgroundColor: theme.backgroundSelected }]}>
      <ThemedText style={[styles.label, destructive && { color: theme.danger }]}>{label}</ThemedText>
      {badge ? (
        <View style={[styles.badge, { backgroundColor: theme.tint }]}>
          <ThemedText type="smallBold" style={{ color: theme.onTint }}>
            {badge}
          </ThemedText>
        </View>
      ) : null}
      {detail ? <ThemedText themeColor="textSecondary">{detail}</ThemedText> : null}
      {chevron ? (
        <SymbolView
          name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
          size={14}
          weight="semibold"
          tintColor={theme.textSecondary}
        />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  section: { gap: Spacing.two },
  title: { paddingHorizontal: Spacing.three, textTransform: 'uppercase', fontSize: 12, letterSpacing: 0.4 },
  card: { borderRadius: 14, overflow: 'hidden' },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: Spacing.three },
  row: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  label: { flex: 1 },
  badge: { minWidth: 22, height: 22, borderRadius: 11, paddingHorizontal: 6, alignItems: 'center', justifyContent: 'center' },
});
