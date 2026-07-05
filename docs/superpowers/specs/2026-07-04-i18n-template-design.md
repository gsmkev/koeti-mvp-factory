# i18n en el factory — en / es / pt

**Fecha:** 2026-07-04
**Estado:** aprobado, listo para plan de implementación

## Objetivo

Que todo repo del factory soporte inglés, español y portugués. La infraestructura
vive una sola vez en un package compartido; cada app (empezando por `saas-template`)
la consume. Las apps nuevas heredan i18n automáticamente al scaffoldear.

## Decisiones cerradas

- **Librería:** `next-intl` en modo **cookie, sin routing** (sin segmento `/es` en la
  URL, sin tocar `proxy.ts`). Confirmado que next-intl soporta este modo: `getRequestConfig`
  lee la cookie y `NextIntlClientProvider` envuelve el árbol client.
- **Selección de idioma:** cookie (`NEXT_LOCALE`, 1 año) con fallback a `Accept-Language`
  y luego a `en`. Un `<LocaleSwitcher/>` la setea.
- **Locales:** `en` (default), `es`, `pt`.
- **Alcance v1:** todo el UI (páginas, componentes, server actions) **y** los emails
  transaccionales.
- **Sin cambios de schema:** el locale vive en cookie, no en DB.
- **Selector visible en:** header del dashboard y en las páginas públicas (login / marketing).

## Arquitectura

### 1. Nuevo package `@koeti/i18n`

Toda la fontanería compartida, una vez:

- `locales`, `defaultLocale`, `type Locale`, y `LOCALE_COOKIE` (nombre de cookie) como
  constantes exportadas.
- `messages/{en,es,pt}.json` — **baseline compartido**: auth (sign-in/up, forgot/reset
  password), shell del dashboard (nav, sign-out, settings), billing, y errores comunes.
  Toda app los hereda.
- `getLocale(): Promise<Locale>` (server) — lee la cookie, fallback a `Accept-Language`,
  luego `defaultLocale`. Valida contra `locales` (nunca devuelve un locale desconocido).
- `setLocale(locale: Locale)` — server action: setea la cookie (1 año, `httpOnly` no,
  para poder leerla en cliente si hace falta) y `revalidatePath('/', 'layout')`.
- `<LocaleSwitcher/>` — client component; usa `Button`/`Select` de `@koeti/ui`; llama
  `setLocale`. Muestra los 3 idiomas con su nombre nativo (English / Español / Português).
- `createRequestConfig(loadAppMessages)` — factory para el `i18n/request.ts` de cada app.
  Hace merge de mensajes: `{ ...baseline[locale], ...(await loadAppMessages(locale)) }`.
  El baseline se importa dentro del package; la app solo provee sus mensajes de negocio.

Namespacing de claves: baseline usa namespaces `auth.*`, `dashboard.*`, `billing.*`,
`common.*`; cada app usa namespaces propios para su negocio (evita colisiones en el merge).

### 2. Cada app (patrón, aplicado primero a `saas-template`)

- `i18n/request.ts`:
  ```ts
  import { createRequestConfig } from '@koeti/i18n/server';
  export default createRequestConfig((locale) => import(`../messages/${locale}.json`));
  ```
- `messages/{en,es,pt}.json` — strings **de negocio** de la app.
- `next.config.ts` — envuelto con `createNextIntlPlugin('./i18n/request.ts')`.
- `layout.tsx`:
  - `<html lang={await getLocale()}>`.
  - Envolver children en `<NextIntlClientProvider>` (next-intl toma locale + messages del
    request config; no hace falta pasarlos a mano si se usa el patrón estándar).
- `<LocaleSwitcher/>` en el header del dashboard y en el layout de login/marketing.
- Reemplazo de strings hardcodeados por `t('...')`:
  - Server components → `const t = await getTranslations()`.
  - Client components → `const t = useTranslations()`.
  - Server actions (`app/(login)/actions.ts`, etc.) → mensajes de error/éxito vía
    `getTranslations()`.

### 3. Emails (`@koeti/email`)

react-email se renderiza fuera del request → no hay context de next-intl. Por lo tanto:

- Cada template (`welcome`, `password-reset`, `invitation`) recibe `locale: Locale` como
  prop y lee sus strings de un diccionario. Ese diccionario son los mismos JSON baseline
  de `@koeti/i18n/messages` (namespace `email.*`), importados directamente (no vía
  `getTranslations`), para no duplicar traducciones.
- Los callers (server actions de las apps) pasan `await getLocale()` al construir el email.
- **Invitación:** el destinatario no tiene preferencia todavía → se usa el locale de quien
  invita (el request actual).

### 4. Sin cambios de schema

El locale vive en cookie. Cubre welcome/reset/invitation porque todos se disparan desde un
request con cookie presente.
`// ponytail: cookie-only; agregar users.locale si se quiere persistencia cross-device`.

### 5. Propagación al factory

- `saas-template` queda 100% traducido y cableado — es la fuente de verdad.
- `scripts/create-mvp.mjs` ya copia el template → apps nuevas heredan i18n. Verificar que
  copie `messages/` e `i18n/` (y que no los excluya ningún ignore).
- `/port-template-change` propaga el cambio a `gastos` (la otra app viva): agregar la
  dependencia, el `i18n/request.ts`, los `messages/`, el wrapping del layout, el selector, y
  traducir sus strings de negocio.
- Docs:
  - Nueva `.claude/rules/i18n.md` — cómo agregar un string, cómo mantener paridad de
    claves, dónde va baseline vs. negocio, cómo se localiza un email.
  - Línea en `CLAUDE.md` (sección de imports de packages) para `@koeti/i18n`.

## Testing

- **Paridad de claves (check de más valor):** test que asegura que `en/es/pt.json`
  (baseline y de cada app) tienen exactamente el mismo set de claves recursivo. Falla si
  falta una traducción o sobra una clave. Corre en `@koeti/i18n` y en cada app.
- **Fallback de `getLocale()`:** cookie válida → ese locale; cookie inválida/ausente →
  `Accept-Language`; sin header → `defaultLocale`.
- `pnpm typecheck && pnpm test && pnpm build` deben pasar.
- `pnpm verify-app saas-template` y `pnpm verify-app gastos` (render de todas las páginas).
- `pnpm e2e-app saas-template` (sign-up + CRUD) sigue verde.

## Fuentes / subsets

Lexend + Source Sans con `subset: ['latin']` ya cubren los acentos de ES/PT (á, é, í, ó,
ú, ñ, ã, õ, ç). Sin cambios de fuentes.

## Fuera de alcance (v1)

- Persistencia del locale en DB (cross-device) — cookie alcanza; se agrega `users.locale`
  después si hace falta.
- Locale en la URL / SEO por idioma / `hreflang` — el modo cookie no lo da; migrar a
  routing con prefijo sería un v2 si se prioriza SEO multi-idioma.
- Idiomas más allá de en/es/pt.
