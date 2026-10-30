import { Stack } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { PostList } from '@/features/feed/post-list';
import { useTheme } from '@/hooks/use-theme';
import { useT } from '@/lib/i18n';
import type { FeedScope as Scope } from '@/lib/query';

// Remembered while the app runs, so leaving the tab and coming back keeps the same list.
let lastScope: Scope = 'public';

export default function FeedScreen() {
  const [scope, setScope] = useState<Scope>(lastScope);

  function choose(next: Scope) {
    lastScope = next;
    setScope(next);
  }

  return (
    <>
      <Stack.Screen options={{ headerTitle: () => <ScopeSwitch value={scope} onChange={choose} /> }} />
      {/* Keyed so switching scope starts the other list at the top, not at this one's scroll offset. */}
      <PostList key={scope} source={scope} />
    </>
  );
}

/** Two text tabs with an underline under the active one, as in TikTok's Following / For You. */
function ScopeSwitch({ value, onChange }: { value: Scope; onChange: (scope: Scope) => void }) {
  const theme = useTheme();
  const t = useT();
  const options: { scope: Scope; label: string }[] = [
    { scope: 'friends', label: t.feed.friends },
    { scope: 'public', label: t.feed.public },
  ];
  return (
    <View accessibilityRole="tablist" style={styles.switch}>
      {options.map((o) => {
        const active = o.scope === value;
        return (
          <Pressable
            key={o.scope}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.scope)}
            hitSlop={8}
            style={styles.option}>
            <ThemedText style={[styles.label, active && styles.labelActive]} themeColor={active ? 'text' : 'textSecondary'}>
              {o.label}
            </ThemedText>
            <View style={[styles.underline, { backgroundColor: active ? theme.text : 'transparent' }]} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  switch: { flexDirection: 'row', gap: Spacing.four },
  option: { alignItems: 'center', gap: Spacing.one },
  label: { fontSize: 17, lineHeight: 22, fontWeight: 600 },
  labelActive: { fontWeight: 800 },
  underline: { width: 24, height: 3, borderRadius: 2 },
});
