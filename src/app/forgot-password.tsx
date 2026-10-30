import { router } from 'expo-router';
import { useState } from 'react';

import { FormError, FormScreen } from '@/components/form-screen';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { authApi } from '@/lib/api/endpoints';
import { errorMessage } from '@/lib/api/errors';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      // The server answers 202 whether or not the email exists.
      await authApi.forgotPassword(email.trim());
      router.push({ pathname: '/reset-password', params: { email: email.trim() } });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <FormScreen>
      <ThemedText themeColor="textSecondary">
        Masukkan email akunmu. Kalau terdaftar, kami kirim kode 6 digit yang berlaku 15 menit.
      </ThemedText>
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        keyboardType="email-address"
        onSubmitEditing={submit}
      />
      <FormError message={error} />
      <Button title="Kirim kode" onPress={submit} loading={busy} disabled={!email.trim()} />
    </FormScreen>
  );
}
