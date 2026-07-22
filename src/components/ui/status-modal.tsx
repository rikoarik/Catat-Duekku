import { Text } from '@/components/ui/text';
import React, { useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, Modal, useColorScheme } from 'react-native';
;
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { TickCircle, CloseCircle } from 'iconsax-react-native';
import { getTheme } from '@/core/theme/colors';

export interface StatusModalProps {
  visible: boolean;
  type: 'success' | 'error';
  title: string;
  message: string;
  buttonText?: string;
  onConfirm: () => void;
  onClose?: () => void;
}

export function StatusModal({
  visible,
  type,
  title,
  message,
  buttonText = 'Lanjutkan',
  onConfirm,
  onClose,
}: StatusModalProps) {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);

  // Animated shared values
  const scale = useSharedValue(0.7);
  const opacity = useSharedValue(0);
  const iconScale = useSharedValue(0.5);

  useEffect(() => {
    if (visible) {
      opacity.value = withTiming(1, { duration: 250 });
      scale.value = withSpring(1, { damping: 15, stiffness: 150 });
      iconScale.value = withSpring(1, { damping: 10, stiffness: 120 });
    } else {
      opacity.value = withTiming(0, { duration: 200 });
      scale.value = withTiming(0.8, { duration: 200 });
      iconScale.value = 0.5;
    }
  }, [visible]);

  const modalAnimatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  const iconAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  if (!visible) return null;

  const isSuccess = type === 'success';
  const iconColor = isSuccess ? '#22C55E' : '#FF6B6B';
  const badgeBg = isSuccess ? 'rgba(34, 197, 94, 0.12)' : 'rgba(255, 107, 107, 0.12)';

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <Animated.View
          style={[
            styles.dialogCard,
            { backgroundColor: theme.surface, borderColor: theme.border },
            modalAnimatedStyle,
          ]}>
          {/* Animated Icon Badge */}
          <View style={[styles.iconBadge, { backgroundColor: badgeBg }]}>
            <Animated.View style={iconAnimatedStyle}>
              {isSuccess ? (
                <TickCircle color={iconColor} size={54} variant="Bold" />
              ) : (
                <CloseCircle color={iconColor} size={54} variant="Bold" />
              )}
            </Animated.View>
          </View>

          {/* Title & Message */}
          <Text style={[styles.dialogTitle, { color: theme.textPrimary }]}>
            {title}
          </Text>

          <Text style={[styles.dialogMessage, { color: theme.textMuted }]}>
            {message}
          </Text>

          {/* Action Button */}
          <TouchableOpacity
            activeOpacity={0.85}
            style={[
              styles.actionBtn,
              { backgroundColor: isSuccess ? theme.primary : '#FF6B6B' },
            ]}
            onPress={onConfirm}>
            <Text style={styles.actionBtnText}>{buttonText}</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(7, 32, 31, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 28,
  },
  dialogCard: {
    width: '100%',
    borderRadius: 28,
    padding: 28,
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  iconBadge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  dialogTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    textAlign: 'center',
    marginBottom: 8,
  },
  dialogMessage: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
    marginBottom: 24,
  },
  actionBtn: {
    width: '100%',
    height: 52,
    borderRadius: 100,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 3,
  },
  actionBtnText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
