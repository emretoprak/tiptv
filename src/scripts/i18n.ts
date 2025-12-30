import type { Language } from '../i18n/utils';
import { loadLanguage, saveLanguage } from './storage';

const translations: Record<Language, any> = {
	en: null,
	tr: null,
};

let currentLang: Language = 'tr';

// Export Language type for use in other modules
export type { Language };

export async function loadTranslations(lang: Language) {
	if (!translations[lang]) {
		const module = await import(`../i18n/locales/${lang}.json`);
		translations[lang] = module.default;
	}
	currentLang = lang;
	return translations[lang];
}

export function t(key: string): string {
	const keys = key.split('.');
	let value: any = translations[currentLang];

	for (const k of keys) {
		value = value?.[k];
	}

	return value || key;
}

export function getCurrentLanguage(): Language {
	return currentLang;
}

export async function setLanguage(lang: Language) {
	currentLang = lang;
	await saveLanguage(lang);
}

export async function getStoredLanguage(): Promise<Language> {
	const stored = await loadLanguage();
	if (stored === 'en' || stored === 'tr') {
		return stored;
	}
	return 'tr';
}

export function updatePageTranslations() {
  // Update all elements with data-i18n attribute
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    const key = element.getAttribute('data-i18n');
    if (key) {
      if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
        element.placeholder = t(key);
      } else {
        element.textContent = t(key);
      }
    }
  });

  // Update all elements with data-i18n-placeholder attribute
  document.querySelectorAll('[data-i18n-placeholder]').forEach((element) => {
    const key = element.getAttribute('data-i18n-placeholder');
    if (key && (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) {
      element.placeholder = t(key);
    }
  });
}
