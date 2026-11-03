import { SymbolView, type SFSymbol } from 'expo-symbols';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

type AndroidName = Extract<ComponentProps<typeof SymbolView>['name'], { android?: unknown }>['android'];

/** A round icon button for the photo editor's tools. */
export function ToolButton({
  icon,
  label,
  onPress,
  disabled,
}: {
  icon: { ios: SFSymbol; android: AndroidName };
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      hitSlop={4}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: theme.backgroundElement, opacity: disabled ? 0.4 : pressed ? 0.6 : 1 },
      ]}>
      <SymbolView name={{ ...icon, web: icon.android }} size={20} tintColor={theme.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
