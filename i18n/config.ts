export const locales = ['tr', 'az', 'en'] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = 'tr';
