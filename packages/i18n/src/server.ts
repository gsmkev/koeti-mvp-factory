import { getRequestConfig } from 'next-intl/server'
import { cookies, headers } from 'next/headers'
import { LOCALE_COOKIE, resolveLocale, type Locale } from './config'

export * from './config'

type Namespace = Record<string, unknown>
type Messages = Record<string, Namespace>
type MessagesModule = { default: Messages }

// One-level-deep merge: app namespaces merge INTO the matching baseline
// namespace (per-key), instead of a shallow spread that would replace a whole
// baseline namespace (e.g. an app adding one `nav` key would otherwise wipe the
// baseline nav). App keys win on collision.
function mergeMessages(base: Messages, app: Messages): Messages {
  const out: Messages = { ...base }
  for (const [ns, values] of Object.entries(app)) {
    out[ns] = { ...(base[ns] ?? {}), ...values }
  }
  return out
}

// Each app's i18n/request.ts calls this with a loader for its own business
// messages. We resolve the locale (cookie → Accept-Language → default), then
// merge the shared baseline with the app's messages. No middleware needed —
// locale lives in a cookie.
export function createRequestConfig(
  loadAppMessages: (locale: Locale) => Promise<MessagesModule>
) {
  return getRequestConfig(async () => {
    const [store, head] = await Promise.all([cookies(), headers()])
    const locale = resolveLocale(
      store.get(LOCALE_COOKIE)?.value,
      head.get('accept-language')
    )

    const [baseline, app] = await Promise.all([
      import(`../messages/${locale}.json`) as Promise<MessagesModule>,
      loadAppMessages(locale),
    ])

    return { locale, messages: mergeMessages(baseline.default, app.default) }
  })
}
