import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useReducedMotion } from '@/hooks/use-reduced-motion';
import { useTheme } from '@/hooks/use-theme';
import { Alert } from '@/lib/alert';
import { postsApi } from '@/lib/api/endpoints';
import { errorMessage } from '@/lib/api/errors';
import { REACTIONS, type Post, type Reaction } from '@/lib/api/types';
import { hapticTap } from '@/lib/haptics';
import { useT } from '@/lib/i18n';

import { updateCachedPost, withReaction } from './post-cache';

/**
 * Reactions under a post: one chip per emoji in use (tap to join or leave it), a paw button that opens
 * the full emoji row, and the comment count. One reaction per person; picking another replaces it.
 */
export function ReactionBar({ post, frame, onComment }: { post: Post; frame: string; onComment?: () => void }) {
  const theme = useTheme();
  const t = useT();
  const [picking, setPicking] = useState(false);
  // The reaction just chosen here, which bounces. Ones already on the post when it scrolls into view stay still.
  const [popped, setPopped] = useState<Reaction | null>(null);
  // Taps while a change is on its way are dropped, so responses cannot land out of order.
  const pending = useRef(false);
  const used = REACTIONS.filter((r) => post.reaction_counts[r]);

  async function choose(emoji: Reaction) {
    setPicking(false);
    if (pending.current) return;
    pending.current = true;
    const before = post.my_reaction;
    const next = before === emoji ? null : emoji;
    hapticTap();
    setPopped(next);
    // Shown at once; the server's answer replaces it, or a failure puts the old reaction back.
    updateCachedPost(post.id, (p) => withReaction(p, next));
    try {
      if (next) {
        const fresh = await postsApi.react(post.id, next);
        updateCachedPost(post.id, () => fresh);
      } else {
        await postsApi.unreact(post.id);
      }
    } catch (e) {
      updateCachedPost(post.id, (p) => withReaction(p, before));
      Alert.alert(errorMessage(e));
    } finally {
      pending.current = false;
    }
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        {used.map((r) => {
          const mine = post.my_reaction === r;
          return (
            <Pop key={r} active={popped === r}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: mine }}
                accessibilityLabel={`${r} ${post.reaction_counts[r]}`}
                onPress={() => choose(r)}
                style={({ pressed }) => [
                  styles.chip,
                  {
                    backgroundColor: mine ? `${theme.tint}22` : theme.background,
                    borderColor: mine ? theme.tint : frame,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}>
                <ThemedText type="small">
                  {r} {post.reaction_counts[r]}
                </ThemedText>
              </Pressable>
            </Pop>
          );
        })}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t.reactions.add}
          accessibilityState={{ expanded: picking }}
          onPress={() => setPicking((open) => !open)}
          hitSlop={4}
          style={({ pressed }) => [
            styles.chip,
            styles.add,
            { backgroundColor: picking ? frame : theme.background, borderColor: frame, opacity: pressed ? 0.7 : 1 },
          ]}>
          <SymbolView
            name={{ ios: 'pawprint.fill', android: 'pets', web: 'pets' }}
            size={14}
            tintColor={picking ? '#ffffff' : theme.textSecondary}
          />
          <ThemedText type="smallBold" style={{ color: picking ? '#ffffff' : theme.textSecondary }}>
            +
          </ThemedText>
        </Pressable>
        {onComment ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t.comments.open}
            onPress={onComment}
            hitSlop={4}
            style={({ pressed }) => [styles.comment, { opacity: pressed ? 0.6 : 1 }]}>
            <ThemedText type="small" themeColor="textSecondary">
              💬 {post.comment_count > 0 ? t.feed.comments(post.comment_count) : t.comments.write}
            </ThemedText>
          </Pressable>
        ) : null}
      </View>

      {picking ? (
        <View style={[styles.picker, { backgroundColor: theme.background, borderColor: frame }]}>
          {REACTIONS.map((r) => (
            <Pressable
              key={r}
              accessibilityRole="button"
              accessibilityState={{ selected: post.my_reaction === r }}
              onPress={() => choose(r)}
              hitSlop={2}
              style={({ pressed }) => [
                styles.option,
                post.my_reaction === r && { backgroundColor: `${theme.tint}22` },
                { transform: [{ scale: pressed ? 1.25 : 1 }] },
              ]}>
              <ThemedText style={styles.emoji}>{r}</ThemedText>
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

/** Bounces its child each time `active` turns on. */
function Pop({ active, children }: { active: boolean; children: ReactNode }) {
  const [scale] = useState(() => new Animated.Value(1));
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!active || reduced) return;
    scale.setValue(1.3);
    Animated.spring(scale, { toValue: 1, friction: 5, tension: 160, useNativeDriver: true }).start();
  }, [active, reduced, scale]);

  return <Animated.View style={{ transform: [{ scale }] }}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.two },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.one },
  chip: { paddingHorizontal: Spacing.two, paddingVertical: Spacing.half, borderRadius: 14, borderWidth: 1.5 },
  add: { flexDirection: 'row', alignItems: 'center', gap: 2, minHeight: 28 },
  comment: { marginLeft: Spacing.one, paddingVertical: Spacing.half },
  picker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignSelf: 'flex-start',
    gap: Spacing.one,
    padding: Spacing.one,
    borderRadius: 24,
    borderWidth: 1.5,
  },
  option: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  emoji: { fontSize: 24, lineHeight: 30 },
});
