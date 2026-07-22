import React from 'react';
import { StyleSheet, View, ViewProps, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Colors, getTheme } from '@/core/theme/colors';

export interface ScreenWrapperProps extends ViewProps {
  bgVariant?: 'background' | 'surface' | 'teal';
  withSafeArea?: boolean;
}

export function ScreenWrapper({
  children,
  style,
  bgVariant = 'background',
  withSafeArea = true,
  ...props
}: ScreenWrapperProps) {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);

  const getBackgroundColor = () => {
    switch (bgVariant) {
      case 'surface':
        return theme.surfaceElement;
      case 'teal':
        return theme.deepTeal;
      default:
        return theme.background;
    }
  };

  const content = (
    <View style={[styles.content, { backgroundColor: getBackgroundColor() }, style]} {...props}>
      {children}
    </View>
  );

  return (
    <>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      {withSafeArea ? (
        <SafeAreaView style={[styles.container, { backgroundColor: getBackgroundColor() }]}>
          {content}
        </SafeAreaView>
      ) : (
        content
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
});
