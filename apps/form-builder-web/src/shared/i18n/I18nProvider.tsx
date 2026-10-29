import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

import { en } from './translations/en.js';
import { my } from './translations/my.js';
import type { Locale, TranslationKey } from './types.js';

const translations = { en, my } as const;

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: TranslationKey) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function storedLocale(): Locale {
  return localStorage.getItem('dynamix-locale') === 'my' ? 'my' : 'en';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(storedLocale);
  const value = useMemo<I18nContextValue>(() => ({
    locale,
    setLocale(nextLocale) {
      localStorage.setItem('dynamix-locale', nextLocale);
      document.documentElement.lang = nextLocale;
      setLocaleState(nextLocale);
    },
    t: (key) => translations[locale][key],
  }), [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const context = useContext(I18nContext);
  if (context === null) {
    throw new Error('useI18n must be used within I18nProvider.');
  }
  return context;
}
