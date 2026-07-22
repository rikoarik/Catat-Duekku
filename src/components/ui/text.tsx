import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet } from 'react-native';

export interface TextProps extends RNTextProps {
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
}

export function Text({ style, weight = 'regular', ...props }: TextProps) {
  let fontFamily = 'ClashDisplay-Regular';
  if (weight === 'medium') fontFamily = 'ClashDisplay-Medium';
  if (weight === 'semibold') fontFamily = 'ClashDisplay-Semibold';
  if (weight === 'bold') fontFamily = 'ClashDisplay-Bold';

  // Extract font weight from style to apply correct font family if passed via style
  const flattenedStyle = StyleSheet.flatten(style) || {};
  if (flattenedStyle.fontWeight) {
    const fw = flattenedStyle.fontWeight.toString();
    if (fw === '500') fontFamily = 'ClashDisplay-Medium';
    if (fw === '600') fontFamily = 'ClashDisplay-Semibold';
    if (fw === '700' || fw === '800' || fw === '900' || fw === 'bold') fontFamily = 'ClashDisplay-Bold';
  }

  return (
    <RNText
      {...props}
      style={[{ fontFamily }, style]}
    />
  );
}
