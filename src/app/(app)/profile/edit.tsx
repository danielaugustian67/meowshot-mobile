import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { FormError, FormScreen } from '@/components/form-screen';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { compressPhoto } from '@/features/capture/media';
import { meApi } from '@/lib/api/endpoints';
import { errorMessage } from '@/lib/api/errors';
import type { Me } from '@/lib/api/types';
import { useMe } from '@/lib/auth/session';
import { useT } from '@/lib/i18n';
import { queryClient, queryKeys } from '@/lib/query';

// Same rule as the server (mewshot-be auth_handlers.go usernameRe).
const USERNAME_RE = /^[a-z0-9_.]{3,30}$/;
const BIO_MAX = 300;
const AVATAR_SIZE = 96;

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
      <AvatarPicker me={me} />
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

/** The profile photo with change and remove actions. Each one is saved right away, apart from the form. */
function AvatarPicker({ me }: { me: Me }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save(action: () => Promise<Me | void>) {
    setError(null);
    setBusy(true);
    try {
      const updated = await action();
      queryClient.setQueryData(queryKeys.me, updated ?? { ...me, avatar_url: null });
      // Posts and friend lists embed the avatar too.
      queryClient.invalidateQueries({ queryKey: queryKeys.postsAll });
      queryClient.invalidateQueries({ queryKey: queryKeys.friends });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function pick() {
    // The system picker needs no library permission; `aspect` makes Android's crop square like iOS's.
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', allowsEditing: true, aspect: [1, 1] });
    const asset = res.canceled ? null : res.assets?.[0];
    if (!asset) return;
    // The server center-crops to a square anyway; this only keeps the upload small.
    await save(async () => meApi.putAvatar(await compressPhoto(asset.uri, asset.width, asset.height)));
  }

  function confirmRemove() {
    if (Platform.OS === 'web') {
      save(() => meApi.deleteAvatar());
      return;
    }
    Alert.alert(t.settings.removePhotoConfirm, undefined, [
      { text: t.common.cancel, style: 'cancel' },
      { text: t.settings.removePhoto, style: 'destructive', onPress: () => save(() => meApi.deleteAvatar()) },
    ]);
  }

  return (
    <View style={styles.avatarBlock}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t.settings.changePhoto}
        disabled={busy}
        onPress={pick}>
        <Avatar user={me} size={AVATAR_SIZE} />
        {busy ? <ActivityIndicator color="#fff" style={styles.avatarBusy} /> : null}
      </Pressable>
      <View style={styles.avatarActions}>
        <Button size="small" variant="ghost" title={t.settings.changePhoto} disabled={busy} onPress={pick} />
        {me.avatar_url ? (
          <Button size="small" variant="ghost" title={t.settings.removePhoto} disabled={busy} onPress={confirmRemove} />
        ) : null}
      </View>
      <FormError message={error} />
    </View>
  );
}

const styles = StyleSheet.create({
  avatarBlock: { alignItems: 'center', gap: Spacing.one, paddingBottom: Spacing.two },
  avatarBusy: {
    ...StyleSheet.absoluteFill,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  avatarActions: { flexDirection: 'row', gap: Spacing.one },
});
