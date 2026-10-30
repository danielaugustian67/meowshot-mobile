import { Link } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FormError, FormScreen } from '@/components/form-screen';
import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/button';
import { TextField } from '@/components/ui/text-field';
import { Spacing } from '@/constants/theme';
import { authApi } from '@/lib/api/endpoints';
import { errorMessage } from '@/lib/api/errors';
import { useSession } from '@/lib/auth/session';
import { useT } from '@/lib/i18n';

export default function SignInScreen() {
  const { signIn } = useSession();
  const t = useT();
  const [ident, setIdent] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    setBusy(true);
    try {
      await signIn(await authApi.login({ email: ident.trim(), password }));
    } catch (e) {
      setError(errorMessage(e));
      setBusy(false);
    }
  }

  return (
    <FormScreen>
      <SafeAreaView edges={['top']} />
      <View style={styles.hero}>
        <ThemedText style={styles.logo}>🐾</ThemedText>
        <ThemedText type="subtitle">Meowshot</ThemedText>
        <ThemedText themeColor="textSecondary">{t.auth.tagline}</ThemedText>
      </View>

      <TextField
        label={t.auth.ident}
        value={ident}
        onChangeText={setIdent}
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="username"
        textContentType="username"
        keyboardType="email-address"
        returnKeyType="next"
      />
      <TextField
        label={t.common.password}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoComplete="current-password"
        textContentType="password"
        returnKeyType="go"
        onSubmitEditing={submit}
      />
      <FormError message={error} />
      <Button title={t.auth.signIn} onPress={submit} loading={busy} disabled={!ident.trim() || !password} />

      <Link href="/forgot-password" asChild>
        <Button title={t.auth.forgot} variant="ghost" />
      </Link>

      <View style={styles.footer}>
        <ThemedText themeColor="textSecondary">{t.auth.noAccount}</ThemedText>
        <Link href="/sign-up" asChild>
          <Button title={t.auth.signUpNow} variant="secondary" />
        </Link>
      </View>
    </FormScreen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: Spacing.two, paddingVertical: Spacing.five },
  logo: { fontSize: 56, lineHeight: 68 },
  footer: { marginTop: 'auto', gap: Spacing.two, alignItems: 'stretch', paddingTop: Spacing.four },
});
