/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import '@/global.css';

import { Platform } from 'react-native';

export const Colors = {
  light: {
    text: '#0F3D3E', // Deep Teal
    background: '#FFFFFF', // Pure White
    backgroundElement: '#F4F5F7', // Pale Mint
    backgroundSelected: '#B7E36D', // Soft Lime
    textSecondary: '#60646C',
    tint: '#B7E36D', // Soft Lime
    income: '#22C55E',
    expense: '#FF6B6B',
  },
  dark: {
    text: '#FAFCFB', // Off-White
    background: '#0F3D3E', // Deep Teal
    backgroundElement: '#144F50', // Slightly lighter Deep Teal
    backgroundSelected: '#B7E36D', // Soft Lime
    textSecondary: '#E6F4F1', // Pale Mint
    tint: '#B7E36D', // Soft Lime
    income: '#22C55E',
    expense: '#FF6B6B',
  },
} as const;

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
