import en from './locales/en.json';
import tr from './locales/tr.json';

export const languages = {
  en: 'English',
  tr: 'Türkçe',
};

export const defaultLang = 'en';

export const translations = {
  en,
  tr,
};

export type Language = keyof typeof languages;

export function getLangFromUrl(url: URL): Language {
  const [, lang] = url.pathname.split('/');
  if (lang in languages) return lang as Language;
  return defaultLang;
}

export function useTranslations(lang: Language) {
  return function t(key: string): string {
    const keys = key.split('.');
    let value: any = translations[lang];
    
    for (const k of keys) {
      value = value?.[k];
    }
    
    return value || key;
  };
}

// Global translation function for use in scripts
export function t(key: string, lang?: Language): string {
  const currentLang = lang || getCurrentLanguage();
  const keys = key.split('.');
  let value: any = translations[currentLang];
  
  for (const k of keys) {
    value = value?.[k];
  }
  
  return value || key;
}

// Get current language from localStorage or default
export function getCurrentLanguage(): Language {
  const stored = localStorage.getItem('language');
  return (stored && stored in languages) ? stored as Language : defaultLang;
}

// Set current language
export function setCurrentLanguage(lang: Language): void {
  localStorage.setItem('language', lang);
}


