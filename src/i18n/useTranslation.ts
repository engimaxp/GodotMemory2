import { useCallback } from 'react';
import enUS from './en_US.json';
import zhCN from './zh_CN.json';

export type Language = 'zh_CN' | 'en_US';

const translations: Record<Language, Record<string, string>> = {
  zh_CN: zhCN,
  en_US: enUS,
};

// Simple template interpolation: replaces {key} with values from params
function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const val = params[key];
    return val !== undefined ? String(val) : `{${key}}`;
  });
}

/**
 * i18n hook. Usage:
 *   const { t } = useTranslation();
 *   t('engine.name')              // "名称" (zh_CN) or "Name" (en_US)
 *   t('engine.delete_confirm', { name: 'Godot 4.2' })  // with interpolation
 */
export function useTranslation(language: Language) {
  const dict = translations[language] || translations.zh_CN;

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const template = dict[key];
      if (template === undefined) return key; // fallback to key
      return interpolate(template, params);
    },
    [dict]
  );

  return { t, language };
}

/**
 * Get language label for display
 */
export function getLanguageLabel(lang: Language): string {
  return lang === 'zh_CN' ? '中文' : 'English';
}
