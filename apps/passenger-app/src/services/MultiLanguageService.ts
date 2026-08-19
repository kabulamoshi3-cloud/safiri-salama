import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as RNLocalize from 'react-native-localize';

export type SupportedLanguage = 'en' | 'sw' | 'fr' | 'ar' | 'pt';

export interface LanguageConfig {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  direction: 'ltr' | 'rtl';
  enabled: boolean;
}

export interface MessageTranslation {
  original: string;
  language: SupportedLanguage;
  translation: string;
  confidence: number; // 0-1
  timestamp: Date;
}

class MultiLanguageServiceClass {
  private currentLanguage: SupportedLanguage = 'en';
  private supportedLanguages: LanguageConfig[] = [
    {
      code: 'en',
      name: 'English',
      nativeName: 'English',
      direction: 'ltr',
      enabled: true,
    },
    {
      code: 'sw',
      name: 'Swahili',
      nativeName: 'Kiswahili',
      direction: 'ltr',
      enabled: true,
    },
    {
      code: 'fr',
      name: 'French',
      nativeName: 'Français',
      direction: 'ltr',
      enabled: true,
    },
    {
      code: 'ar',
      name: 'Arabic',
      nativeName: 'العربية',
      direction: 'rtl',
      enabled: false, // To be implemented
    },
    {
      code: 'pt',
      name: 'Portuguese',
      nativeName: 'Português',
      direction: 'ltr',
      enabled: false, // To be implemented
    },
  ];

  private messageCache: Map<string, MessageTranslation[]> = new Map();
  private readonly STORAGE_KEY = '@dalasmart:message_translations';

  async initialize(): Promise<void> {
    try {
      // Detect system language
      const locales = RNLocalize.getLocales();
      const systemLanguage = this.mapLanguageCode(locales[0].languageCode);

      // Load saved preference
      const savedLanguage = await AsyncStorage.getItem('@dalasmart:language');
      this.currentLanguage = (savedLanguage as SupportedLanguage) || systemLanguage;

      // Initialize i18n
      await i18n.use(initReactI18next).init({
        resources: this.getTranslationResources(),
        lng: this.currentLanguage,
        fallbackLng: 'en',
        interpolation: { escapeValue: false },
      });

      console.log(`MultiLanguageService initialized with language: ${this.currentLanguage}`);
    } catch (error) {
      console.error('MultiLanguageService initialization error:', error);
    }
  }

  private mapLanguageCode(locale: string): SupportedLanguage {
    const mapping: Record<string, SupportedLanguage> = {
      en: 'en',
      sw: 'sw',
      fr: 'fr',
      ar: 'ar',
      pt: 'pt',
    };

    return mapping[locale] || 'en';
  }

  private getTranslationResources() {
    return {
      en: { translation: require('../../i18n/locales/en.json') },
      sw: { translation: require('../../i18n/locales/sw.json') },
      fr: { translation: require('../../i18n/locales/fr.json') },
    };
  }

  async setLanguage(language: SupportedLanguage): Promise<void> {
    try {
      if (!this.isLanguageSupported(language)) {
        throw new Error(`Language ${language} is not supported`);
      }

      await i18n.changeLanguage(language);
      await AsyncStorage.setItem('@dalasmart:language', language);
      this.currentLanguage = language;

      console.log(`Language changed to: ${language}`);
    } catch (error) {
      console.error('Failed to set language:', error);
      throw error;
    }
  }

  getCurrentLanguage(): SupportedLanguage {
    return this.currentLanguage;
  }

  getLanguageDirection(): 'ltr' | 'rtl' {
    const config = this.supportedLanguages.find(l => l.code === this.currentLanguage);
    return config?.direction || 'ltr';
  }

  getSupportedLanguages(): LanguageConfig[] {
    return this.supportedLanguages.filter(l => l.enabled);
  }

  isLanguageSupported(language: SupportedLanguage): boolean {
    return this.supportedLanguages.some(l => l.code === language && l.enabled);
  }

