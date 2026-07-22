import React from 'react';
import { StyleSheet, TouchableOpacity, View, useColorScheme } from 'react-native';
import { CloseCircle, ArrowLeft2, ArrowRight2, TickCircle } from 'iconsax-react-native';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Text } from '@/components/ui/text';
import { useLanguage } from '@/core/i18n/language-context';
import { getTheme } from '@/core/theme/colors';

export interface TourTooltipCardProps {
  currentStep: number;
  totalSteps: number;
  title: string;
  description: string;
  onNext: () => void;
  onPrev: () => void;
  onSkip: () => void;
}

export function TourTooltipCard({
  currentStep,
  totalSteps,
  title,
  description,
  onNext,
  onPrev,
  onSkip,
}: TourTooltipCardProps) {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);
  const isDark = colorScheme === 'dark';
  const { t } = useLanguage();

  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;

  return (
    <Card
      borderRadius={24}
      padding={16}
      variant="default"
      style={[
        styles.container,
        {
          backgroundColor: isDark ? theme.surface : '#FFFFFF',
          borderColor: theme.border,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: isDark ? 0.4 : 0.15,
          shadowRadius: 16,
          elevation: 10,
        },
      ]}
    >
      {/* Top Header Row */}
      <View style={styles.headerRow}>
        <View style={[styles.badgePill, { backgroundColor: isDark ? theme.surfaceElement : '#E6F4F1' }]}>
          <Text style={[styles.badgeText, { color: theme.primary }]}>
            {`${currentStep + 1} ${t('tour.stepOf')} ${totalSteps}`}
          </Text>
        </View>

        <TouchableOpacity
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          style={styles.skipIconButton}
          onPress={onSkip}
        >
          <CloseCircle color={theme.textMuted} size={22} variant="Bold" />
        </TouchableOpacity>
      </View>

      {/* Main Title & Description */}
      <Text style={[styles.titleText, { color: theme.textPrimary }]}>{title}</Text>
      <Text style={[styles.descriptionText, { color: theme.textMuted }]}>{description}</Text>

      {/* Footer Navigation Action Row */}
      <View style={styles.footerRow}>
        {!isFirstStep ? (
          <TouchableOpacity
            activeOpacity={0.7}
            style={[styles.prevButton, { backgroundColor: isDark ? theme.surfaceElement : '#F4F5F7' }]}
            onPress={onPrev}
          >
            <ArrowLeft2 color={theme.textPrimary} size={16} variant="Bold" />
            <Text style={[styles.prevText, { color: theme.textPrimary }]}>{t('tour.previous')}</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity activeOpacity={0.7} style={styles.textSkipButton} onPress={onSkip}>
            <Text style={[styles.textSkipText, { color: theme.textMuted }]}>{t('tour.skip')}</Text>
          </TouchableOpacity>
        )}

        <Button
          icon={isLastStep ? <TickCircle color={theme.onPrimary} size={18} variant="Bold" /> : <ArrowRight2 color={theme.onPrimary} size={18} variant="Bold" />}
          size="small"
          title={isLastStep ? t('tour.finish') : t('tour.next')}
          variant="lime"
          onPress={onNext}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 320,
    maxWidth: '90%',
    borderWidth: 1,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgePill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 100,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  skipIconButton: {
    padding: 2,
  },
  titleText: {
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  descriptionText: {
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '400',
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  prevButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 100,
  },
  prevText: {
    fontSize: 13,
    fontWeight: '600',
  },
  textSkipButton: {
    paddingVertical: 8,
    paddingHorizontal: 6,
  },
  textSkipText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
