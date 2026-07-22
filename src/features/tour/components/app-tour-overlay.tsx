import React from 'react';
import {
  Dimensions,
  Modal,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
  useColorScheme,
} from 'react-native';

import { TourTooltipCard } from './tour-tooltip-card';
import { getTheme } from '@/core/theme/colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export interface TargetRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface AppTourOverlayProps {
  visible: boolean;
  currentStep: number;
  totalSteps: number;
  title: string;
  description: string;
  targetRect?: TargetRect | null;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}

export function AppTourOverlay({
  visible,
  currentStep,
  totalSteps,
  title,
  description,
  targetRect,
  onNext,
  onPrev,
  onSkip,
}: AppTourOverlayProps) {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);
  const isDark = colorScheme === 'dark';

  if (!visible) return null;

  // Calculate Tooltip position based on targetRect
  const padding = 8;
  const spotX = targetRect ? Math.max(8, targetRect.x - padding) : 0;
  const spotY = targetRect ? Math.max(8, targetRect.y - padding) : 0;
  const spotW = targetRect ? Math.min(SCREEN_WIDTH - 16, targetRect.width + padding * 2) : 0;
  const spotH = targetRect ? targetRect.height + padding * 2 : 0;

  const showAbove = targetRect ? spotY > SCREEN_HEIGHT / 2 : false;

  const tooltipStyle = targetRect
    ? showAbove
      ? { bottom: SCREEN_HEIGHT - spotY + 12 }
      : { top: spotY + spotH + 12 }
    : { top: SCREEN_HEIGHT / 2 - 120 };

  return (
    <Modal animationType="fade" hardwareAccelerated transparent visible={visible} onRequestClose={onSkip}>
      <View style={styles.fullscreenContainer}>
        {/* Dark Dimmed Backdrop */}
        <TouchableWithoutFeedback onPress={() => {}}>
          <View style={styles.backdropOverlay} />
        </TouchableWithoutFeedback>

        {/* Spotlight Cutout Glow */}
        {targetRect && spotW > 0 && spotH > 0 && (
          <View
            style={[
              styles.spotlightHighlight,
              {
                left: spotX,
                top: spotY,
                width: spotW,
                height: spotH,
                borderColor: theme.accent,
                backgroundColor: isDark ? 'rgba(188, 235, 130, 0.08)' : 'rgba(255, 255, 255, 0.25)',
              },
            ]}
          />
        )}

        {/* Floating Tooltip Card */}
        <View style={[styles.tooltipCardContainer, tooltipStyle]}>
          <TourTooltipCard
            currentStep={currentStep}
            description={description}
            title={title}
            totalSteps={totalSteps}
            onNext={onNext}
            onPrev={onPrev}
            onSkip={onSkip}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fullscreenContainer: {
    flex: 1,
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
  },
  backdropOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(7, 36, 35, 0.78)',
  },
  spotlightHighlight: {
    position: 'absolute',
    borderRadius: 20,
    borderWidth: 2.5,
    shadowColor: '#BCEB82',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 8,
  },
  tooltipCardContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
});
