import { AccessibilityInfo, Platform, useWindowDimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type AccessibilityFeature = 
  | 'screen_reader'
  | 'high_contrast'
  | 'large_text'
  | 'reduce_motion'
  | 'haptic_feedback'
  | 'voice_control';

export interface AccessibilitySettings {
  features: Set<AccessibilityFeature>;
  textSize: 'small' | 'medium' | 'large' | 'extra_large';
  highContrast: boolean;
  reduceMotion: boolean;
  hapticFeedback: boolean;
  screenReaderEnabled: boolean;
  voiceControlEnabled: boolean;
}

export interface AccessibilityAudit {
  wcagLevel: 'A' | 'AA' | 'AAA';
  issues: AccessibilityIssue[];
  score: number; // 0-100
  timestamp: Date;
}

export interface AccessibilityIssue {
  id: string;
  level: 'critical' | 'major' | 'minor';
  type: string;
  description: string;
  element: string;
  suggestion: string;
  wcagCriteria: string;
}

class AccessibilityServiceClass {
  private settings: AccessibilitySettings = {
    features: new Set(),
    textSize: 'medium',
    highContrast: false,
    reduceMotion: false,
    hapticFeedback: true,
    screenReaderEnabled: false,
    voiceControlEnabled: false,
  };

  private readonly SETTINGS_KEY = '@dalasmart:accessibility_settings';

  async initialize(): Promise<void> {
    try {
      // Load saved settings
      const saved = await AsyncStorage.getItem(this.SETTINGS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        this.settings = {
          ...this.settings,
          ...parsed,
          features: new Set(parsed.features || []),
        };
      }

      // Check system accessibility settings
      await this.checkSystemSettings();

      console.log('AccessibilityService initialized');
    } catch (error) {
      console.error('AccessibilityService initialization error:', error);
    }
  }

  private async checkSystemSettings(): Promise<void> {
    try {
      if (Platform.OS === 'android') {
        const screenReaderEnabled = await AccessibilityInfo.isScreenReaderEnabled();
        this.settings.screenReaderEnabled = screenReaderEnabled;
      } else if (Platform.OS === 'ios') {
        const screenReaderEnabled = await AccessibilityInfo.isScreenReaderEnabled();
        this.settings.screenReaderEnabled = screenReaderEnabled;
      }
    } catch (error) {
      console.error('Failed to check system accessibility settings:', error);
    }
  }

  async enableFeature(feature: AccessibilityFeature): Promise<void> {
    this.settings.features.add(feature);
    await this.persistSettings();
  }

  async disableFeature(feature: AccessibilityFeature): Promise<void> {
    this.settings.features.delete(feature);
    await this.persistSettings();
  }

  isFeatureEnabled(feature: AccessibilityFeature): boolean {
    return this.settings.features.has(feature);
  }

  async setTextSize(size: 'small' | 'medium' | 'large' | 'extra_large'): Promise<void> {
    this.settings.textSize = size;
    await this.persistSettings();
  }

  getTextScale(): number {
    const scales: Record<string, number> = {
      small: 0.85,
      medium: 1.0,
      large: 1.2,
      extra_large: 1.5,
    };
    return scales[this.settings.textSize];
  }

  async setHighContrast(enabled: boolean): Promise<void> {
    this.settings.highContrast = enabled;
    await this.persistSettings();
  }

  isHighContrastEnabled(): boolean {
    return this.settings.highContrast;
  }

  async setReduceMotion(enabled: boolean): Promise<void> {
    this.settings.reduceMotion = enabled;
    await this.persistSettings();
  }

  isReduceMotionEnabled(): boolean {
    return this.settings.reduceMotion;
  }

  async setHapticFeedback(enabled: boolean): Promise<void> {
    this.settings.hapticFeedback = enabled;
    await this.persistSettings();
  }

  isHapticFeedbackEnabled(): boolean {
    return this.settings.hapticFeedback;
  }

  getSettings(): AccessibilitySettings {
    return {
      ...this.settings,
      features: new Set(this.settings.features),
    };
  }

  getColorScheme(): { background: string; text: string; accent: string } {
    if (this.settings.highContrast) {
      return {
        background: '#000000',
        text: '#FFFFFF',
        accent: '#FFFF00',
      };
    }

    return {
      background: '#FFFFFF',
      text: '#000000',
      accent: '#007AFF',
    };
  }

  // Announce text for screen readers
  async announce(message: string): Promise<void> {
    try {
      if (this.settings.screenReaderEnabled) {
        await AccessibilityInfo.announceForAccessibility(message);
      }
    } catch (error) {
      console.error('Failed to announce message:', error);
    }
  }

  // Set accessibility label for views
  getAccessibilityLabel(label: string): string {
    return label;
  }

  // Format text for better readability
  formatAccessibleText(text: string): string {
    // Expand abbreviations
    const expansions: Record<string, string> = {
      ETA: 'estimated time of arrival',
      TSh: 'Tanzanian shillings',
      KES: 'Kenyan shillings',
      USD: 'US dollars',
    };

    let formatted = text;
    Object.entries(expansions).forEach(([abbr, expansion]) => {
      formatted = formatted.replace(new RegExp(`\\b${abbr}\\b`, 'gi'), expansion);
    });

    return formatted;
  }

  // Audit app for accessibility issues
  async performAccessibilityAudit(): Promise<AccessibilityAudit> {
    try {
      const issues: AccessibilityIssue[] = [];
      let score = 100;

      // Check 1: Color contrast
      if (!this.settings.highContrast) {
        issues.push({
          id: 'contrast-1',
          level: 'major',
          type: 'Color Contrast',
          description: 'Some text may have insufficient contrast ratio',
          element: 'Various text elements',
          suggestion: 'Enable high contrast mode or review color combinations',
          wcagCriteria: 'WCAG 2.1 Level AA - 1.4.3',
        });
        score -= 10;
      }

      // Check 2: Text size
      if (this.settings.textSize === 'small') {
        issues.push({
          id: 'text-size-1',
          level: 'minor',
          type: 'Text Size',
          description: 'Text size might be too small for some users',
          element: 'Body text',
          suggestion: 'Consider increasing default text size',
          wcagCriteria: 'WCAG 2.1 Level AA - 1.4.4',
        });
        score -= 5;
      }

      // Check 3: Screen reader support
      if (!this.settings.screenReaderEnabled) {
        issues.push({
          id: 'sr-1',
          level: 'critical',
          type: 'Screen Reader Support',
          description: 'Screen reader not enabled - essential features unavailable',
          element: 'App-wide',
          suggestion: 'Enable screen reader support in system accessibility settings',
          wcagCriteria: 'WCAG 2.1 Level A - 1.3.1',
        });
        score -= 20;
      }

      // Check 4: Keyboard navigation
      issues.push({
        id: 'kb-1',
        level: 'major',
        type: 'Keyboard Navigation',
        description: 'All interactive elements must be keyboard accessible',
        element: 'Interactive components',
        suggestion: 'Ensure all buttons/links have proper keyboard focus indicators',
        wcagCriteria: 'WCAG 2.1 Level A - 2.1.1',
      });
      score -= 5;

      score = Math.max(0, score);

      return {
        wcagLevel: score >= 90 ? 'AAA' : score >= 80 ? 'AA' : 'A',
        issues,
        score,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Failed to perform accessibility audit:', error);
      throw error;
    }
  }

  // Get recommendations for accessibility improvements
  getAccessibilityRecommendations(): string[] {
    const recommendations: string[] = [];

    if (!this.settings.highContrast) {
      recommendations.push('Enable high contrast mode for better visibility');
    }

    if (this.settings.textSize === 'small') {
      recommendations.push('Consider increasing text size for better readability');
    }

    if (!this.settings.hapticFeedback) {
      recommendations.push('Enable haptic feedback for better user feedback');
    }

    if (this.settings.reduceMotion) {
      recommendations.push('Animations are reduced - enable for enhanced UI experience');
    }

    return recommendations;
  }

  private async persistSettings(): Promise<void> {
    try {
      const settingsToSave = {
        ...this.settings,
        features: Array.from(this.settings.features),
      };
      await AsyncStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settingsToSave));
    } catch (error) {
      console.error('Failed to persist accessibility settings:', error);
    }
  }

  // Reset to default settings
  async resetToDefaults(): Promise<void> {
    this.settings = {
      features: new Set(),
      textSize: 'medium',
      highContrast: false,
      reduceMotion: false,
      hapticFeedback: true,
      screenReaderEnabled: false,
      voiceControlEnabled: false,
    };
    await this.persistSettings();
  }
}

export const AccessibilityService = new AccessibilityServiceClass();
