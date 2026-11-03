import { ActionSheetIOS, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type MenuAction = { label: string; run: () => void; destructive?: boolean };

/** iOS has its own action sheet. Elsewhere returns false, and the caller shows `ActionMenu` instead. */
export function showNativeActionMenu(actions: MenuAction[], cancel: string) {
  if (Platform.OS !== 'ios') return false;
  const destructive = actions.flatMap((a, i) => (a.destructive ? [i] : []));
  ActionSheetIOS.showActionSheetWithOptions(
    {
      options: [...actions.map((a) => a.label), cancel],
      destructiveButtonIndex: destructive,
      cancelButtonIndex: actions.length,
    },
    (i) => actions[i]?.run(),
  );
  return true;
}

/** A list of choices sliding up from the bottom, for when an Android alert's three buttons are too few. */
export function ActionMenu({
  title,
  actions,
  cancel,
  onClose,
}: {
  title: string;
  actions: MenuAction[];
  cancel: string;
  onClose: () => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal transparent visible animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={onClose}>
      <Pressable accessibilityRole="button" accessibilityLabel={cancel} onPress={onClose} style={styles.backdrop} />
      <View
        style={[
          styles.sheet,
          { backgroundColor: theme.background, paddingBottom: insets.bottom + Spacing.two },
        ]}>
        <ThemedText type="smallBold" themeColor="textSecondary" style={styles.title}>
          {title}
        </ThemedText>
        {[...actions, { label: cancel, run: () => {}, destructive: false }].map((action) => (
          <Pressable
            key={action.label}
            accessibilityRole="button"
            onPress={() => {
              onClose();
              action.run();
            }}
            style={({ pressed }) => [styles.row, { borderColor: theme.border }, pressed && styles.pressed]}>
            <ThemedText style={action.destructive ? { color: theme.danger } : undefined}>{action.label}</ThemedText>
          </Pressable>
        ))}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingTop: Spacing.three },
  title: { paddingHorizontal: Spacing.four, paddingBottom: Spacing.two },
  row: { paddingHorizontal: Spacing.four, paddingVertical: Spacing.three, borderTopWidth: StyleSheet.hairlineWidth },
  pressed: { opacity: 0.5 },
});
