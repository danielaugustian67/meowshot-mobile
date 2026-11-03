import { useEffect, useState, type PropsWithChildren } from 'react';
import { Animated, ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { PawPattern } from '@/components/paw-pattern';
import { Spacing } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/lib/i18n';

/** Everything inside fades in and out together, on one animated value. */
function Pulse({ children }: PropsWithChildren) {
  const t = useT();
  const [opacity] = useState(() => new Animated.Value(1));
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    const step = (toValue: number) => Animated.timing(opacity, { toValue, duration: 700, useNativeDriver: true });
    const loop = Animated.loop(Animated.sequence([step(0.45), step(1)]));
    loop.start();
    return () => loop.stop();
  }, [opacity, reduced]);

  return (
    <Animated.View accessible accessibilityRole="progressbar" accessibilityLabel={t.common.loading} style={{ opacity }}>
      {children}
    </Animated.View>
  );
}

/** One grey shape standing in for content that hasn't arrived. */
function Bone({ style }: { style?: StyleProp<ViewStyle> }) {
  const theme = useTheme();
  return <View style={[styles.bone, { backgroundColor: theme.backgroundElement }, style]} />;
}

/**
 * A whole screen's loading state. It is a scroll view for the same reason the real lists are: on iOS the content
 * inset is what keeps it clear of the large title.
 */
function SkeletonScreen({ children }: PropsWithChildren) {
  const theme = useTheme();
  return (
    <ScrollView
      scrollEnabled={false}
      contentInsetAdjustmentBehavior="automatic"
      style={{ backgroundColor: theme.background }}
      contentContainerStyle={styles.screen}>
      <PawPattern inScroll />
      <Pulse>{children}</Pulse>
    </ScrollView>
  );
}

function PostCardSkeleton() {
  return (
    <View style={styles.post}>
      <View style={styles.postHeader}>
        <Bone style={styles.postAvatar} />
        <Bone style={styles.lineShort} />
      </View>
      <Bone style={styles.postPrint} />
      <View style={styles.postBody}>
        <Bone style={styles.chip} />
        <Bone style={styles.lineLong} />
      </View>
    </View>
  );
}

/** The feed, while its first page loads. */
export function PostListSkeleton() {
  return (
    <SkeletonScreen>
      <PostCardSkeleton />
      <PostCardSkeleton />
    </SkeletonScreen>
  );
}

/** The cat collection, while its first page loads. */
export function CatGridSkeleton() {
  return (
    <SkeletonScreen>
      <View style={styles.cats}>
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <View key={i} style={styles.catTile}>
            <Bone style={styles.catCover} />
            <Bone style={styles.lineShort} />
          </View>
        ))}
      </View>
    </SkeletonScreen>
  );
}

function ProfileHeaderSkeleton() {
  return (
    <View style={styles.profile}>
      <Bone style={styles.profileAvatar} />
      <Bone style={styles.lineShort} />
      <Bone style={styles.lineLong} />
    </View>
  );
}

/** A profile, while it loads: `photos` adds the grid of posts for someone else's. */
export function ProfileSkeleton({ photos = false }: { photos?: boolean }) {
  return (
    <SkeletonScreen>
      <ProfileHeaderSkeleton />
      {photos ? <PhotoSquares /> : null}
    </SkeletonScreen>
  );
}

/** One of your cats, while it loads. */
export function CatSkeleton() {
  return (
    <SkeletonScreen>
      <View style={styles.catHero}>
        <Bone style={styles.catCover} />
        <Bone style={styles.lineShort} />
      </View>
      <PhotoSquares />
    </SkeletonScreen>
  );
}

function PhotoSquares() {
  return (
    <View style={styles.squares}>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Bone key={i} style={styles.square} />
      ))}
    </View>
  );
}

/** A grid of photos loading inside a list that already scrolls. */
export function PhotoGridSkeleton() {
  return (
    <Pulse>
      <PhotoSquares />
    </Pulse>
  );
}

/** Rows of notifications loading inside a list that already scrolls. */
export function RowsSkeleton() {
  return (
    <Pulse>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <View key={i} style={styles.row}>
          <Bone style={styles.postAvatar} />
          <View style={styles.rowText}>
            <Bone style={styles.lineLong} />
            <Bone style={styles.lineShort} />
          </View>
        </View>
      ))}
    </Pulse>
  );
}

const AVATAR = 44;

const styles = StyleSheet.create({
  screen: { paddingVertical: Spacing.three },
  bone: { borderRadius: 6 },
  lineShort: { width: 120, height: 12 },
  lineLong: { width: '70%', height: 12 },
  chip: { width: 64, height: 28, borderRadius: 14 },
  post: { gap: Spacing.two, marginBottom: Spacing.four },
  postHeader: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, paddingHorizontal: Spacing.three },
  postAvatar: { width: AVATAR, height: AVATAR, borderRadius: AVATAR / 2 },
  postPrint: { aspectRatio: 1, marginHorizontal: Spacing.three, borderRadius: 12 },
  postBody: { gap: Spacing.two, paddingHorizontal: Spacing.three },
  cats: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: Spacing.three / 2, rowGap: Spacing.three },
  catTile: { width: '50%', gap: Spacing.two, paddingHorizontal: Spacing.three / 2 },
  catCover: { aspectRatio: 1, width: '100%', borderRadius: 12 },
  catHero: { gap: Spacing.two, paddingHorizontal: Spacing.four, marginBottom: Spacing.four },
  profile: { alignItems: 'center', gap: Spacing.two, padding: Spacing.four },
  profileAvatar: { width: 96, height: 96, borderRadius: 48 },
  squares: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.one, paddingHorizontal: Spacing.three },
  square: { flexGrow: 1, flexBasis: '30%', aspectRatio: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.two, padding: Spacing.three },
  rowText: { flex: 1, gap: Spacing.two },
});
