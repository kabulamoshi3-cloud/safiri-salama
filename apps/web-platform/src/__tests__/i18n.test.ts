/**
 * Unit tests for i18n system
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { i18n } from '../i18n';

describe('i18n system', () => {
  beforeEach(() => {
    localStorage.clear();
    i18n.setLanguage('en');
  });

  it('returns English translation by default', () => {
    expect(i18n.t('app_name')).toBe('SkyRex');
  });

  it('returns Kiswahili translation when language is sw', () => {
    i18n.setLanguage('sw');
    expect(i18n.t('login')).toBeTruthy();
    expect(i18n.getLanguage()).toBe('sw');
  });

  it('falls back to English if key missing in sw', () => {
    i18n.setLanguage('sw');
    const val = i18n.t('app_name');
    expect(val).toBe('SkyRex');
  });

  it('returns the key itself if not found in any language', () => {
    const val = i18n.t('nonexistent.key.xyz');
    expect(val).toBe('nonexistent.key.xyz');
  });

  it('persists language to localStorage', () => {
    i18n.setLanguage('sw');
    expect(localStorage.getItem('safiri_language')).toBe('sw');
  });

  it('subscribes and notifies on language change', () => {
    let called = 0;
    const unsub = i18n.subscribe(() => called++);
    i18n.setLanguage('sw');
    expect(called).toBe(1);
    i18n.setLanguage('en');
    expect(called).toBe(2);
    unsub();
    i18n.setLanguage('sw');
    expect(called).toBe(2); // unsubscribed, no more calls
  });

  it('has all required keys', () => {
    const required = [
      'app_name', 'login', 'sign_up', 'password', 'phone_number',
      'full_name', 'welcome_back', 'create_account', 'logout',
    ];
    required.forEach(key => {
      expect(i18n.t(key)).not.toBe(key); // key should resolve to a real string
    });
  });
});
