import React from 'react';
import { StyleSheet, View, ViewProps, useColorScheme } from 'react-native';
import { Colors, getTheme } from '@/core/theme/colors';

export interface CardProps extends ViewProps {
  variant?: 'default' | 'surface' | 'teal' | 'lime' | 'outline';
  padding?: number;
  borderRadius?: number;
}

export function Card({
  children,
  style,
  variant = 'default',
  padding = 20,
  borderRadius = 24,
  ...props
}: CardProps) {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);

  const getBackgroundColor = () => {
    switch (variant) {
      case 'teal':
        return theme.deepTeal;
      case 'lime':
        return theme.softLime;
      case 'surface':
        return theme.surfaceElement;
      case 'outline':
        return 'transparent';
      default:
        return theme.cardBackground;
    }
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: getBackgroundColor(),
          padding,
          borderRadius,
          borderWidth: variant === 'outline' ? 1 : 0,
          borderColor: theme.border,
        },
        style,
      ]}
      {...props}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    boxShadow: '0px 6px 12px rgba(15, 61, 62, 0.06)',
  },
});
