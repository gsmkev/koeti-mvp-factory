import { getRequestConfig } from 'next-intl/server'
import { cookies, headers } from 'next/headers'
import { LOCALE_COOKIE, resolveLocale, type Locale } from './config'

export * from './config'

type Messages = Record<string, unknown>
type MessagesModule = { default: Messages }

// Each app's i18n/request.ts calls this with a loader for its own business
// messages. We resolve the locale (cookie → Accept-Language → default), then
// merge the shared baseline under the app's messages so apps can add or
// override keys. No middleware needed — locale lives in a cookie.
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

    return { locale, messages: { ...baseline.default, ...app.default } }
  })
}
