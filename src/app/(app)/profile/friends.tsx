import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { PawPattern } from '@/components/paw-pattern';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { ListCard, ListSection } from '@/components/ui/list';
import { Spacing } from '@/constants/theme';
import { useFriendAction, useFriendRequests, useFriends } from '@/features/friends/queries';
import { UserRow } from '@/features/friends/user-row';
import { useTheme } from '@/hooks/use-theme';
import { friendsApi, usersApi } from '@/lib/api/endpoints';
import type { UserWithRelation } from '@/lib/api/types';
import { useT } from '@/lib/i18n';
import { queryKeys } from '@/lib/query';

const SEARCH_DELAY_MS = 300;

export default function FriendsScreen() {
  const theme = useTheme();
  const t = useT();
  const [text, setText] = useState('');
  const term = useDebounced(text.trim().replace(/^@/, '').toLowerCase(), SEARCH_DELAY_MS);
  const { busy, run } = useFriendAction();

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}>
      <PawPattern inScroll />
      <View style={[styles.search, { backgroundColor: theme.backgroundElement, borderColor: theme.border }]}>
        <SymbolView
          name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
          size={18}
          tintColor={theme.textSecondary}
        />
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={t.friends.search}
          placeholderTextColor={theme.textSecondary}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
          style={[styles.searchInput, { color: theme.text }]}
        />
      </View>
      {term ? <SearchResults term={term} busy={busy} run={run} /> : <FriendsOverview busy={busy} run={run} />}
    </ScrollView>
  );
}

type ActionProps = ReturnType<typeof useFriendAction>;

function SearchResults({ term, busy, run }: { term: string } & ActionProps) {
  const t = useT();
  const { data, isPending } = useQuery({
    queryKey: queryKeys.userSearch(term),
    queryFn: () => usersApi.search(term),
    // Keep the last results on screen while the next keystroke's search runs.
    placeholderData: keepPreviousData,
  });

  if (isPending) return <ActivityIndicator style={styles.spinner} />;
  return (
    <ListSection title={t.friends.results}>
      {data?.items.length ? (
        <ListCard>
          {data.items.map((user) => (
            <UserRow key={user.id} user={user}>
              <RelationAction user={user} busy={busy} run={run} />
            </UserRow>
          ))}
        </ListCard>
      ) : (
        <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
          {t.friends.noResults}
        </ThemedText>
      )}
    </ListSection>
  );
}

/** What you can do with someone from search, depending on where the two of you stand. */
function RelationAction({ user, busy, run }: { user: UserWithRelation } & ActionProps) {
  const t = useT();
  const { status, request_id: requestId } = user.relationship;
  const key = `user-${user.id}`;
  switch (status) {
    case 'none':
      return (
        <Button
          size="small"
          title={t.friends.add}
          loading={busy === key}
          onPress={() => run(key, () => friendsApi.send(user.username))}
        />
      );
    case 'request_received':
      return requestId ? (
        <Button
          size="small"
          title={t.friends.accept}
          loading={busy === key}
          onPress={() => run(key, () => friendsApi.accept(requestId))}
        />
      ) : null;
    case 'request_sent':
      return requestId ? (
        <Button
          size="small"
          variant="secondary"
          title={t.friends.cancel}
          loading={busy === key}
          onPress={() => run(key, () => friendsApi.decline(requestId))}
        />
      ) : null;
    case 'friends':
      return <StatusLabel label={t.friends.isFriend} />;
    case 'self':
      return <StatusLabel label={t.friends.you} />;
  }
}

function StatusLabel({ label }: { label: string }) {
  return (
    <ThemedText type="small" themeColor="textSecondary">
      {label}
    </ThemedText>
  );
}

function FriendsOverview({ busy, run }: ActionProps) {
  const theme = useTheme();
  const t = useT();
  const incoming = useFriendRequests('incoming');
  const outgoing = useFriendRequests('outgoing');
  const friends = useFriends();

  if (incoming.isPending || outgoing.isPending || friends.isPending) {
    return <ActivityIndicator style={styles.spinner} />;
  }

  const friendList = friends.data?.items ?? [];

  function confirmRemove(userId: number, username: string) {
    Alert.alert(t.friends.removeConfirm(username), undefined, [
      { text: t.common.cancel, style: 'cancel' },
      { text: t.friends.remove, style: 'destructive', onPress: () => run(`friend-${userId}`, () => friendsApi.remove(userId)) },
    ]);
  }

  return (
    <>
      {incoming.data?.items.length ? (
        <ListSection title={t.friends.incoming}>
          <ListCard>
            {incoming.data.items.map((r) => (
              <UserRow key={r.id} user={r.user}>
                <Button
                  size="small"
                  variant="secondary"
                  title={t.friends.decline}
                  disabled={busy === `request-${r.id}`}
                  onPress={() => run(`request-${r.id}`, () => friendsApi.decline(r.id))}
                />
                <Button
                  size="small"
                  title={t.friends.accept}
                  loading={busy === `request-${r.id}`}
                  onPress={() => run(`request-${r.id}`, () => friendsApi.accept(r.id))}
                />
              </UserRow>
            ))}
          </ListCard>
        </ListSection>
      ) : null}

      {outgoing.data?.items.length ? (
        <ListSection title={t.friends.outgoing}>
          <ListCard>
            {outgoing.data.items.map((r) => (
              <UserRow key={r.id} user={r.user}>
                <Button
                  size="small"
                  variant="secondary"
                  title={t.friends.cancel}
                  loading={busy === `request-${r.id}`}
                  onPress={() => run(`request-${r.id}`, () => friendsApi.decline(r.id))}
                />
              </UserRow>
            ))}
          </ListCard>
        </ListSection>
      ) : null}

      <ListSection title={t.friends.list(friendList.length)}>
        {friendList.length ? (
          <ListCard>
            {friendList.map((f) => (
              <UserRow key={f.id} user={f}>
                {busy === `friend-${f.id}` ? (
                  <ActivityIndicator />
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={t.friends.options(f.username)}
                    hitSlop={10}
                    onPress={() => confirmRemove(f.id, f.username)}>
                    <SymbolView
                      name={{ ios: 'ellipsis', android: 'more_horiz', web: 'more_horiz' }}
                      size={20}
                      tintColor={theme.textSecondary}
                    />
                  </Pressable>
                )}
              </UserRow>
            ))}
          </ListCard>
        ) : (
          <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
            {t.friends.empty}
          </ThemedText>
        )}
      </ListSection>
    </>
  );
}

/** `value`, but only once it has stopped changing for `ms`. */
function useDebounced<T>(value: T, ms: number): T {
  const [settled, setSettled] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return settled;
}

const styles = StyleSheet.create({
  content: { padding: Spacing.four, gap: Spacing.four },
  search: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: Spacing.three,
  },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: Spacing.two },
  spinner: { paddingVertical: Spacing.four },
  note: { paddingHorizontal: Spacing.three },
});
