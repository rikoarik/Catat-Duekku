import React from 'react';
import { Modal, StyleSheet, TouchableOpacity, View, useColorScheme } from 'react-native';
import Animated, { FadeIn, SlideInDown } from 'react-native-reanimated';
import { TickCircle, CloseSquare } from 'iconsax-react-native';

import { Text } from '@/components/ui/text';
import { LanguageCode, useLanguage } from '@/core/i18n/language-context';
import { getTheme } from '@/core/theme/colors';

export interface LanguageBottomSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function LanguageBottomSheet({ visible, onClose }: LanguageBottomSheetProps) {
  const colorScheme = useColorScheme();
  const theme = getTheme(colorScheme);
  const { language, setLanguage, t } = useLanguage();

  if (!visible) return null;

  const handleSelect = (lang: LanguageCode) => {
    setLanguage(lang);
    onClose();
  };

  const languages: { code: LanguageCode; label: string; flag: string; nativeName: string }[] = [
    {
      code: 'id',
      label: t('profile.languageIndonesian'),
      flag: '🇮🇩',
      nativeName: 'Bahasa Indonesia',
    },
    {
      code: 'en',
      label: t('profile.languageEnglish'),
      flag: '🇬🇧',
      nativeName: 'English',
    },
  ];

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <View style={styles.overlayContainer}>
        <Animated.View entering={FadeIn.duration(200)} style={styles.backdrop}>
          <TouchableOpacity activeOpacity={1} style={styles.backdropTouchable} onPress={onClose} />
        </Animated.View>

        <Animated.View
          entering={SlideInDown.duration(300)}
          style={[styles.sheetContainer, { backgroundColor: theme.surface }]}
        >
          <View style={styles.handleBar} />

          <View style={styles.headerRow}>
            <View>
              <Text style={[styles.sheetTitle, { color: theme.textPrimary }]} weight="bold">
                {t('profile.languageLabel')}
              </Text>
              <Text style={[styles.sheetSubtitle, { color: theme.textMuted }]}>
                {t('profile.languageDescription')}
              </Text>
            </View>
            <TouchableOpacity activeOpacity={0.7} onPress={onClose} style={styles.closeBtn}>
              <CloseSquare color={theme.textMuted} size={24} variant="Outline" />
            </TouchableOpacity>
          </View>

          <View style={styles.optionsList}>
            {languages.map((item) => {
              const isSelected = language === item.code;
              return (
                <TouchableOpacity
                  key={item.code}
                  activeOpacity={0.7}
                  style={[
                    styles.optionCard,
                    {
                      backgroundColor: isSelected ? theme.surfaceElement : theme.backgroundSecondary,
                      borderColor: isSelected ? theme.primary : theme.border,
                    },
                  ]}
                  onPress={() => handleSelect(item.code)}
                >
                  <View style={styles.optionLeft}>
                    <Text style={styles.flagIcon}>{item.flag}</Text>
                    <View>
                      <Text style={[styles.optionTitle, { color: theme.textPrimary }]} weight="semibold">
                        {item.nativeName}
                      </Text>
                      <Text style={[styles.optionSub, { color: theme.textMuted }]}>
                        {item.label}
                      </Text>
                    </View>
                  </View>

                  {isSelected && (
                    <TickCircle color={theme.primary} size={24} variant="Bold" />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlayContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(7, 32, 31, 0.45)',
  },
  backdropTouchable: {
    flex: 1,
  },
  sheetContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D1D5DB',
    alignSelf: 'center',
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  sheetTitle: {
    fontSize: 18,
  },
  sheetSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 4,
  },
  optionsList: {
    gap: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  flagIcon: {
    fontSize: 26,
  },
  optionTitle: {
    fontSize: 15,
  },
  optionSub: {
    fontSize: 12,
    marginTop: 2,
  },
});
