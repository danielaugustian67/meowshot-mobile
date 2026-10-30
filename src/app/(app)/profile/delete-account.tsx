import { useState } from 'react';
import { Alert, Platform } from 'react-native';

import { FormError, FormScreen } from '@/components/form-screen';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { useTheme } from '@/hooks/use-theme';
import { meApi } from '@/lib/api/endpoints';
import { errorMessage } from '@/lib/api/errors';
import { useMe, useSession } from '@/lib/auth/session';
import { useT } from '@/lib/i18n';

export default function DeleteAccountScreen() {
  const t = useT();
  const theme = useTheme();
  const { signOut } = useSession();
  const { data: me } = useMe();
  const hasPassword = me?.has_password ?? true;
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function remove() {
    setError(null);
    setBusy(true);
    try {
      // Google-only accounts have no password; the server accepts an empty one for them.
      await meApi.delete(hasPassword ? password : '');
      // The tokens are already invalid; this only clears them and returns to sign-in.
      await signOut();
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  function confirm() {
    if (Platform.OS === 'web') {
      remove();
      return;
    }
    Alert.alert(t.settings.deleteConfirm, t.settings.deleteBody, [
      { text: t.common.cancel, style: 'cancel' },
      { text: t.settings.deleteForever, style: 'destructive', onPress: remove },
    ]);
  }

  return (
    <FormScreen>
      <ThemedText themeColor="textSecondary">{t.settings.deleteBody}</ThemedText>
      {hasPassword ? (
        <TextField
          label={t.common.password}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
        />
      ) : null}
      <FormError message={error} />
      <Button
        title={t.settings.deleteForever}
        onPress={confirm}
        loading={busy}
        disabled={hasPassword && !password}
        style={{ backgroundColor: theme.danger }}
      />
    </FormScreen>
  );
}
