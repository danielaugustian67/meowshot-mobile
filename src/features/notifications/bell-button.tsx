import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/lib/i18n';

import { badgeText, useUnreadCount } from './queries';

/** The Feed header's bell, with a count when something is unread. */
export function BellButton() {
  const theme = useTheme();
  const t = useT();
  const unread = useUnreadCount();
  const label = unread ? `${t.notifications.open}, ${t.notifications.unread(unread)}` : t.notifications.open;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => router.push('/notifications')}
      hitSlop={8}
      style={styles.button}>
      <SymbolView
        name={{ ios: unread ? 'bell.fill' : 'bell', android: 'notifications', web: 'notifications' }}
        size={22}
        tintColor={theme.text}
      />
      {unread ? (
        <View style={[styles.badge, { backgroundColor: theme.tint, borderColor: theme.background }]}>
          <Text style={[styles.count, { color: theme.onTint }]}>{badgeText(unread)}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: -4,
    right: -6,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    borderRadius: 9,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  count: { fontSize: 11, lineHeight: 13, fontWeight: 700 },
});
