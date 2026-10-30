/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://unistyl.es/), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#000000',
    /** Warm off-white so the paw pattern reads as part of the page. */
    background: '#FFFBF7',
    backgroundElement: '#F0F0F3',
    backgroundSelected: '#E0E1E6',
    textSecondary: '#60646C',
    border: '#D9D9E0',
    /** Brand orange ("oyen"); also the primary button colour. */
    tint: '#E8620C',
    onTint: '#ffffff',
    danger: '#CE2C31',
    /** Paw prints drawn behind screens (PawPattern). */
    pattern: '#F6EBE0',
  },
  dark: {
    text: '#ffffff',
    background: '#000000',
    backgroundElement: '#212225',
    backgroundSelected: '#2E3135',
    textSecondary: '#B0B4BA',
    border: '#3A3F42',
    tint: '#FF8B3E',
    onTint: '#1A0D00',
    danger: '#FF6369',
    /** Brighter than the light-mode ratio suggests: faint marks on pure black disappear on a dim phone screen. */
    pattern: '#2E241B',
  },
} as const;

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

/** Pastel frame colours that read on both the off-white and the black page. Pick one with `id % Pastels.length`. */
export const Pastels = ['#FFB37A', '#F7A8C4', '#8FD6AE', '#9EC2F5', '#F5D46E', '#C5B0F5'] as const;

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: 'var(--font-display)',
    serif: 'var(--font-serif)',
    rounded: 'var(--font-rounded)',
    mono: 'var(--font-mono)',
  },
});

export const Spacing = {
  half: 2,
  one: 4,
  two: 8,
  three: 16,
  four: 24,
  five: 32,
  six: 64,
} as const;

export const BottomTabInset = Platform.select({ ios: 50, android: 80 }) ?? 0;
export const MaxContentWidth = 800;
