import AsyncStorage from '@react-native-async-storage/async-storage';
import en from './en.json';
import sw from './sw.json';

export type Language = 'en' | 'sw';

const translations: Record<Language, Record<string, string>> = { en, sw };

let currentLanguage: Language = 'en';
let listeners: (() => void)[] = [];

export const i18n = {
  t(key: string): string {
    return translations[currentLanguage][key] || translations['en'][key] || key;
  },

  getLanguage(): Language {
    return currentLanguage;
  },

  async setLanguage(lang: Language) {
    currentLanguage = lang;
    await AsyncStorage.setItem('@safiriharaka:language', lang);
    listeners.forEach(fn => fn());
  },

  async loadSavedLanguage() {
    const saved = await AsyncStorage.getItem('@safiriharaka:language');
    if (saved === 'sw' || saved === 'en') {
      currentLanguage = saved;
    }
  },

  subscribe(fn: () => void) {
    listeners.push(fn);
    return () => { listeners = listeners.filter(l => l !== fn); };
  },
};

export default i18n;
