import React, { ReactNode } from 'react';
import i18n from 'i18next';
import { initReactI18next, I18nextProvider } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from './locales/en.json';
import sw from './locales/sw.json';

const LANGUAGE_KEY = '@dalasmart:language';

i18n
  .use(initReactI18next)
  .init({
    compatibilityJSON: 'v3',
    resources: {
      en: { translation: en },
      sw: { translation: sw },
    },
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

// Load saved language preference
AsyncStorage.getItem(LANGUAGE_KEY).then((language) => {
  if (language) {
    i18n.changeLanguage(language);
  }
});

// Save language changes
i18n.on('languageChanged', (lng) => {
  AsyncStorage.setItem(LANGUAGE_KEY, lng);
});

export const I18nProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>;
};

export default i18n;
