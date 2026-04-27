import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { I18nManager } from 'react-native';
import { initReactI18next } from 'react-i18next';

import ar from './locales/ar.json';
import en from './locales/en.json';
import fr from './locales/fr.json';
import sw from './locales/sw.json';

export const SUPPORTED_LANGUAGES = ['ar', 'en', 'es', 'fr', 'sw'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/** Languages that are written right-to-left. */
const RTL_LANGUAGES: ReadonlySet<string> = new Set(['ar', 'he', 'fa', 'ur']);

const resources = {
  ar: { translation: ar },
  en: { translation: en },
  fr: { translation: fr },
  sw: { translation: sw },
};

const getDeviceLanguage = (): SupportedLanguage => {
  const locale = Localization.locale ?? 'en';
  const tag = locale.split('-')[0] as SupportedLanguage;
  return SUPPORTED_LANGUAGES.includes(tag) ? tag : 'en';
};

/**
 * Apply RTL layout when the given language code is right-to-left.
 * React Native's I18nManager.forceRTL takes effect on next render cycle.
 */
export const applyRTL = (lang: string): void => {
  const shouldBeRTL = RTL_LANGUAGES.has(lang);
  if (I18nManager.isRTL !== shouldBeRTL) {
    I18nManager.forceRTL(shouldBeRTL);
  }
};

if (!i18n.isInitialized) {
  const initialLang = getDeviceLanguage();
  applyRTL(initialLang);

  i18n.use(initReactI18next).init({
    compatibilityJSON: 'v3',
    resources,
    lng: initialLang,
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });
}

export default i18n;
