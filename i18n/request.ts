import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';
import { locales, defaultLocale, type Locale } from './config';

export default getRequestConfig(async () => {
  // 1. Check fdm-locale cookie
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get('fdm-locale')?.value;
  if (cookieLocale && locales.includes(cookieLocale as Locale)) {
    return {
      locale: cookieLocale,
      messages: (await import(`../messages/${cookieLocale}.json`)).default,
    };
  }

  // 2. Check x-locale header (set by middleware from DB or Accept-Language)
  const headerStore = await headers();
  const headerLocale = headerStore.get('x-locale');
  if (headerLocale && locales.includes(headerLocale as Locale)) {
    return {
      locale: headerLocale,
      messages: (await import(`../messages/${headerLocale}.json`)).default,
    };
  }

  // 3. Fallback to default
  return {
    locale: defaultLocale,
    messages: (await import(`../messages/${defaultLocale}.json`)).default,
  };
});
