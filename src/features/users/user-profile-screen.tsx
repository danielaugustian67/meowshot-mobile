import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { FormError } from '@/components/form-screen';
import { PawPattern } from '@/components/paw-pattern';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { Spacing } from '@/constants/theme';
import { PostList } from '@/features/feed/post-list';
import { useFriendAction } from '@/features/friends/queries';
import { RelationAction } from '@/features/friends/relation-action';
import { usersApi } from '@/lib/api/endpoints';
import { errorMessage } from '@/lib/api/errors';
import type { Profile } from '@/lib/api/types';
import { useT } from '@/lib/i18n';
import { queryKeys } from '@/lib/query';

/** Someone's profile and the posts of theirs you may see: public ones, plus friends-only once you are friends. */
export default function UserProfileScreen() {
  const t = useT();
  const { username } = useLocalSearchParams<{ username: string }>();
  const profile = useQuery({
    queryKey: queryKeys.userProfile(username),
    queryFn: () => usersApi.profile(username),
  });

  return (
    <>
      <Stack.Screen options={{ title: `@${username}` }} />
      {profile.data ? (
        <PostList source={{ username }} header={<ProfileHeader profile={profile.data} />} />
      ) : (
        <ThemedView style={styles.center}>
          <PawPattern />
          {profile.isPending ? (
            <ActivityIndicator />
          ) : (
            <>
              {/* Blocked and suspended users answer 404, so this also covers them. */}
              <FormError message={errorMessage(profile.error)} />
              <Button
                title={t.common.retry}
                variant="secondary"
                onPress={() => profile.refetch()}
                loading={profile.isRefetching}
              />
            </>
          )}
        </ThemedView>
      )}
    </>
  );
}

function ProfileHeader({ profile }: { profile: Profile }) {
  const t = useT();
  const { busy, run } = useFriendAction();
  const { status } = profile.relationship;
  const stats = [
    t.profile.catCount(profile.cat_count),
    t.profile.postCount(profile.post_count),
    t.profile.friendCount(profile.friend_count),
  ];

  return (
    <View style={styles.header}>
      <Avatar user={profile} size={96} />
      <ThemedText type="subtitle">@{profile.username}</ThemedText>
      {profile.bio ? <ThemedText style={styles.centerText}>{profile.bio}</ThemedText> : null}
      <ThemedText type="small" themeColor="textSecondary">
        {stats.join(' · ')}
      </ThemedText>
      <View style={styles.action}>
        <RelationAction user={profile} busy={busy} run={run} />
      </View>
      {status !== 'friends' && status !== 'self' ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
          {t.user.friendsOnly}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing.three, padding: Spacing.four },
  header: { alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.four, paddingBottom: Spacing.four },
  centerText: { textAlign: 'center' },
  action: { marginTop: Spacing.one },
});
