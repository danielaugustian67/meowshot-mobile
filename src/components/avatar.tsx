import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { useTheme } from '@/hooks/use-theme';
import type { User } from '@/lib/api/types';

/** A user's round photo, or the first letter of their username when they have none. */
export function Avatar({ user, size }: { user: Pick<User, 'id' | 'username' | 'avatar_url'>; size: number }) {
  const theme = useTheme();
  const shape = { width: size, height: size, borderRadius: size / 2 };
  if (user.avatar_url) {
    // Signed URLs change on every fetch; cache by user id so the image is not re-downloaded.
    return <Image source={{ uri: user.avatar_url, cacheKey: `avatar-${user.id}` }} style={shape} />;
  }
  return (
    <View style={[shape, styles.empty, { backgroundColor: theme.backgroundSelected }]}>
      <ThemedText style={{ fontSize: size * 0.42, lineHeight: size * 0.5, fontWeight: 700 }}>
        {user.username[0]?.toUpperCase()}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', justifyContent: 'center' },
});
