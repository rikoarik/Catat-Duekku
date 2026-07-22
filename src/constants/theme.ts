/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

import { Colors as CoreColors } from '@/core/theme/colors';

export const Colors = {
  light: {
    text: CoreColors.light.textPrimary,
    background: CoreColors.light.background,
    backgroundElement: CoreColors.light.surfaceElement,
    backgroundSelected: CoreColors.light.accent,
    textSecondary: CoreColors.light.textSecondary,
    tint: CoreColors.light.tint,
    income: CoreColors.light.income,
    expense: CoreColors.light.expense,
  },
  dark: {
    text: CoreColors.dark.textPrimary,
    background: CoreColors.dark.background,
    backgroundElement: CoreColors.dark.surfaceElement,
    backgroundSelected: CoreColors.dark.accent,
    textSecondary: CoreColors.dark.textSecondary,
    tint: CoreColors.dark.tint,
    income: CoreColors.dark.income,
    expense: CoreColors.dark.expense,
  },
} as const;

// ponytail: keep this legacy bridge until old starter/web components stop importing it.

export type ThemeColor = keyof typeof Colors.light & keyof typeof Colors.dark;

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
