/**
 * i18n utility for translations outside React components
 * Reads language from localStorage and provides translation function
 */

import { translations } from '@/contexts/ThemeContext';

type Language = 'en' | 'ru' | 'uz';

/**
 * Get current language from localStorage
 */
export function getCurrentLanguage(): Language {
  const savedLanguage = localStorage.getItem('wist-language');
  return (savedLanguage === 'en' || savedLanguage === 'ru' || savedLanguage === 'uz') 
    ? savedLanguage 
    : 'en';
}

/**
 * Translation function that works outside React components
 * Supports simple placeholder replacement: {key}
 * 
 * @param key - Translation key
 * @param params - Optional parameters for placeholder replacement
 * @returns Translated string
 */
export function t(key: string, params?: Record<string, string | number>): string {
  const language = getCurrentLanguage();
  
  // Get translation
  let translation = translations[language]?.[key] 
    || translations['en'][key] 
    || key;
  
  // Replace placeholders if params provided
  if (params) {
    Object.entries(params).forEach(([paramKey, value]) => {
      translation = translation.replace(`{${paramKey}}`, String(value));
    });
  }
  
  return translation;
}

