import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { ThemedText } from '@/components/themed-text';
import { Fonts, Pastels, Spacing } from '@/constants/theme';
import { useStackLinks } from '@/hooks/use-stack-links';
import { useTheme } from '@/hooks/use-theme';
import { REACTIONS, type Post } from '@/lib/api/types';
import { catName, daysAgo } from '@/lib/format';
import { useT } from '@/lib/i18n';

const AVATAR = 22;

/**
 * One post in the feed, drawn as a cat's head: a pastel frame with two ears on top, the cat's name as the
 * title, its photo, then who snapped it, reactions and caption. Tapping the author opens their profile.
 */
export function PostCard({ post, linkAuthor = true }: { post: Post; linkAuthor?: boolean }) {
  const theme = useTheme();
  const t = useT();
  const { openProfile } = useStackLinks();
  const photo = post.photos[0];
  const name = catName(post.cat.name);
  const place = post.location?.label;
  const reactions = REACTIONS.filter((r) => post.reaction_counts[r]);
  const frame = Pastels[post.id % Pastels.length];
  // Very tall or very wide photos are cropped, so one post never fills more than a screen.
  const ratio = photo?.width && photo.height ? Math.min(Math.max(photo.width / photo.height, 0.8), 1.91) : 1;

  return (
    <View style={styles.wrap}>
      {/* Drawn before the card, whose opaque page colour hides the lower half of each ear. */}
      <Ear color={frame} style={styles.earLeft} />
      <Ear color={frame} style={styles.earRight} />
      <View style={[styles.card, { backgroundColor: theme.background }]}>
        <View style={[StyleSheet.absoluteFill, styles.wash, { backgroundColor: `${frame}40`, borderColor: frame }]} />

        <View style={styles.header}>
          <View style={styles.headerText}>
            <ThemedText numberOfLines={1} style={styles.name}>
              {name}
            </ThemedText>
            {place ? (
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                📍 {place}
              </ThemedText>
            ) : null}
          </View>
          <View style={[styles.badge, { backgroundColor: frame }]}>
            <SymbolView
              name={
                post.visibility === 'PUBLIC'
                  ? { ios: 'globe', android: 'public', web: 'public' }
                  : { ios: 'person.2.fill', android: 'group', web: 'group' }
              }
              size={14}
              tintColor="#ffffff"
              accessibilityLabel={post.visibility === 'PUBLIC' ? t.feed.public : t.feed.friends}
            />
          </View>
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
          <Pressable
            accessibilityRole={linkAuthor ? 'link' : undefined}
            accessibilityLabel={linkAuthor ? t.user.open(post.author.username) : undefined}
            disabled={!linkAuthor}
            onPress={() => openProfile(post.author.username)}
            style={styles.author}>
            <Avatar user={post.author} size={AVATAR} />
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1} style={styles.authorText}>
              {t.feed.snappedBy(post.author.username)} · {daysAgo(post.created_at)}
            </ThemedText>
          </Pressable>

          {post.caption ? <ThemedText>{post.caption}</ThemedText> : null}

          {reactions.length > 0 || post.comment_count > 0 ? (
            <View style={styles.stats}>
              {reactions.map((r) => (
                <View
                  key={r}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: theme.background,
                      borderColor: post.my_reaction === r ? theme.tint : frame,
                    },
                  ]}>
                  <ThemedText type="small">
                    {r} {post.reaction_counts[r]}
                  </ThemedText>
                </View>
              ))}
              {post.comment_count > 0 ? (
                <ThemedText type="small" themeColor="textSecondary" style={styles.comments}>
                  💬 {t.feed.comments(post.comment_count)}
                </ThemedText>
              ) : null}
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

/** A rounded square turned 45° so one corner points up, with a pale inner ear near the tip. */
function Ear({ color, style }: { color: string; style: object }) {
  return (
    <View style={[styles.ear, { backgroundColor: color }, style]}>
      <View style={styles.innerEar} />
    </View>
  );
}

const RADIUS = 24;
const INSET = Spacing.two;
const BORDER = 3;
const EAR = 44;
// How far the ear tips stand above the card.
const EAR_RISE = 24;

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: Spacing.three, paddingTop: EAR_RISE },
  card: { borderRadius: RADIUS, borderCurve: 'continuous', padding: INSET, gap: Spacing.two },
  wash: { borderRadius: RADIUS, borderCurve: 'continuous', borderWidth: BORDER },
  ear: {
    position: 'absolute',
    // The turned square's tip sits EAR * 0.707 above its centre; put the tip at the top of the wrapper.
    top: EAR * 0.707 - EAR / 2,
    width: EAR,
    height: EAR,
    borderRadius: 9,
    transform: [{ rotate: '45deg' }],
  },
  earLeft: { left: Spacing.three + 30 },
  earRight: { right: Spacing.three + 30 },
  innerEar: {
    position: 'absolute',
    top: 7,
    left: 7,
    width: 17,
    height: 17,
    borderRadius: 5,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.two, paddingTop: Spacing.one },
  headerText: { flex: 1 },
  name: { fontFamily: Fonts.rounded, fontSize: 20, lineHeight: 26, fontWeight: 800 },
  badge: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  photo: { width: '100%', borderRadius: RADIUS - INSET, borderCurve: 'continuous' },
  body: { gap: Spacing.two, paddingHorizontal: Spacing.two, paddingBottom: Spacing.two },
  author: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  authorText: { flex: 1 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.one },
  chip: { paddingHorizontal: Spacing.two, paddingVertical: Spacing.half, borderRadius: 12, borderWidth: 1.5 },
  comments: { marginLeft: Spacing.one },
});
