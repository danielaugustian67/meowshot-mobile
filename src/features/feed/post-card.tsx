import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { memo, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';

import { Avatar } from '@/components/avatar';
import { ThemedText } from '@/components/themed-text';
import { Fonts, PaperInk, Pastels, Spacing } from '@/constants/theme';
import { useModeration } from '@/features/moderation/actions';
import { displayRatio, motifOf, paperColor } from '@/features/photo-edit/decoration';
import { PhotoPrint } from '@/features/photo-edit/photo-print';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useStackLinks } from '@/hooks/use-stack-links';
import { useTheme } from '@/hooks/use-theme';
import type { Post } from '@/lib/api/types';
import { useMe } from '@/lib/auth/session';
import { catName, daysAgo } from '@/lib/format';
import { useT } from '@/lib/i18n';

import { ReactionBar } from './reaction-bar';

const AVATAR = 36;
const FADE_MS = 200;

/**
 * One post in the feed, laid out like Instagram: who posted and where, the photo, reactions, then the caption.
 * The photo sits on its print: the cat's patterned paper unless the owner chose another, with the cat's name on a tag. Tapping the author opens their profile.
 */
export const PostCard = memo(function PostCard({
  post,
  linkAuthor = true,
  onComment,
  onDeleted,
}: {
  post: Post;
  linkAuthor?: boolean;
  /** Called after an admin removes the post, for a screen that shows nothing else. */
  onDeleted?: () => void;
  /** What the comment button does; by default it opens the post, where the comments are. */
  onComment?: () => void;
}) {
  const theme = useTheme();
  const t = useT();
  const { openProfile, openPost, openCat } = useStackLinks();
  const { openMenu, confirmAdminDelete } = useModeration();
  const isAdmin = useMe().data?.role === 'admin';
  const [opacity] = useState(() => new Animated.Value(1));
  const reducedMotion = useReducedMotion();
  const photo = post.photos[0];
  const name = catName(post.cat.name);
  const place = post.location?.label;
  const frame = Pastels[post.cat.id % Pastels.length];
  const decoration = photo?.decoration;
  const ratio = displayRatio(photo?.width, photo?.height);

  function fadeOut() {
    const duration = reducedMotion ? 0 : FADE_MS;
    Animated.timing(opacity, { toValue: 0, duration, useNativeDriver: true }).start();
    // On a timer rather than the animation's callback, which waits for frames a backgrounded app never draws.
    return new Promise<void>((done) => setTimeout(done, duration));
  }

  return (
    <Animated.View style={[styles.post, { opacity }]}>
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
        {isAdmin ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.moderation.adminDeleteTitle}
            onPress={() => confirmAdminDelete(post.id, post.author, fadeOut, onDeleted)}
            hitSlop={8}
            style={({ pressed }) => [styles.more, { opacity: pressed ? 0.5 : 1 }]}>
            <SymbolView name={{ ios: 'trash', android: 'delete', web: 'delete' }} size={18} tintColor={theme.textSecondary} />
          </Pressable>
        ) : null}
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

      <PhotoPrint
        color={paperColor(decoration, post.cat.id)}
        motif={motifOf(decoration, post.cat.id)}
        ratio={ratio}
        photoRatio={photo?.width && photo.height ? photo.width / photo.height : 1}
        stickers={decoration?.stickers}
        photo={
          photo?.url ? (
            <Image
              // Signed URLs change on every fetch; cache by photo id so the image is not re-downloaded.
              source={{ uri: photo.url, cacheKey: `photo-${photo.id}` }}
              // The small thumbnail arrives first, so the card is not empty while the full photo loads.
              placeholder={photo.thumb_url ? { uri: photo.thumb_url, cacheKey: `photo-thumb-${photo.id}` } : undefined}
              placeholderContentFit="cover"
              style={StyleSheet.absoluteFill}
              contentFit="cover"
              transition={150}
              accessibilityLabel={t.feed.photoAlt(name)}
            />
          ) : null
        }>
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
      </PhotoPrint>

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
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  post: { gap: Spacing.two },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.three },
  author: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.two },
  // Like the ring around a story, in the cat's colour.
  ring: { padding: Spacing.half, borderWidth: 2, borderRadius: AVATAR },
  more: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
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
