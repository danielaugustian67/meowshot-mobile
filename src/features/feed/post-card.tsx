import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { ThemedText } from '@/components/themed-text';
import { Fonts, PaperInk, Pastels, Spacing } from '@/constants/theme';
import { BoothMark, PaperMotif } from '@/features/cats/cat-tile';
import { useModeration } from '@/features/moderation/actions';
import { useStackLinks } from '@/hooks/use-stack-links';
import { useTheme } from '@/hooks/use-theme';
import type { Post } from '@/lib/api/types';
import { catName, daysAgo } from '@/lib/format';
import { useT } from '@/lib/i18n';

import { ReactionBar } from './reaction-bar';

const AVATAR = 36;

/**
 * One post in the feed, laid out like Instagram: who posted and where, the photo, reactions, then the caption.
 * The photo sits on the cat's patterned paper, the same as its print in the collection, with two ears on top and
 * the cat's name on a tag. Tapping the author opens their profile.
 */
export function PostCard({
  post,
  linkAuthor = true,
  onComment,
}: {
  post: Post;
  linkAuthor?: boolean;
  /** What the comment button does; by default it opens the post, where the comments are. */
  onComment?: () => void;
}) {
  const theme = useTheme();
  const t = useT();
  const { openProfile, openPost, openCat } = useStackLinks();
  const { openMenu } = useModeration();
  const photo = post.photos[0];
  const name = catName(post.cat.name);
  const place = post.location?.label;
  const frame = Pastels[post.cat.id % Pastels.length];
  // Very tall or very wide photos are cropped, so one post never fills more than a screen.
  const ratio = photo?.width && photo.height ? Math.min(Math.max(photo.width / photo.height, 0.8), 1.91) : 1;

  return (
    <View style={styles.post}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole={linkAuthor ? 'link' : undefined}
          accessibilityLabel={linkAuthor ? t.user.open(post.author.username) : undefined}
          disabled={!linkAuthor}
          onPress={() => openProfile(post.author.username)}
          style={styles.author}>
          <View style={[styles.ring, { borderColor: frame }]}>
            <Avatar user={post.author} size={AVATAR} />
          </View>
          <View style={styles.flex}>
            <ThemedText type="smallBold" numberOfLines={1}>
              {post.author.username}
            </ThemedText>
            {place ? (
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                📍 {place}
              </ThemedText>
            ) : null}
          </View>
        </Pressable>
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
        {post.is_owner ? null : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.moderation.more}
            onPress={() => openMenu('POST', post.id, post.author)}
            hitSlop={8}
            style={({ pressed }) => [styles.more, { opacity: pressed ? 0.5 : 1 }]}>
            <SymbolView
              name={{ ios: 'ellipsis', android: 'more_horiz', web: 'more_horiz' }}
              size={18}
              tintColor={theme.textSecondary}
            />
          </Pressable>
        )}
      </View>

      <View style={styles.print}>
        {/* Drawn before the paper, which hides the lower half of each ear. */}
        <Ear color={frame} style={styles.earLeft} />
        <Ear color={frame} style={styles.earRight} />
        <View style={[styles.paper, { backgroundColor: frame }]}>
          <PaperMotif id={post.cat.id} />
          {photo?.url ? (
            <Image
              // Signed URLs change on every fetch; cache by photo id so the image is not re-downloaded.
              source={{ uri: photo.url, cacheKey: `photo-${photo.id}` }}
              // The small thumbnail arrives first, so the card is not empty while the full photo loads.
              placeholder={photo.thumb_url ? { uri: photo.thumb_url, cacheKey: `photo-thumb-${photo.id}` } : undefined}
              placeholderContentFit="cover"
              style={[styles.photo, { aspectRatio: ratio, backgroundColor: theme.backgroundElement }]}
              contentFit="cover"
              transition={150}
              accessibilityLabel={t.feed.photoAlt(name)}
            />
          ) : null}
          <View style={styles.markRow}>
            <BoothMark />
          </View>
          {/* The cat's page is the owner's alone, so only your own posts link to it. */}
          <Pressable
            accessibilityRole={post.is_owner ? 'link' : undefined}
            accessibilityLabel={post.is_owner ? t.cats.open(name) : undefined}
            disabled={!post.is_owner}
            onPress={() => openCat(post.cat.id)}
            style={styles.tag}>
            <SymbolView name={{ ios: 'pawprint.fill', android: 'pets', web: 'pets' }} size={13} tintColor={frame} />
            <ThemedText numberOfLines={1} style={styles.name}>
              {name}
            </ThemedText>
          </Pressable>
        </View>
      </View>

      <View style={styles.body}>
        <ReactionBar post={post} frame={frame} onComment={onComment ?? (() => openPost(post.id))} />
        {post.caption ? (
          <ThemedText type="small">
            <ThemedText type="smallBold">{post.author.username}</ThemedText> {post.caption}
          </ThemedText>
        ) : null}
        <ThemedText type="small" themeColor="textSecondary">
          {daysAgo(post.created_at)}
        </ThemedText>
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
const INSET = Spacing.three;
const EAR = 56;
// How far the ear tips stand above the paper.
const EAR_RISE = 30;

const styles = StyleSheet.create({
  post: { gap: Spacing.two },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.three },
  author: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  // Like the ring around a story, in the cat's colour.
  ring: { padding: Spacing.half, borderWidth: 2, borderRadius: AVATAR },
  more: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  print: { paddingHorizontal: Spacing.one, paddingTop: EAR_RISE },
  // Clips the motif, which has no idea this paper is rounder than a print.
  paper: { borderRadius: RADIUS, borderCurve: 'continuous', padding: INSET, overflow: 'hidden' },
  ear: {
    position: 'absolute',
    // The turned square's tip sits EAR * 0.707 above its centre; put the tip at the top of the print.
    top: EAR * 0.707 - EAR / 2,
    width: EAR,
    height: EAR,
    borderRadius: 11,
    transform: [{ rotate: '45deg' }],
  },
  earLeft: { left: Spacing.one + 34 },
  earRight: { right: Spacing.one + 34 },
  innerEar: {
    position: 'absolute',
    top: 9,
    left: 9,
    width: 22,
    height: 22,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  photo: { width: '100%', borderRadius: RADIUS - INSET, borderCurve: 'continuous' },
  // Leaves the tag room to hang over the bottom of the photo.
  markRow: { alignSelf: 'flex-end', minHeight: Spacing.five, paddingRight: Spacing.one },
  // Stays white in both themes, like the paper it is stuck to.
  tag: {
    position: 'absolute',
    left: Spacing.four,
    bottom: Spacing.three + Spacing.one,
    maxWidth: '62%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.two + Spacing.half,
    paddingVertical: Spacing.one,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    transform: [{ rotate: '-2deg' }],
  },
  name: { flexShrink: 1, color: PaperInk, fontFamily: Fonts.rounded, fontSize: 15, lineHeight: 20, fontWeight: 800 },
  body: { gap: Spacing.two, paddingHorizontal: Spacing.three, paddingTop: Spacing.one },
});
