// next-intl request config: merge baseline + app messages per locale.
import { createRequestConfig } from '@koeti/i18n/server';

// Shared baseline (auth, dashboard, billing…) lives in @koeti/i18n; this app
// only ships its own business messages. next-intl merges them per request.
export default createRequestConfig((locale) => import(`../messages/${locale}.json`));
