import React, { createContext, useContext, useCallback } from 'react';
import enUS from './en_US.json';
import zhCN from './zh_CN.json';

export type Language = 'zh_CN' | 'en_US';

const translations: Record<Language, Record<string, string>> = {
  zh_CN: zhCN,
  en_US: enUS,
};

function interpolate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, key) => {
    const val = params[key];
    return val !== undefined ? String(val) : `{${key}}`;
  });
}

interface I18nContextValue {
  language: Language;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue>({
  language: 'zh_CN',
  t: (key: string) => key,
});

export function I18nProvider({ language, children }: { language: Language; children: React.ReactNode }) {
  const dict = translations[language] || translations.zh_CN;

  const t = useCallback(
    (key: string, params?: Record<string, string | number>): string => {
      const template = dict[key];
      if (template === undefined) return key;
      return interpolate(template, params);
    },
    [dict]
  );

  return (
    <I18nContext.Provider value={{ language, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}

export function getLanguageLabel(lang: Language): string {
  return lang === 'zh_CN' ? '中文' : 'English';
}
