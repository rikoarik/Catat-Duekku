import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StringKey, strings } from '@/core/i18n/strings';

export type LanguageCode = 'id' | 'en';

const LANGUAGE_STORAGE_KEY = '@catat_duekku/language_code';

interface LanguageContextType {
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => Promise<void>;
  t: (key: StringKey) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'id',
  setLanguage: async () => {},
  t: (key: StringKey) => {
    const [section, name] = key.split('.') as [keyof typeof strings.id, string];
    return (strings.id[section] as any)?.[name] ?? key;
  },
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<LanguageCode>('id');

  useEffect(() => {
    const loadSavedLanguage = async () => {
      try {
        const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (saved === 'id' || saved === 'en') {
          setLanguageState(saved);
        }
      } catch (error) {
        console.error('Failed to load language preference:', error);
      }
    };
    loadSavedLanguage();
  }, []);

  const setLanguage = async (newLang: LanguageCode) => {
    setLanguageState(newLang);
    try {
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, newLang);
    } catch (error) {
      console.error('Failed to save language preference:', error);
    }
  };

  const translate = (key: StringKey): string => {
    const dict = strings[language] || strings.id;
    const [section, name] = key.split('.') as [keyof typeof dict, string];
    return (dict[section] as any)?.[name] ?? key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t: translate }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
