import i18next from 'i18next';
import en from './en.json';
import te from './te.json';

export const localization = i18next.createInstance();

export async function initializeLocalization(language: 'en' | 'te' = 'en') {
  if (!localization.isInitialized) {
    await localization.init({
      lng: language,
      fallbackLng: 'en',
      resources: {
        en: { translation: en },
        te: { translation: te },
      },
      interpolation: { escapeValue: false },
    });
  } else {
    await localization.changeLanguage(language);
  }
  return localization;
}
