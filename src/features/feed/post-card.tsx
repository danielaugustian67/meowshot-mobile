import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { REACTIONS, type Post } from '@/lib/api/types';
import { catName, daysAgo } from '@/lib/format';
import { useT } from '@/lib/i18n';

const AVATAR = 36;

/** One post in the feed: author, the cat's first photo, reactions and caption. */
export function PostCard({ post }: { post: Post }) {
  const theme = useTheme();
  const t = useT();
  const photo = post.photos[0];
  const name = catName(post.cat.name);
  const place = post.location?.label;
  const reactions = REACTIONS.filter((r) => post.reaction_counts[r]);
  // Very tall or very wide photos are cropped to the same bounds Instagram uses (4:5 to 1.91:1).
  const ratio = photo?.width && photo.height ? Math.min(Math.max(photo.width / photo.height, 0.8), 1.91) : 1;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Avatar user={post.author} size={AVATAR} />
        <View style={styles.headerText}>
          <ThemedText type="smallBold" numberOfLines={1}>
            @{post.author.username}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
            {place ? `${name} · ${place}` : name}
          </ThemedText>
        </View>
        <SymbolView
          name={
            post.visibility === 'PUBLIC'
              ? { ios: 'globe', android: 'public', web: 'public' }
              : { ios: 'person.2.fill', android: 'group', web: 'group' }
          }
          size={16}
          tintColor={theme.textSecondary}
          accessibilityLabel={post.visibility === 'PUBLIC' ? t.feed.public : t.feed.friends}
        />
      </View>

      {photo?.url ? (
        <Image
          // Signed URLs change on every fetch; cache by photo id so the image is not re-downloaded.
          source={{ uri: photo.url, cacheKey: `photo-${photo.id}` }}
          style={[styles.photo, { aspectRatio: ratio, backgroundColor: theme.backgroundElement }]}
          contentFit="cover"
          transition={150}
          accessibilityLabel={t.feed.photoAlt(name)}
        />
      ) : null}

      <View style={styles.body}>
        {reactions.length > 0 || post.comment_count > 0 ? (
          <View style={styles.stats}>
            {reactions.map((r) => (
              <View
                key={r}
                style={[
                  styles.chip,
                  {
                    backgroundColor: theme.backgroundElement,
                    borderColor: post.my_reaction === r ? theme.tint : 'transparent',
                  },
                ]}>
                <ThemedText type="small">
                  {r} {post.reaction_counts[r]}
                </ThemedText>
              </View>
            ))}
            {post.comment_count > 0 ? (
              <ThemedText type="small" themeColor="textSecondary" style={styles.comments}>
                {t.feed.comments(post.comment_count)}
              </ThemedText>
            ) : null}
          </View>
        ) : null}
        {post.caption ? (
          <ThemedText>
            <ThemedText style={styles.captionAuthor}>@{post.author.username} </ThemedText>
            {post.caption}
          </ThemedText>
        ) : null}
        <ThemedText type="small" themeColor="textSecondary">
          {daysAgo(post.created_at)}
        </ThemedText>
      </View>
    </View>
  );
}


const styles = StyleSheet.create({
  card: { gap: Spacing.two },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.three },
  headerText: { flex: 1 },
  photo: { width: '100%' },
  body: { gap: Spacing.one, paddingHorizontal: Spacing.three },
  stats: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.one },
  chip: { paddingHorizontal: Spacing.two, paddingVertical: Spacing.half, borderRadius: 12, borderWidth: 1 },
  comments: { marginLeft: Spacing.one },
  captionAuthor: { fontWeight: 700 },
});
