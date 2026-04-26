import * as Localization from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import fr from './locales/fr.json';
import sw from './locales/sw.json';

export const SUPPORTED_LANGUAGES = ['en', 'es', 'fr', 'sw'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const resources = {
  en: { translation: en },
  fr: { translation: fr },
  sw: { translation: sw },
};

const getDeviceLanguage = (): SupportedLanguage => {
  const locale = Localization.locale ?? 'en';
  const tag = locale.split('-')[0] as SupportedLanguage;
  return SUPPORTED_LANGUAGES.includes(tag) ? tag : 'en';
};

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    compatibilityJSON: 'v3',
    resources,
    lng: getDeviceLanguage(),
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });
}

export default i18n;
