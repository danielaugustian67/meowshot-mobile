import { useState } from 'react';

import { FormError, FormScreen } from '@/components/form-screen';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { ApiError } from '@/lib/api/client';
import { authApi } from '@/lib/api/endpoints';
import { errorMessage } from '@/lib/api/errors';
import { useSession } from '@/lib/auth/session';

// Same rule as the server (mewshot-be auth_handlers.go usernameRe).
const USERNAME_RE = /^[a-z0-9_.]{3,30}$/;

export default function SignUpScreen() {
  const { signIn } = useSession();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [invite, setInvite] = useState('');
  // The invite field only appears once the server says one is required (INVITE_CODE set).
  const [needsInvite, setNeedsInvite] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const name = username.trim().toLowerCase();
    if (!USERNAME_RE.test(name)) {
      setError('Username 3–30 karakter.');
      return;
    }
    if (password.length < 8) {
      setError('Password minimal 8 karakter.');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const res = await authApi.register({
        email: email.trim(),
        username: name,
        password,
        invite_code: invite.trim() || undefined,
      });
      await signIn(res);
    } catch (e) {
      if (e instanceof ApiError && e.code === 'invite_required') setNeedsInvite(true);
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <FormScreen>
      <TextField
        label="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
        textContentType="emailAddress"
        keyboardType="email-address"
      />
      <TextField
        label="Username"
        value={username}
        onChangeText={(v) => setUsername(v.toLowerCase())}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="username-new"
        textContentType="username"
        hint="Huruf kecil, angka, titik, _"
      />
      <TextField
        label="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        hint="Minimal 8 karakter."
      />
      {needsInvite ? (
        <TextField label="Kode undangan" value={invite} onChangeText={setInvite} autoCapitalize="none" />
      ) : null}
      <FormError message={error} />
      <Button
        title="Buat akun"
        onPress={submit}
        loading={busy}
        disabled={!email.trim() || !username.trim() || !password}
      />
    </FormScreen>
  );
}
