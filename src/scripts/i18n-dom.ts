/**
 * DOM i18n integration
 * Handles automatic translation of DOM elements with data-i18n attributes
 */

import { t, getCurrentLanguage, setCurrentLanguage, type Language } from '../i18n/utils';

/**
 * Apply translations to all elements with data-i18n attributes
 */
export function applyTranslations(): void {
  const elements = document.querySelectorAll('[data-i18n]');
  
  elements.forEach(element => {
    const key = element.getAttribute('data-i18n');
    if (key) {
      element.textContent = t(key);
    }
  });
  
  // Handle placeholder translations
  const placeholderElements = document.querySelectorAll('[data-i18n-placeholder]');
  placeholderElements.forEach(element => {
    const key = element.getAttribute('data-i18n-placeholder');
    if (key && element instanceof HTMLInputElement) {
      element.placeholder = t(key);
    }
  });
}

/**
 * Initialize i18n system
 */
export function initI18n(): void {
  // Apply initial translations
  applyTranslations();
  
  // Set up language switchers
  setupLanguageSwitchers();
}

/**
 * Set up language switcher buttons
 */
function setupLanguageSwitchers(): void {
  // Login screen language buttons
  const loginLangTr = document.getElementById('login-lang-tr');
  const loginLangEn = document.getElementById('login-lang-en');
  
  if (loginLangTr && loginLangEn) {
    updateLanguageButtons([loginLangTr, loginLangEn]);
    
    loginLangTr.addEventListener('click', () => switchLanguage('tr', [loginLangTr, loginLangEn]));
    loginLangEn.addEventListener('click', () => switchLanguage('en', [loginLangTr, loginLangEn]));
  }
  
  // Settings modal language buttons
  const settingsLangTr = document.getElementById('lang-tr');
  const settingsLangEn = document.getElementById('lang-en');
  
  if (settingsLangTr && settingsLangEn) {
    updateLanguageButtons([settingsLangTr, settingsLangEn]);
    
    settingsLangTr.addEventListener('click', () => switchLanguage('tr', [settingsLangTr, settingsLangEn]));
    settingsLangEn.addEventListener('click', () => switchLanguage('en', [settingsLangTr, settingsLangEn]));
  }
}

/**
 * Switch language and update UI
 */
function switchLanguage(lang: Language, buttons: Element[]): void {
  setCurrentLanguage(lang);
  applyTranslations();
  updateLanguageButtons(buttons);
}

/**
 * Update language button states
 */
function updateLanguageButtons(buttons: Element[]): void {
  const currentLang = getCurrentLanguage();
  
  buttons.forEach(button => {
    const buttonLang = button.getAttribute('data-lang');
    if (buttonLang === currentLang) {
      button.classList.add('active');
    } else {
      button.classList.remove('active');
    }
  });
}

// Auto-initialize when DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initI18n);
} else {
  initI18n();
}