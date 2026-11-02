import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';

import { FormError, FormScreen } from '@/components/form-screen';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { authApi } from '@/lib/api/endpoints';
import { errorMessage } from '@/lib/api/errors';
import { useSession } from '@/lib/auth/session';
import { useT } from '@/lib/i18n';

// The server allows one resend a minute.
const RESEND_WAIT = 60;

/** Last step of signing up with a password: the account is created once the emailed code is right. */
export default function VerifyEmailScreen() {
  const { id = '', email = '' } = useLocalSearchParams<{ id?: string; email?: string }>();
  const { signIn } = useSession();
  const t = useT();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [wait, setWait] = useState(RESEND_WAIT);
  const counting = wait > 0;

  useEffect(() => {
    if (!counting) return;
    const timer = setInterval(() => setWait((s) => s - 1), 1000);
    return () => clearInterval(timer);
  }, [counting]);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      await signIn(await authApi.verifyRegistration({ verification_id: id, code: code.trim() }));
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  async function resend() {
    setError(null);
    setResending(true);
    try {
      await authApi.resendRegistrationCode(id);
      setCode('');
      setWait(RESEND_WAIT);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setResending(false);
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
        hint={t.auth.checkSpam}
      />
      <FormError message={error} />
      <Button title={t.auth.verifyEmail} onPress={submit} loading={busy} disabled={code.trim().length !== 6} />
      <Button
        title={counting ? t.auth.resendIn(wait) : t.auth.resendCode}
        variant="secondary"
        onPress={resend}
        loading={resending}
        disabled={counting}
      />
    </FormScreen>
  );
}
