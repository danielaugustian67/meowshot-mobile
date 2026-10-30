import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Option<T extends string> = { value: T; label: string };

/** A row of mutually exclusive choices, like the iOS segmented control. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
}: {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  const theme = useTheme();
  return (
    <View accessibilityRole="radiogroup" style={[styles.track, { backgroundColor: theme.backgroundElement }]}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ selected: active }}
            onPress={() => onChange(o.value)}
            style={[styles.segment, active && [styles.active, { backgroundColor: theme.background }]]}>
            <ThemedText type={active ? 'smallBold' : 'small'} themeColor={active ? 'text' : 'textSecondary'}>
              {o.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', borderRadius: 12, padding: Spacing.half },
  segment: { flex: 1, minHeight: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  active: {
    boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
  },
});
