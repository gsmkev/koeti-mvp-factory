// Client-safe entry: locale config + the switcher. Server-only helpers
// (createRequestConfig, next/headers) live in '@koeti/i18n/server'.
export * from './config'
export { LocaleSwitcher } from './locale-switcher'