  async translateMessage(
    message: string,
    targetLanguage?: SupportedLanguage,
    fromLanguage: SupportedLanguage = 'en'
  ): Promise<MessageTranslation> {
    const target = targetLanguage || this.currentLanguage;

    try {
      // Check cache first
      const cacheKey = `${message}-${fromLanguage}-${target}`;
      const cached = this.messageCache.get(cacheKey);
      if (cached && cached.length > 0) {
        return cached[0];
      }

      // Translate via backend API
      const translation = await this.callTranslationAPI(message, fromLanguage, target);

      // Cache result
      if (!this.messageCache.has(cacheKey)) {
        this.messageCache.set(cacheKey, []);
      }
      this.messageCache.get(cacheKey)!.push(translation);

      // Persist to storage
      await this.persistTranslation(translation);

      return translation;
    } catch (error) {
      console.error('Failed to translate message:', error);
      // Return original message if translation fails
      return {
        original: message,
        language: target,
        translation: message,
        confidence: 0,
        timestamp: new Date(),
      };
    }
  }

  private async callTranslationAPI(
    message: string,
    fromLanguage: SupportedLanguage,
    toLanguage: SupportedLanguage
  ): Promise<MessageTranslation> {
    try {
      const response = await fetch('https://api.dalasmart.app/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: message,
          sourceLanguage: fromLanguage,
          targetLanguage: toLanguage,
        }),
      });

      const data = await response.json();

      return {
        original: message,
        language: toLanguage,
        translation: data.translatedText,
        confidence: data.confidence || 0.95,
        timestamp: new Date(),
      };
    } catch (error) {
      throw error;
    }
  }

  async batchTranslateMessages(
    messages: string[],
    targetLanguage?: SupportedLanguage
  ): Promise<MessageTranslation[]> {
    return Promise.all(
      messages.map(msg => this.translateMessage(msg, targetLanguage))
    );
  }

  async getLanguageStats(): Promise<{
    primaryLanguage: SupportedLanguage;
    messageCount: Record<SupportedLanguage, number>;
    lastUsed: Record<SupportedLanguage, Date>;
  }> {
    try {
      return await fetch('https://api.dalasmart.app/language-stats')
        .then(r => r.json());
    } catch (error) {
      console.error('Failed to get language stats:', error);
      return {
        primaryLanguage: this.currentLanguage,
        messageCount: {} as any,
        lastUsed: {} as any,
      };
    }
  }

  private async persistTranslation(translation: MessageTranslation): Promise<void> {
    try {
      const saved = await AsyncStorage.getItem(this.STORAGE_KEY);
      const translations = saved ? JSON.parse(saved) : [];

      translations.push(translation);

      // Keep only last 500 translations
      if (translations.length > 500) {
        translations.shift();
      }

      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(translations));
    } catch (error) {
      console.error('Failed to persist translation:', error);
    }
  }

  async clearTranslationCache(): Promise<void> {
    try {
      this.messageCache.clear();
      await AsyncStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear translation cache:', error);
    }
  }

  formatDate(date: Date, language?: SupportedLanguage): string {
    const lang = language || this.currentLanguage;
    return new Intl.DateTimeFormat(this.getLocaleCode(lang)).format(date);
  }

  formatCurrency(amount: number, language?: SupportedLanguage): string {
    const lang = language || this.currentLanguage;
    const currency = this.getCurrency(lang);
    return new Intl.NumberFormat(this.getLocaleCode(lang), {
      style: 'currency',
      currency,
    }).format(amount);
  }

  formatNumber(number: number, language?: SupportedLanguage): string {
    const lang = language || this.currentLanguage;
    return new Intl.NumberFormat(this.getLocaleCode(lang)).format(number);
  }

  private getLocaleCode(language: SupportedLanguage): string {
    const mapping: Record<SupportedLanguage, string> = {
      en: 'en-US',
      sw: 'sw-TZ',
      fr: 'fr-FR',
      ar: 'ar-SA',
      pt: 'pt-BR',
    };
    return mapping[language];
  }

  private getCurrency(language: SupportedLanguage): string {
    const mapping: Record<SupportedLanguage, string> = {
      en: 'USD',
      sw: 'TZS',
      fr: 'EUR',
      ar: 'AED',
      pt: 'BRL',
    };
    return mapping[language];
  }

  async requestNewLanguageSupport(language: string): Promise<void> {
    try {
      await fetch('https://api.dalasmart.app/language-request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language }),
      });
    } catch (error) {
      console.error('Failed to request language support:', error);
    }
  }
}

export const MultiLanguageService = new MultiLanguageServiceClass();
