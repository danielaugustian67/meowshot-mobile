import { router } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { FormError, FormScreen } from '@/components/form-screen';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { meApi } from '@/lib/api/endpoints';
import { errorMessage } from '@/lib/api/errors';
import { useMe } from '@/lib/auth/session';
import { useT } from '@/lib/i18n';
import { queryClient, queryKeys } from '@/lib/query';

export default function ChangePasswordScreen() {
  const t = useT();
  const { data: me } = useMe();
  // Google-only accounts have no password yet and may set one without the current one.
  const hasPassword = me?.has_password ?? true;
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (next.length < 8) {
      setError(t.common.passwordTooShort);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await meApi.changePassword({ current_password: current, new_password: next });
      queryClient.invalidateQueries({ queryKey: queryKeys.me });
      Alert.alert(t.auth.passwordChanged);
      router.back();
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <FormScreen>
      {hasPassword ? (
        <TextField
          label={t.settings.currentPassword}
          value={current}
          onChangeText={setCurrent}
          secureTextEntry
          autoComplete="current-password"
          textContentType="password"
        />
      ) : (
        <ThemedText themeColor="textSecondary">{t.settings.setPasswordBody}</ThemedText>
      )}
      <TextField
        label={t.auth.newPassword}
        value={next}
        onChangeText={setNext}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        hint={t.common.passwordHint}
      />
      <FormError message={error} />
      <Button
        title={t.auth.savePassword}
        onPress={submit}
        loading={busy}
        disabled={(hasPassword && !current) || !next}
      />
    </FormScreen>
  );
}
