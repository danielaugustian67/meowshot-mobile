import { Stack } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Fonts, Spacing } from '@/constants/theme';
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
      <PostList key={scope} scope={scope} />
    </>
  );
}

/** A pill with the active side filled in brand orange and marked with a paw. */
function ScopeSwitch({ value, onChange }: { value: Scope; onChange: (scope: Scope) => void }) {
  const theme = useTheme();
  const t = useT();
  const options: { scope: Scope; label: string }[] = [
    { scope: 'friends', label: t.feed.friends },
    { scope: 'public', label: t.feed.public },
  ];
  return (
    <View accessibilityRole="tablist" style={[styles.switch, { backgroundColor: theme.backgroundElement }]}>
      {options.map((o) => {
        const active = o.scope === value;
        return (
          <Pressable
            key={o.scope}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.scope)}
            hitSlop={4}
            style={[styles.option, active && { backgroundColor: theme.tint }]}>
            {active ? (
              <SymbolView name={{ ios: 'pawprint.fill', android: 'pets', web: 'pets' }} size={13} tintColor={theme.onTint} />
            ) : null}
            <ThemedText
              style={[styles.label, { color: active ? theme.onTint : theme.textSecondary }]}>
              {o.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  switch: { flexDirection: 'row', padding: 3, borderRadius: 20, gap: 2 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingHorizontal: Spacing.three,
    paddingVertical: 5,
    borderRadius: 17,
  },
  label: { fontFamily: Fonts.rounded, fontSize: 15, lineHeight: 20, fontWeight: 700 },
});
