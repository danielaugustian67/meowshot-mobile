import { router } from 'expo-router';
import { useState } from 'react';

import { FormError, FormScreen } from '@/components/form-screen';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { meApi } from '@/lib/api/endpoints';
import { errorMessage } from '@/lib/api/errors';
import type { Me } from '@/lib/api/types';
import { useMe } from '@/lib/auth/session';
import { useT } from '@/lib/i18n';
import { queryClient, queryKeys } from '@/lib/query';

// Same rule as the server (mewshot-be auth_handlers.go usernameRe).
const USERNAME_RE = /^[a-z0-9_.]{3,30}$/;
const BIO_MAX = 300;

export default function EditProfileScreen() {
  const { data: me } = useMe();
  // The settings screen is only reachable with the profile loaded; render nothing for the brief refetch case.
  return me ? <EditProfileForm me={me} /> : null;
}

function EditProfileForm({ me }: { me: Me }) {
  const t = useT();
  const [username, setUsername] = useState(me.username);
  const [bio, setBio] = useState(me.bio ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    const name = username.trim().toLowerCase();
    if (!USERNAME_RE.test(name)) {
      setError(t.auth.usernameInvalid);
      return;
    }
    setError(null);
    setBusy(true);
    try {
      // Only send what changed, so an unchanged username is never re-checked for uniqueness.
      const updated = await meApi.update({
        username: name !== me.username ? name : undefined,
        bio: bio.trim() !== (me.bio ?? '') ? bio.trim() : undefined,
      });
      queryClient.setQueryData(queryKeys.me, updated);
      router.back();
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <FormScreen>
      <TextField
        label={t.common.username}
        value={username}
        onChangeText={(v) => setUsername(v.toLowerCase())}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="username-new"
        textContentType="username"
        hint={t.auth.usernameHint}
      />
      <TextField
        label={t.settings.bio}
        value={bio}
        onChangeText={setBio}
        multiline
        maxLength={BIO_MAX}
        hint={t.settings.bioHint}
        style={{ minHeight: 100, paddingTop: 14, textAlignVertical: 'top' }}
      />
      <FormError message={error} />
      <Button title={t.common.save} onPress={submit} loading={busy} disabled={!username.trim()} />
    </FormScreen>
  );
}
