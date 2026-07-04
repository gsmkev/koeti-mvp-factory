// Zero-dependency locale config. Safe to import anywhere — server, client,
// email templates, next.config. No react, no next imports here.

export const locales = ['en', 'es', 'pt'] as const
export type Locale = (typeof locales)[number]

export const defaultLocale: Locale = 'en'

// Cookie the switcher writes and getRequestConfig reads. NEXT_LOCALE is the
// de-facto Next.js convention; proxy.ts never touches it.
export const LOCALE_COOKIE = 'NEXT_LOCALE'

// Native language names for the switcher — shown in each language's own script.
export const localeNames: Record<Locale, string> = {
  en: 'English',
  es: 'Español',
  pt: 'Português',
}

export function isLocale(value: string | undefined | null): value is Locale {
  return !!value && (locales as readonly string[]).includes(value)
}

// Resolve the request locale: explicit cookie wins, then the browser's
// Accept-Language, then the default. Never returns an unknown locale.
export function resolveLocale(
  cookieValue?: string | null,
  acceptLanguage?: string | null
): Locale {
  if (isLocale(cookieValue)) return cookieValue

  // "es-AR,es;q=0.9,en;q=0.8" → first base tag we support.
  for (const part of acceptLanguage?.split(',') ?? []) {
    const base = part.trim().split(';')[0]?.split('-')[0]
    if (isLocale(base)) return base
  }

  return defaultLocale
}
