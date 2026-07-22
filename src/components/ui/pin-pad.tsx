import { Text } from '@/components/ui/text';
import React from 'react';
import { View, TouchableOpacity, StyleSheet, useColorScheme } from 'react-native';
;
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { CloseCircle, FingerScan } from 'iconsax-react-native';
import { getTheme } from '@/core/theme/colors';

interface PinPadProps {
  onPress: (digit: string) => void;
  onDelete: () => void;
  onBiometric?: () => void;
  disabled?: boolean;
}

const BUTTONS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', 'del'],
];

export function PinPad({ onPress, onDelete, onBiometric, disabled = false }: PinPadProps) {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);
  const isDark = colorScheme === 'dark';

  return (
    <View style={styles.grid}>
      {BUTTONS.map((row, rowIdx) => (
        <React.Fragment key={rowIdx}>
          <View style={styles.row}>
            {row.map((key, colIdx) => {
              if (key === '') {
                // Show fingerprint/biometric button if handler provided, else empty space
                if (onBiometric) {
                  return (
                    <React.Fragment key={colIdx}>
                      <PinKey
                        disabled={disabled}
                        primaryColor={theme.primary}
                        bgColor={isDark ? theme.surfaceMuted : '#F4F5F7'}
                        onPress={onBiometric}>
                        <FingerScan color={theme.textPrimary} size={22} variant="Outline" />
                      </PinKey>
                    </React.Fragment>
                  );
                }
                return (
                  <React.Fragment key={colIdx}>
                    <View style={styles.emptyKey} />
                  </React.Fragment>
                );
              }

              if (key === 'del') {
                return (
                  <React.Fragment key={colIdx}>
                    <PinKey
                      disabled={disabled}
                      primaryColor={theme.primary}
                      bgColor={isDark ? theme.surfaceMuted : '#F4F5F7'}
                      onPress={onDelete}>
                      <CloseCircle color={theme.textPrimary} size={22} variant="Outline" />
                    </PinKey>
                  </React.Fragment>
                );
              }

              return (
                <React.Fragment key={colIdx}>
                  <PinKey
                    disabled={disabled}
                    primaryColor={theme.primary}
                    bgColor={isDark ? theme.surfaceMuted : '#F4F5F7'}
                    onPress={() => onPress(key)}>
                    <Text style={[styles.keyText, { color: theme.textPrimary }]}>{key}</Text>
                  </PinKey>
                </React.Fragment>
              );
            })}
          </View>
        </React.Fragment>
      ))}
    </View>
  );
}

interface PinKeyProps {
  children: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
  primaryColor: string;
  bgColor: string;
}

function PinKey({ children, onPress, disabled, bgColor }: PinKeyProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    if (disabled) return;
    scale.value = withSequence(
      withTiming(0.88, { duration: 70 }),
      withSpring(1, { damping: 10, stiffness: 220 })
    );
    onPress();
  };

  return (
    <TouchableOpacity
      activeOpacity={1}
      disabled={disabled}
      style={styles.keyWrapper}
      onPress={handlePress}>
      <Animated.View style={[styles.key, { backgroundColor: bgColor }, animatedStyle]}>
        {children}
      </Animated.View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  grid: {
    gap: 14,
    paddingHorizontal: 24,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 14,
  },
  keyWrapper: {
    flex: 1,
    aspectRatio: 1.5,
  },
  key: {
    flex: 1,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyText: {
    fontSize: 22,
    fontWeight: '600',
  },
  emptyKey: {
    flex: 1,
    aspectRatio: 1.5,
  },
});
