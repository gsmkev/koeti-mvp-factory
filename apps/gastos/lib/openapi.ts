/**
 * OpenAPI 3.1 description of the app's HTTP surface — the single source of
 * truth behind both `GET /api/openapi` (the raw spec) and `/api-docs` (Swagger
 * UI). Hand-written on purpose: the route set is small and stable, so a codegen
 * pipeline (zod-to-openapi et al.) would be more moving parts than it saves.
 *
 * Adding a route? Add it here too — that's the whole contract.
 * ponytail: hand-authored spec; reach for codegen only once routes multiply and
 * drift becomes a real risk.
 */

const ok = (description: string) => ({ description });

export const openApiSpec = {
  openapi: '3.1.0',
  info: {
    title: 'Gastos API',
    version: '1.0.0',
    description:
      'HTTP surface of the gastos app: health, current user/team, Stripe ' +
      'checkout/webhook, Google OAuth, and the expenses CSV export. Data ' +
      'routes accept a team API key (`Authorization: Bearer koeti_…`).',
  },
  servers: [{ url: '/', description: 'This deployment' }],
  tags: [
    { name: 'System', description: 'Liveness and monitoring' },
    { name: 'Account', description: 'Current user and team' },
    { name: 'Gastos', description: 'Expenses data' },
    { name: 'Billing', description: 'Stripe checkout and webhooks' },
    { name: 'Auth', description: 'Google OAuth sign-in' },
  ],
  components: {
    securitySchemes: {
      // Minted at /dashboard/api-keys; used for MVP-to-MVP calls.
      teamApiKey: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'koeti_…',
        description: 'Team API key. Falls back to the session cookie for dashboard requests.',
      },
    },
  },
  paths: {
    '/api/health': {
      get: {
        tags: ['System'],
        summary: 'Liveness + DB reachability',
        description:
          'For uptime monitors and load balancers. 503 when the database is unreachable.',
        responses: {
          200: ok('Service and database are up'),
          503: ok('Database unreachable'),
        },
      },
    },
    '/api/user': {
      get: {
        tags: ['Account'],
        summary: 'Current signed-in user',
        description: 'Resolved from the session cookie. `null` when signed out.',
        responses: { 200: ok('The user, or null') },
      },
    },
    '/api/team': {
      get: {
        tags: ['Account'],
        summary: 'Current team',
        description:
          'Session cookie for the dashboard, or a Bearer team API key for other MVPs/scripts.',
        security: [{ teamApiKey: [] }, {}],
        responses: {
          200: ok('The team'),
          429: ok('Rate limited'),
        },
      },
    },
    '/api/gastos/export': {
      get: {
        tags: ['Gastos'],
        summary: 'Export team expenses as CSV',
        description:
          'Team-scoped expenses as CSV (id, spentAt, category, description, amount). ' +
          'Session cookie or Bearer team API key. `?categoria` filters by category, ' +
          'same as the dashboard.',
        security: [{ teamApiKey: [] }, {}],
        parameters: [
          {
            name: 'categoria',
            in: 'query',
            schema: { type: 'string' },
            description: 'Filter by expense category',
          },
        ],
        responses: {
          200: ok('CSV file (text/csv) named gastos.csv'),
          401: ok('No session and no valid API key'),
          429: ok('Rate limited'),
        },
      },
    },
    '/api/stripe/checkout': {
      get: {
        tags: ['Billing'],
        summary: 'Post-checkout return handler',
        description:
          'Stripe redirects here with `?session_id`. Persists the subscription to the team, ' +
          'sets the session, and redirects to /dashboard (or /pricing, /error).',
        parameters: [
          {
            name: 'session_id',
            in: 'query',
            required: true,
            schema: { type: 'string' },
            description: 'Stripe Checkout Session id',
          },
        ],
        responses: { 307: ok('Redirect to /dashboard, /pricing, or /error') },
      },
    },
    '/api/stripe/webhook': {
      post: {
        tags: ['Billing'],
        summary: 'Stripe webhook receiver',
        description:
          'Verifies the `stripe-signature` header, then syncs subscription create/update/delete ' +
          'events to the team.',
        responses: {
          200: ok('Event received'),
          400: ok('Signature verification failed'),
        },
      },
    },
    '/api/auth/google': {
      get: {
        tags: ['Auth'],
        summary: 'Begin Google OAuth',
        description:
          'Sets a CSRF state cookie and redirects to Google. 501 when Google sign-in is unconfigured.',
        responses: {
          302: ok('Redirect to Google consent screen'),
          501: ok('Google sign-in not configured'),
        },
      },
    },
    '/api/auth/google/callback': {
      get: {
        tags: ['Auth'],
        summary: 'Google OAuth callback',
        description:
          'Google returns here with `?code&state`. Verifies state, exchanges the code, ' +
          'find-or-creates the user, and redirects to /dashboard (or /sign-in on failure).',
        parameters: [
          { name: 'code', in: 'query', schema: { type: 'string' } },
          { name: 'state', in: 'query', schema: { type: 'string' } },
        ],
        responses: { 302: ok('Redirect to /dashboard or /sign-in?error=oauth') },
      },
    },
  },
} as const;
