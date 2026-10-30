import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';

import { FormError, FormScreen } from '@/components/form-screen';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { authApi } from '@/lib/api/endpoints';
import { errorMessage } from '@/lib/api/errors';

export default function ResetPasswordScreen() {
  const { email = '' } = useLocalSearchParams<{ email?: string }>();
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (password.length < 8) {
      setError('Password minimal 8 karakter.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await authApi.resetPassword({ email, code: code.trim(), new_password: password });
      Alert.alert('Password diganti', 'Silakan masuk dengan password barumu.');
      router.dismissTo('/sign-in');
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <FormScreen>
      <ThemedText themeColor="textSecondary">Kode dikirim ke {email}.</ThemedText>
      <TextField
        label="Kode 6 digit"
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        autoComplete="one-time-code"
        textContentType="oneTimeCode"
        maxLength={6}
      />
      <TextField
        label="Password baru"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        hint="Minimal 8 karakter. Semua sesi lain akan keluar."
      />
      <FormError message={error} />
      <Button title="Simpan password" onPress={submit} loading={busy} disabled={code.trim().length !== 6 || !password} />
    </FormScreen>
  );
}
