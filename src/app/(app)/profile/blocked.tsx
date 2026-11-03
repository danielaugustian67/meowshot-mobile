import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { FormError } from '@/components/form-screen';
import { PawPattern } from '@/components/paw-pattern';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { LeanList } from '@/constants/list';
import { Spacing } from '@/constants/theme';
import { useModeration } from '@/features/moderation/actions';
import { useTheme } from '@/hooks/use-theme';
import { Alert } from '@/lib/alert';
import { blocksApi } from '@/lib/api/endpoints';
import { errorMessage } from '@/lib/api/errors';
import type { User } from '@/lib/api/types';
import { useT } from '@/lib/i18n';
import { queryKeys } from '@/lib/query';

const AVATAR = 40;

/** The accounts you blocked, newest first, each with a way to unblock. */
export default function BlockedScreen() {
  const theme = useTheme();
  const t = useT();
  const blocks = useQuery({ queryKey: queryKeys.blocks, queryFn: blocksApi.list });
  const { unblock } = useModeration();
  const [busy, setBusy] = useState<number | null>(null);

  function confirmUnblock(user: User) {
    Alert.alert(t.moderation.unblockConfirm(user.username), t.moderation.unblockBody, [
      { text: t.common.cancel, style: 'cancel' },
      {
        text: t.moderation.unblock,
        onPress: async () => {
          setBusy(user.id);
          try {
            await unblock(user);
          } catch (e) {
            Alert.alert(errorMessage(e));
          } finally {
            setBusy(null);
          }
        },
      },
    ]);
  }

  return (
    <FlatList
      {...LeanList}
      data={blocks.data?.items ?? []}
      keyExtractor={(u) => String(u.id)}
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}
      ListHeaderComponent={<PawPattern inScroll />}
      renderItem={({ item }) => (
        <View style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
          <Avatar user={item} size={AVATAR} />
          <ThemedText type="smallBold" numberOfLines={1} style={styles.name}>
            @{item.username}
          </ThemedText>
          <Button
            title={t.moderation.unblock}
            variant="secondary"
            size="small"
            loading={busy === item.id}
            disabled={busy !== null}
            onPress={() => confirmUnblock(item)}
          />
        </View>
      )}
      ListEmptyComponent={
        blocks.isPending ? (
          <ActivityIndicator style={styles.spinner} />
        ) : blocks.isError ? (
          <View style={styles.error}>
            <FormError message={errorMessage(blocks.error)} />
            <Button title={t.common.retry} variant="secondary" onPress={() => blocks.refetch()} />
          </View>
        ) : (
          <ThemedText type="small" themeColor="textSecondary" style={styles.empty}>
            {t.moderation.blockedEmpty}
          </ThemedText>
        )
      }
    />
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.four, gap: Spacing.two },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: 14,
  },
  name: { flex: 1 },
  spinner: { paddingVertical: Spacing.four },
  error: { gap: Spacing.three },
  empty: { textAlign: 'center', paddingVertical: Spacing.four },
});
