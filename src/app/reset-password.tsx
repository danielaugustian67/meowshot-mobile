import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { FormError, FormScreen } from '@/components/form-screen';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { authApi } from '@/lib/api/endpoints';
import { errorMessage } from '@/lib/api/errors';
import { useT } from '@/lib/i18n';

export default function ResetPasswordScreen() {
  const { email = '' } = useLocalSearchParams<{ email?: string }>();
  const t = useT();
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (password.length < 8) {
      setError(t.common.passwordTooShort);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await authApi.resetPassword({ email, code: code.trim(), new_password: password });
      Alert.alert(t.auth.passwordChanged);
      router.dismissTo('/sign-in');
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <FormScreen>
      <ThemedText themeColor="textSecondary">{t.auth.codeSentTo(email)}</ThemedText>
      <TextField
        label={t.auth.code}
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        maxLength={6}
      />
      <TextField
        label={t.auth.newPassword}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        hint={t.common.passwordHint}
      />
      <FormError message={error} />
      <Button title={t.auth.savePassword} onPress={submit} loading={busy} disabled={code.trim().length !== 6 || !password} />
    </FormScreen>
  );
}
