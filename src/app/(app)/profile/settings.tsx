import Constants from 'expo-constants';
import { router } from 'expo-router';
import { Alert, Platform, ScrollView, StyleSheet } from 'react-native';

import { PawPattern } from '@/components/paw-pattern';
import { ThemedText } from '@/components/themed-text';
import { ListCard, ListRow, ListSection } from '@/components/ui/list';
import { Segmented } from '@/components/ui/segmented';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useMe, useSession } from '@/lib/auth/session';
import { useT } from '@/lib/i18n';
import { setPrefs, usePrefs, type LanguagePref, type ThemePref } from '@/lib/prefs';

export default function SettingsScreen() {
  const theme = useTheme();
  const t = useT();
  const prefs = usePrefs();
  const { signOut } = useSession();
  const { data: me } = useMe();

  function confirmSignOut() {
    if (Platform.OS === 'web') {
      signOut();
      return;
    }
    Alert.alert(t.profile.signOutConfirm, undefined, [
      { text: t.common.cancel, style: 'cancel' },
      { text: t.profile.signOut, style: 'destructive', onPress: signOut },
    ]);
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}>
      <PawPattern inScroll />

      <ListSection title={t.settings.appearance}>
        <Segmented<ThemePref>
          value={prefs.theme}
          onChange={(theme) => setPrefs({ theme })}
          options={[
            { value: 'system', label: t.settings.system },
            { value: 'light', label: t.settings.light },
            { value: 'dark', label: t.settings.dark },
          ]}
        />
      </ListSection>

      <ListSection title={t.settings.language}>
        <Segmented<LanguagePref>
          value={prefs.language}
          onChange={(language) => setPrefs({ language })}
          options={[
            { value: 'system', label: t.settings.system },
            // Each language is named in itself, so it can be found from either one.
            { value: 'id', label: 'Indonesia' },
            { value: 'en', label: 'English' },
          ]}
        />
      </ListSection>

      <ListSection title={t.settings.account}>
        <ListCard>
          <ListRow label={t.settings.editProfile} onPress={() => router.push('/profile/edit')} />
          <ListRow
            label={me && !me.has_password ? t.settings.setPassword : t.settings.changePassword}
            onPress={() => router.push('/profile/password')}
          />
          <ListRow label={t.settings.deleteAccount} destructive onPress={() => router.push('/profile/delete-account')} />
        </ListCard>
      </ListSection>

      <ListCard>
        <ListRow label={t.profile.signOut} destructive chevron={false} onPress={confirmSignOut} />
      </ListCard>

      <ThemedText type="small" themeColor="textSecondary" style={styles.version}>
        {t.settings.version(Constants.expoConfig?.version ?? '–')}
      </ThemedText>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Spacing.four, gap: Spacing.four, paddingBottom: Spacing.six },
  version: { textAlign: 'center' },
});
