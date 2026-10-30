import type { PropsWithChildren } from 'react';
import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import type { User } from '@/lib/api/types';

/** A person in a list card: avatar, @username, bio, and actions on the right (the children). */
export function UserRow({ user, children }: PropsWithChildren<{ user: User }>) {
  return (
    <View style={styles.row}>
      <Avatar user={user} size={44} />
      <View style={styles.text}>
        <ThemedText type="smallBold" numberOfLines={1}>
          @{user.username}
        </ThemedText>
        {user.bio ? (
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {user.bio}
          </ThemedText>
        ) : null}
      </View>
      {children ? <View style={styles.actions}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  text: { flex: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
});
