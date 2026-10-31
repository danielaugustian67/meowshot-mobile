import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { ApiError } from '@/lib/api/client';
import { authApi } from '@/lib/api/endpoints';
import { googleIdToken } from '@/lib/auth/google';
import { useSession } from '@/lib/auth/session';
import { useT } from '@/lib/i18n';

type Props = {
  /** Sent along so a new Google account can sign up when the server requires an invite. */
  inviteCode?: string;
  onStart: () => void;
  onError: (e: unknown) => void;
};

/** "or" divider plus the Google button; signs in with the session on success. */
export function GoogleSignInButton({ inviteCode, onStart, onError }: Props) {
  const { signIn } = useSession();
  const t = useT();
  const theme = useTheme();
  const [busy, setBusy] = useState(false);

  async function press() {
    onStart();
    setBusy(true);
    try {
      const idToken = await googleIdToken();
      if (!idToken) {
        setBusy(false);
        return;
      }
      await signIn(await authApi.google({ id_token: idToken, invite_code: inviteCode || undefined }));
    } catch (e) {
      // The generic unauthorized text talks about passwords; here it means the server rejected the Google token.
      const rejected = e instanceof ApiError && e.code === 'unauthorized';
      onError(rejected ? new ApiError(e.status, 'google_rejected', e.message) : e);
      setBusy(false);
    }
  }

  return (
    <>
      <View style={styles.divider}>
        <View style={[styles.line, { backgroundColor: theme.backgroundSelected }]} />
        <ThemedText type="small" themeColor="textSecondary">
          {t.auth.or}
        </ThemedText>
        <View style={[styles.line, { backgroundColor: theme.backgroundSelected }]} />
      </View>
      <Button title={t.auth.google} variant="secondary" onPress={press} loading={busy} />
    </>
  );
}

const styles = StyleSheet.create({
  divider: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three },
  line: { flex: 1, height: StyleSheet.hairlineWidth },
});
