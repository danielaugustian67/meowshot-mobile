import { ActivityIndicator, Pressable, StyleSheet, type PressableProps } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Props = Omit<PressableProps, 'children'> & {
  title: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  /** "small" is a pill for actions inside a list row. */
  size?: 'regular' | 'small';
  loading?: boolean;
};

export function Button({ title, variant = 'primary', size = 'regular', loading, disabled, style, ...rest }: Props) {
  const theme = useTheme();
  const inactive = disabled || loading;
  // Small buttons sit on list cards, which already use backgroundElement, so they step one shade further.
  const secondaryBg = size === 'small' ? theme.backgroundSelected : theme.backgroundElement;
  const bg = variant === 'primary' ? theme.tint : variant === 'secondary' ? secondaryBg : 'transparent';
  const fg = variant === 'primary' ? theme.onTint : variant === 'secondary' ? theme.text : theme.tint;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!inactive, busy: !!loading }}
      disabled={inactive}
      style={(state) => [
        styles.base,
        size === 'small' && styles.small,
        { backgroundColor: bg, opacity: inactive ? 0.6 : state.pressed ? 0.85 : 1 },
        typeof style === 'function' ? style(state) : style,
      ]}
      {...rest}>
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <ThemedText type="smallBold" style={{ color: fg, fontSize: size === 'small' ? 14 : 16 }}>
          {title}
        </ThemedText>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 50,
    borderRadius: 14,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    justifyContent: 'center',
  },
  small: { minHeight: 34, borderRadius: 17, paddingHorizontal: Spacing.three },
});
