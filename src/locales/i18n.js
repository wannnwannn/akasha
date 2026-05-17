import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import translationFR from './fr/translation.json';
import translationEN from './en/translation.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      fr: { translation: translationFR },
      en: { translation: translationEN }
    },
    lng: 'fr', // Langue par défaut
    fallbackLng: 'fr', // Langue de secours si l'anglais est incomplet
    interpolation: {
      escapeValue: false // React gère déjà la protection XSS
    }
  });

export default i18n;