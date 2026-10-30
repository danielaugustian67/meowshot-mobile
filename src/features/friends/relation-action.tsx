import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { friendsApi } from '@/lib/api/endpoints';
import type { UserWithRelation } from '@/lib/api/types';
import { useT } from '@/lib/i18n';

import type { useFriendAction } from './queries';

type ActionProps = ReturnType<typeof useFriendAction>;

/** What you can do with someone, depending on where the two of you stand. */
export function RelationAction({ user, busy, run }: { user: UserWithRelation } & ActionProps) {
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
