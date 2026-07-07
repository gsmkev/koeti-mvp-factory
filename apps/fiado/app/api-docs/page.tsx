'use client';
// Page — route /api-docs.

import Script from 'next/script';

/**
 * Interactive API reference — Swagger UI pointed at `/api/openapi`.
 *
 * The bundle is loaded from a pinned CDN rather than an npm dependency:
 * swagger-ui-react drags in a heavy client bundle and lags React 19 peer
 * support, whereas the standalone dist is framework-agnostic and adds zero
 * weight to the app's own bundle.
 *
 * ponytail: CDN-hosted, so the page needs network access to render. If offline
 * or strict-CSP docs are required, vendor swagger-ui-dist into /public and
 * point these two URLs at it instead.
 */

const V = '5.17.14'; // pin — never load "latest" from a CDN

declare global {
  interface Window {
    SwaggerUIBundle?: (opts: Record<string, unknown>) => void;
  }
}

export default function ApiDocsPage() {
  return (
    <main className="min-h-[100dvh] bg-white">
      <link
        rel="stylesheet"
        href={`https://cdn.jsdelivr.net/npm/swagger-ui-dist@${V}/swagger-ui.css`}
      />
      <div id="swagger-ui" />
      <Script
        src={`https://cdn.jsdelivr.net/npm/swagger-ui-dist@${V}/swagger-ui-bundle.js`}
        strategy="afterInteractive"
        onReady={() =>
          window.SwaggerUIBundle?.({
            url: '/api/openapi',
            dom_id: '#swagger-ui',
            deepLinking: true,
          })
        }
      />
    </main>
  );
}
