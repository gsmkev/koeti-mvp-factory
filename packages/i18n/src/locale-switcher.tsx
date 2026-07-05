'use client';
// @koeti/i18n — locale switcher.

import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { locales, localeNames, LOCALE_COOKIE, type Locale } from './config';

// ponytail: native <select> instead of a Radix component — one dependency-free
// element, keyboard/a11y for free, no client JS beyond the change handler.
// Sets the cookie directly (no server action needed) and refreshes so the
// server re-renders with the new locale.
export function LocaleSwitcher({ className = '' }: { className?: string }) {
  const active = useLocale() as Locale;
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function change(next: Locale) {
    document.cookie = `${LOCALE_COOKIE}=${next}; path=/; max-age=31536000; samesite=lax`;
    startTransition(() => router.refresh());
  }

  return (
    <select
      aria-label="Language"
      value={active}
      disabled={pending}
      onChange={(e) => change(e.target.value as Locale)}
      className={`h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60 ${className}`}
    >
      {locales.map((l) => (
        <option key={l} value={l}>
          {localeNames[l]}
        </option>
      ))}
    </select>
  );
}
