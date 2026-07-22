import React, { useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Notification, ShieldSecurity, Wallet3 } from 'iconsax-react-native';

import { ScreenWrapper } from '@/components/common/screen-wrapper';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { useLanguage } from '@/core/i18n/language-context';
import { setOnboardingCompleted } from '@/core/lib/onboarding-storage';
import { requestPushPermission } from '@/core/lib/push-notifications';
import { getTheme } from '@/core/theme/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface OnboardingStep {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  image: any;
  icon: React.ReactNode;
}

export function OnboardingScreen() {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);
  const isDark = colorScheme === 'dark';
  const { t } = useLanguage();
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [requestingPermission, setRequestingPermission] = useState(false);

  const steps: OnboardingStep[] = [
    {
      id: '1',
      title: t('onboarding.step1Title'),
      subtitle: t('onboarding.step1Subtitle'),
      description: t('onboarding.step1Description'),
      image: require('@/assets/images/onboarding_track_finance.png'),
      icon: <Wallet3 color={theme.primary} size={28} variant="Bold" />,
    },
    {
      id: '2',
      title: t('onboarding.step2Title'),
      subtitle: t('onboarding.step2Subtitle'),
      description: t('onboarding.step2Description'),
      image: require('@/assets/images/onboarding_smart_budget.png'),
      icon: <ShieldSecurity color={theme.primary} size={28} variant="Bold" />,
    },
    {
      id: '3',
      title: t('onboarding.step3Title'),
      subtitle: t('onboarding.step3Subtitle'),
      description: t('onboarding.step3Description'),
      image: require('@/assets/images/onboarding_notification_security.png'),
      icon: <Notification color={theme.primary} size={28} variant="Bold" />,
    },
  ];

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slideSize = event.nativeEvent.layoutMeasurement.width;
    const index = Math.round(event.nativeEvent.contentOffset.x / slideSize);
    if (index !== currentIndex && index >= 0 && index < steps.length) {
      setCurrentIndex(index);
    }
  };

  const handleNext = async () => {
    if (currentIndex < steps.length - 1) {
      const nextIndex = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setCurrentIndex(nextIndex);
    } else {
      await finishOnboardingWithPermission();
    }
  };

  const finishOnboardingWithPermission = async () => {
    setRequestingPermission(true);
    try {
      await requestPushPermission();
    } catch (error) {
      console.warn('Notification permission request error:', error);
    } finally {
      await setOnboardingCompleted();
      setRequestingPermission(false);
      router.replace('/auth');
    }
  };

  const handleSkip = async () => {
    await setOnboardingCompleted();
    router.replace('/auth');
  };

  const renderStepItem = ({ item }: { item: OnboardingStep }) => (
    <View style={styles.slideContainer}>
      <View style={styles.imageCardWrapper}>
        <Image contentFit="contain" source={item.image} style={styles.slideImage} />
      </View>

      <View style={styles.textSection}>
        <View style={[styles.badgePill, { backgroundColor: isDark ? theme.surfaceMuted : theme.surfaceButton }]}>
          {item.icon}
          <Text style={[styles.badgeText, { color: theme.primary }]}>{item.subtitle}</Text>
        </View>

        <Text style={[styles.titleText, { color: theme.textPrimary }]}>{item.title}</Text>

        <Text style={[styles.descriptionText, { color: theme.textMuted }]}>{item.description}</Text>
      </View>
    </View>
  );

  return (
    <ScreenWrapper withSafeArea style={{ backgroundColor: theme.background }}>
      {/* Top Header Row with Skip Button */}
      <View style={styles.headerRow}>
        <View style={styles.stepperDotsRow}>
          {steps.map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.dotIndicator,
                {
                  backgroundColor: idx === currentIndex ? theme.primary : isDark ? theme.border : '#D1E5E1',
                  width: idx === currentIndex ? 28 : 8,
                },
              ]}
            />
          ))}
        </View>

        {currentIndex < steps.length - 1 ? (
          <TouchableOpacity activeOpacity={0.7} style={styles.skipBtn} onPress={handleSkip}>
            <Text style={[styles.skipText, { color: theme.textMuted }]}>{t('onboarding.skip')}</Text>
          </TouchableOpacity>
        ) : <View style={{ width: 60 }} />}
      </View>

      {/* Main FlatList Slider */}
      <FlatList
        ref={flatListRef}
        data={steps}
        decelerationRate="fast"
        horizontal
        pagingEnabled
        renderItem={renderStepItem}
        showsHorizontalScrollIndicator={false}
        snapToInterval={SCREEN_WIDTH}
        keyExtractor={(item) => item.id}
        onScroll={handleScroll}
      />

      {/* Bottom Action Section */}
      <View style={styles.bottomSection}>
        <Button
          disabled={requestingPermission}
          size="large"
          title={
            currentIndex === steps.length - 1
              ? t('onboarding.enableNotificationsAndStart')
              : t('onboarding.next')
          }
          variant="lime"
          onPress={handleNext}
        />
      </View>
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 8 : 16,
    height: 48,
  },
  stepperDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dotIndicator: {
    height: 8,
    borderRadius: 4,
  },
  skipBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 100,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  slideContainer: {
    width: SCREEN_WIDTH,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageCardWrapper: {
    width: SCREEN_WIDTH - 48,
    height: SCREEN_WIDTH * 0.75,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  slideImage: {
    width: '100%',
    height: '100%',
  },
  textSection: {
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 12,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
    marginBottom: 4,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1,
  },
  titleText: {
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 22,
    textAlign: 'center',
    fontWeight: '400',
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === 'ios' ? 24 : 36,
  },
});
