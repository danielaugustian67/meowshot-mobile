import { Image } from 'expo-image';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, View } from 'react-native';

import { PawPattern } from '@/components/paw-pattern';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Button } from '@/components/ui/button';
import { FormError } from '@/components/form-screen';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { errorMessage } from '@/lib/api/errors';
import { useMe, useSession } from '@/lib/auth/session';

export default function ProfileScreen() {
  const theme = useTheme();
  const { signOut } = useSession();
  const { data: me, error, isPending, refetch, isRefetching } = useMe();

  function confirmSignOut() {
    if (Platform.OS === 'web') {
      signOut();
      return;
    }
    Alert.alert('Keluar?', undefined, [
      { text: 'Batal', style: 'cancel' },
      { text: 'Keluar', style: 'destructive', onPress: signOut },
    ]);
  }

  if (isPending) {
    return (
      <ThemedView style={styles.center}>
        <PawPattern />
        <ActivityIndicator />
      </ThemedView>
    );
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.content}>
      <PawPattern inScroll />
      {me ? (
        <View style={styles.header}>
          {me.avatar_url ? (
            // Signed URLs change on every fetch; cache by user id so the image is not re-downloaded.
            <Image source={{ uri: me.avatar_url, cacheKey: `avatar-${me.id}` }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarEmpty, { backgroundColor: theme.backgroundElement }]}>
              <ThemedText style={styles.avatarLetter}>{me.username[0]?.toUpperCase()}</ThemedText>
            </View>
          )}
          <ThemedText type="subtitle">@{me.username}</ThemedText>
          {me.bio ? <ThemedText style={styles.centerText}>{me.bio}</ThemedText> : null}
          <ThemedText type="small" themeColor="textSecondary">
            {me.email} · {me.cat_count} kucing
          </ThemedText>
        </View>
      ) : (
        <View style={styles.header}>
          <FormError message={errorMessage(error)} />
          <Button title="Coba lagi" variant="secondary" onPress={() => refetch()} loading={isRefetching} />
        </View>
      )}
      <Button title="Keluar" variant="secondary" onPress={confirmSignOut} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: Spacing.four, gap: Spacing.four },
  header: { alignItems: 'center', gap: Spacing.two },
  avatar: { width: 96, height: 96, borderRadius: 48 },
  avatarEmpty: { alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 40, lineHeight: 48, fontWeight: 700 },
  centerText: { textAlign: 'center' },
});
