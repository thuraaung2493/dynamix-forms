export interface Translations {
  appName: string;
  createForm: string;
  dashboard: string;
  deletedForms: string;
  footer: string;
  login: string;
  logout: string;
  profile: string;
  register: string;
  theme: string;
  language: string;
}

export type TranslationKey = keyof Translations;
export type Locale = 'en' | 'my';
