import { Text } from '@/components/ui/text';
import React from 'react';
import { StyleSheet, TouchableOpacity, TouchableOpacityProps, useColorScheme, ViewStyle, TextStyle } from 'react-native';
;
import { getTheme } from '@/core/theme/colors';

export interface ButtonProps extends TouchableOpacityProps {
  title: string;
  variant?: 'primary' | 'secondary' | 'dark' | 'outline' | 'lime';
  size?: 'small' | 'medium' | 'large';
  icon?: React.ReactNode;
  textStyle?: TextStyle;
}

export function Button({
  title,
  variant = 'primary',
  size = 'medium',
  icon,
  style,
  textStyle,
  disabled,
  ...props
}: ButtonProps) {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);

  const getButtonStyle = (): ViewStyle => {
    let bg: string = theme.deepTeal;
    let border: string = 'transparent';

    switch (variant) {
      case 'lime':
        bg = theme.softLime;
        break;
      case 'secondary':
        bg = theme.surfaceElement;
        break;
      case 'dark':
        bg = theme.darkSurfaceStrong;
        break;
      case 'outline':
        bg = 'transparent';
        border = theme.border;
        break;
      default:
        bg = theme.deepTeal;
        break;
    }

    let paddingVertical = 12;
    let paddingHorizontal = 20;

    if (size === 'small') {
      paddingVertical = 8;
      paddingHorizontal = 14;
    } else if (size === 'large') {
      paddingVertical = 16;
      paddingHorizontal = 24;
    }

    return {
      backgroundColor: bg,
      borderColor: border,
      borderWidth: variant === 'outline' ? 1.5 : 0,
      paddingVertical,
      paddingHorizontal,
      borderRadius: 100, // Pill shape
      opacity: disabled ? 0.6 : 1,
    };
  };

  const getTextStyle = (): TextStyle => {
    let color: string = theme.onSurfaceStrong;

    if (variant === 'lime') {
      color = theme.deepTeal;
    } else if (variant === 'secondary') {
      color = theme.deepTeal;
    } else if (variant === 'outline') {
      color = theme.textPrimary;
    }

    let fontSize = 15;
    if (size === 'small') fontSize = 13;
    if (size === 'large') fontSize = 17;

    return {
      color,
      fontSize,
      fontWeight: '600',
    };
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={disabled}
      style={[styles.button, getButtonStyle(), style]}
      {...props}>
      {icon}
      <Text style={[getTextStyle(), textStyle]}>{title}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
});
