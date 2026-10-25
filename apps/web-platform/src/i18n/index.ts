import en from './en.json';
import sw from './sw.json';

export type Language = 'en' | 'sw';

const translations: Record<Language, Record<string, string>> = { en, sw };

let currentLanguage: Language = 'en';
let listeners: (() => void)[] = [];

// Load saved language on init
const saved = localStorage.getItem('safiri_language');
if (saved === 'en' || saved === 'sw') {
  currentLanguage = saved;
}

export const i18n = {
  t(key: string): string {
    return translations[currentLanguage][key] || translations['en'][key] || key;
  },

  getLanguage(): Language {
    return currentLanguage;
  },

  setLanguage(lang: Language) {
    currentLanguage = lang;
    localStorage.setItem('safiri_language', lang);
    listeners.forEach(fn => fn());
  },

  subscribe(fn: () => void) {
    listeners.push(fn);
    return () => { listeners = listeners.filter(l => l !== fn); };
  },
};

export default i18n;
