import type { PropsWithChildren } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useOpenProfile } from '@/features/users/open-profile';
import type { User } from '@/lib/api/types';
import { useT } from '@/lib/i18n';

/** A person in a list card: avatar, @username, bio, and actions on the right (the children). The person opens their profile. */
export function UserRow({ user, children }: PropsWithChildren<{ user: User }>) {
  const t = useT();
  const openProfile = useOpenProfile();
  return (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={t.user.open(user.username)}
        onPress={() => openProfile(user.username)}
        style={styles.person}>
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
      </Pressable>
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
  person: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  text: { flex: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
});
