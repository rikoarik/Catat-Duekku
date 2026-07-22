import { Text } from '@/components/ui/text';
import React, { useState } from 'react';
import { StyleSheet, TextInput, TextInputProps, TouchableOpacity, View, useColorScheme } from 'react-native';
;
import { Eye, EyeSlash } from 'iconsax-react-native';
import { Colors, getTheme } from '@/core/theme/colors';

export interface InputProps extends TextInputProps {
  label?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  error?: string;
  isPassword?: boolean;
}

export function Input({
  label,
  leftIcon,
  rightIcon,
  error,
  isPassword = false,
  style,
  ...props
}: InputProps) {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);
  const [secureText, setSecureText] = useState(isPassword);
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={styles.container}>
      {label && (
        <Text style={[styles.label, { color: theme.textPrimary }]}>{label}</Text>
      )}
      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: theme.surfaceElement,
            borderColor: error
              ? theme.expense
              : isFocused
              ? theme.deepTeal
              : theme.border,
            borderWidth: isFocused ? 1.5 : 1,
          },
        ]}>
        {leftIcon && <View style={styles.leftIconContainer}>{leftIcon}</View>}
        <TextInput
          placeholderTextColor={theme.textMuted}
          secureTextEntry={secureText}
          style={[
            styles.input,
            { color: theme.textPrimary },
            leftIcon ? { paddingLeft: 6 } : null,
            style,
          ]}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          {...props}
        />
        {isPassword ? (
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.rightIconContainer}
            onPress={() => setSecureText(!secureText)}>
            {secureText ? (
              <EyeSlash color={theme.textMuted} size={20} variant="Outline" />
            ) : (
              <Eye color={theme.deepTeal} size={20} variant="Outline" />
            )}
          </TouchableOpacity>
        ) : (
          rightIcon && <View style={styles.rightIconContainer}>{rightIcon}</View>
        )}
      </View>
      {error && <Text style={[styles.errorText, { color: theme.expense }]}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 6,
    width: '100%',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    paddingHorizontal: 16,
    height: 56,
  },
  leftIconContainer: {
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightIconContainer: {
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: 15,
    height: '100%',
  },
  errorText: {
    fontSize: 12,
    marginTop: 2,
  },
});
