import { router } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { PawPattern } from '@/components/paw-pattern';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { ListCard, ListRow } from '@/components/ui/list';
import { FormError } from '@/components/form-screen';
import { Spacing } from '@/constants/theme';
import { useFriendRequests, useFriends } from '@/features/friends/queries';
import { useTheme } from '@/hooks/use-theme';
import { errorMessage } from '@/lib/api/errors';
import { useMe } from '@/lib/auth/session';
import { useT } from '@/lib/i18n';

export default function ProfileScreen() {
  const theme = useTheme();
  const t = useT();
  const { data: me, error, isPending, refetch, isRefetching } = useMe();
  const friends = useFriends();
  const incoming = useFriendRequests('incoming');

  if (isPending) {
    return (
      <ThemedView style={styles.center}>
        <PawPattern />
        <ActivityIndicator />
      </ThemedView>
    );
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}>
      <PawPattern inScroll />
      {me ? (
        <View style={styles.header}>
          <Avatar user={me} size={96} />
          <ThemedText type="subtitle">@{me.username}</ThemedText>
          {me.bio ? <ThemedText style={styles.centerText}>{me.bio}</ThemedText> : null}
          <ThemedText type="small" themeColor="textSecondary">
            {me.email} · {t.profile.catCount(me.cat_count)}
          </ThemedText>
          <Button
            size="small"
            variant="secondary"
            title={t.settings.editProfile}
            onPress={() => router.push('/profile/edit')}
            style={styles.editButton}
          />
        </View>
      ) : (
        <View style={styles.header}>
          <FormError message={errorMessage(error)} />
          <Button title={t.common.retry} variant="secondary" onPress={() => refetch()} loading={isRefetching} />
        </View>
      )}
      {me ? (
        <ListCard>
          <ListRow
            label={t.friends.title}
            detail={friends.data ? String(friends.data.items.length) : undefined}
            badge={incoming.data?.items.length}
            onPress={() => router.push('/profile/friends')}
          />
        </ListCard>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.four, gap: Spacing.four },
  header: { alignItems: 'center', gap: Spacing.two },
  editButton: { marginTop: Spacing.one },
  centerText: { textAlign: 'center' },
});
