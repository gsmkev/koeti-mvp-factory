# Arquitectura — koeti-mvp-factory

Diagramas vivos del factory. `@koeti/ai` está marcado como **planned** (aún no
existe en `packages/`). Todo lo demás refleja el repo actual.

---

## 1. Topología de despliegue (dónde corre cada cosa + servicios externos)

```mermaid
flowchart TB
  subgraph dev["Dev — OCI VM (Oracle Cloud)"]
    direction TB
    claude["Claude Code CLI<br/>(este agente)"]
    devsrv["pnpm dev<br/>Next.js apps :3000+"]
    pg_local["Postgres local<br/>(pnpm bootstrap)"]
    devsrv --- pg_local
  end

  browser["Navegador del dev"]
  browser -- "Tailscale + VS Code SSH<br/>port-forward" --> devsrv

  subgraph prod["Producción"]
    direction TB
    cf["Cloudflare<br/>DNS / CDN / proxy<br/>*.koeti.com.py"]
    subgraph vercel["Vercel (Fluid Compute)"]
      apps["Apps Next.js<br/>gastos · &lt;mvp&gt; · saas-template"]
      cron["Vercel Cron<br/>(alertas / jobs) — planned"]
    end
    cf --> apps
    cron --> apps
  end

  users["Usuarios finales"] --> cf

  subgraph data["Datos"]
    pg_prod["Postgres gestionado<br/>(Vercel Marketplace)"]
  end

  subgraph ext["Servicios externos (API-only)"]
    stripe["Stripe<br/>checkout · portal · webhooks"]
    resend["Resend<br/>email transaccional"]
    mistral["Mistral API — PLANNED<br/>OCR 4 · Ministral · Embed"]
    gcp["Google OAuth (GCP)<br/>sign-in"]
    posthog["PostHog<br/>analytics"]
  end

  apps --> pg_prod
  apps <--> stripe
  apps --> resend
  apps -. "planned (@koeti/ai)" .-> mistral
  apps <--> gcp
  apps --> posthog

  claude -. "edita código,<br/>git push" .-> repo["GitHub repo"]
  repo -. "deploy" .-> vercel

  classDef planned stroke-dasharray:5 5,opacity:0.7;
  class mistral planned;
```

---

## 2. Grafo de dependencias del monorepo (packages ↔ apps)

Regla de oro: **las apps importan solo de `@koeti/*`; nunca de otra app.**

```mermaid
flowchart BT
  subgraph pkgs["packages/@koeti/*"]
    config["config<br/>(tsconfig/eslint)"]
    db["db<br/>schema · drizzle"]
    auth["auth<br/>session · rbac · oauth · api-keys"]
    billing["billing<br/>stripe · plan gating"]
    email["email<br/>resend + templates"]
    analytics["analytics<br/>track/identify"]
    ui["ui<br/>componentes · charts · shells"]
    ai["ai — PLANNED<br/>ocr() · suggest() · embed()"]
  end

  auth --> db
  billing --> db

  subgraph apps["apps/*"]
    tmpl["saas-template<br/>(molde)"]
    gastos["gastos"]
    mvp["&lt;nuevo-mvp&gt;"]
  end

  tmpl --> auth & billing & db & email & analytics & ui
  gastos --> auth & billing & db & email & analytics & ui
  gastos -. "planned" .-> ai
  mvp --> auth & billing & db & email & analytics & ui

  ai -. "solo env<br/>MISTRAL/AI key" .-> mistral["Mistral API"]

  classDef planned stroke-dasharray:5 5,opacity:0.7;
  class ai,mvp planned;
```

`config` es dev-only (extendido por tsconfig/eslint, no import runtime). `ui`,
`email`, `analytics`, `ai` no dependen de `db` — son hojas. `db` es la raíz.

---

## 3. Modelo de datos (ERD — packages/db/src/schema.ts)

```mermaid
erDiagram
  users ||--o{ team_members : "es"
  teams ||--o{ team_members : "tiene"
  teams ||--o{ activity_logs : "registra"
  teams ||--o{ invitations : "emite"
  teams ||--o{ api_keys : "posee"
  users ||--o{ invitations : "invita"
  users ||--o{ api_keys : "crea"
  users ||--o{ activity_logs : "actúa"

  users {
    serial id PK
    varchar email UK
    text password_hash
    varchar role "default member"
    timestamp deleted_at "soft-delete"
  }
  teams {
    serial id PK
    text stripe_customer_id UK
    text stripe_subscription_id UK
    varchar plan_name
    varchar subscription_status "active|trialing|..."
  }
  team_members {
    serial id PK
    integer user_id FK
    integer team_id FK
    varchar role "viewer<member<admin<owner"
  }
  api_keys {
    serial id PK
    integer team_id FK
    text key_hash UK "SHA-256"
    varchar key_prefix
    timestamp revoked_at
  }
  invitations {
    serial id PK
    integer team_id FK
    varchar email
    varchar status "pending"
  }
  activity_logs {
    serial id PK
    integer team_id FK
    varchar ip_address
  }
```

Las tablas de negocio de cada MVP (ej. `gastos`) añaden su propio schema con
columna `team_id` → así `crudActions` las scope-a automáticamente por equipo.

---

## 4. Flujo de auth + sesión (sign-in / OAuth / request scope-ado)

```mermaid
sequenceDiagram
  actor U as Usuario
  participant P as Next.js page/action
  participant A as "@koeti/auth"
  participant G as Google OAuth (GCP)
  participant DB as Postgres

  alt Password
    U->>P: signIn(email, pass)
    P->>A: rateLimit(ip+email)
    P->>DB: user by email
    P->>A: comparePasswords()
  else Google
    U->>P: /oauth/google
    P->>A: googleAuthUrl()
    A-->>U: redirect a Google
    U->>G: consiente
    G-->>P: code
    P->>A: getGoogleProfile(code)
    P->>DB: upsert user
  end
  P->>A: setSession({user.id})
  A-->>U: cookie JWT httpOnly (1 día)

  Note over U,DB: Cada request posterior
  U->>P: request con cookie
  P->>A: getSession() → verifyToken()
  P->>DB: query WHERE team_id = team.id
  DB-->>U: solo datos del equipo
```

---

## 5. Capa de IA — OCR de recibo (planned, gastos como primer consumidor)

```mermaid
sequenceDiagram
  actor U as Usuario
  participant G as gastos (server action)
  participant AI as "@koeti/ai"
  participant M as Mistral API
  participant DB as Postgres

  U->>G: sube foto de recibo
  G->>AI: ocr(image, ExpenseSchema)
  alt sin API key
    AI-->>G: null (no-op)
    G-->>U: "carga manual" (fallback)
  else con key
    AI->>M: OCR 4 → markdown/JSON
    M-->>AI: campos extraídos
    AI->>M: Ministral 3B → categoriza
    M-->>AI: categoría + validación
    AI-->>G: {monto, fecha, categoría, comercio}
    G->>DB: insert gasto (team_id scope)
    G-->>U: formulario pre-llenado
  end
```

Patrón no-op-sin-key idéntico a `@koeti/email` y `@koeti/analytics`: sin
`MISTRAL/AI` key, `ocr()` devuelve `null` y el MVP cae a carga manual.

---

## 6. Ciclo del factory (cómo nace un MVP)

```mermaid
flowchart LR
  spec["/factory &lt;name&gt; — &lt;lógica&gt;"] --> plan["spec → plan"]
  plan --> scaffold["create-mvp.mjs<br/>clona saas-template<br/>+ provisiona DB"]
  scaffold --> impl["implementa lib/ · schema · pages<br/>(usa @koeti/*)"]
  impl --> verify["typecheck · test · build<br/>verify-app · e2e-app"]
  verify --> pr["draft PR"]
  verify -. "falla" .-> impl
  pr --> deploy["Vercel deploy"]
```

---

## 7. Billing — ciclo de vida Stripe (checkout · portal · webhook)

```mermaid
sequenceDiagram
  actor U as Usuario (admin)
  participant App as Next.js action
  participant B as "@koeti/billing"
  participant S as Stripe
  participant WH as app/api/stripe/webhook
  participant DB as Postgres

  U->>App: "Suscribirse"
  App->>B: createCheckoutSession(team, priceId)
  B->>S: crea sesión
  S-->>U: Stripe Checkout (redirect)
  U->>S: paga
  S-->>WH: customer.subscription.updated
  WH->>B: handleSubscriptionChange()
  B->>DB: teams.subscriptionStatus / planName / ids

  Note over U,DB: Gestionar / cancelar
  U->>App: "Administrar plan"
  App->>B: createCustomerPortalSession()
  B->>S: portal
  S-->>U: Customer Portal
  S-->>WH: customer.subscription.deleted
  WH->>DB: subscriptionStatus = canceled
```

Gating de plan: `isSubscribed(team)` = `active || trialing`.
**Gap conocido:** el webhook solo maneja `subscription.updated/deleted` — falta
`invoice.payment_failed` y `checkout.session.completed`. Añadir cuando importe
el dunning (avisos de pago fallido).

---

## 8. Modelo de seguridad — RBAC + multi-tenancy (los invariantes)

Dos guardas se combinan en **cada** mutación: _quién sos_ (rol) y _de qué
equipo_ (tenant). Ninguna query de negocio corre sin ambos.

```mermaid
flowchart TB
  subgraph roles["Jerarquía de roles (@koeti/auth · rbac)"]
    direction LR
    viewer --> member --> admin --> owner --> super["SUPERADMIN_EMAIL"]
  end

  req["Request / server action"] --> sess{"getSession()<br/>cookie válida?"}
  sess -- no --> reject1["401 / redirect login"]
  sess -- sí --> team["withTeam(fn, minRole)<br/>resuelve team + rol"]
  team --> rbac{"roleAtLeast(rol, minRole)?"}
  rbac -- no --> reject2["403"]
  rbac -- sí --> scope["query SIEMPRE<br/>WHERE team_id = team.id"]
  scope --> data["solo datos del tenant"]

  classDef bad fill:#fee,stroke:#c00;
  class reject1,reject2 bad;
```

- **RBAC**: `requireRole('viewer')` en páginas, `withTeam(fn,'admin')` en
  actions. `crudActions` recibe `minRole` (default `member`).
- **Tenancy**: `crudActions` inyecta `team_id` en todo insert y lo filtra en
  update/delete → _olvidar el scope es imposible_. Las queries de lectura del
  MVP deben repetir el `WHERE team_id` a mano.
- **Superadmin**: `isSuperadmin(user)` por env `SUPERADMIN_EMAIL`, fuera de la
  jerarquía de equipo.

---

## 9. CRUD team-scoped (crudActions — el 80% de cada MVP)

```mermaid
sequenceDiagram
  actor U as Usuario
  participant Form as ResourcePanel (form)
  participant Act as crudActions.create
  participant MW as withTeam(minRole)
  participant Z as Zod schema
  participant DB as Postgres

  U->>Form: submit FormData
  Form->>Act: server action
  Act->>MW: sesión + rol OK?
  MW-->>Act: team (o 403)
  Act->>Z: safeParse(FormData)
  Z-->>Act: data válida (o {error})
  Act->>DB: insert {...data, team_id}
  Act->>Act: revalidatePath(path)
  Act-->>U: UI refrescada
```

Entidades con lógica extra que el factory-CRUD no cubre → action escrita a mano
al lado, no forzar todo por `crudActions` (ver `.claude/rules/crud.md`).

---

## 10. Integración MVP ↔ MVP (sin importar código entre apps)

```mermaid
flowchart LR
  subgraph a["MVP A (gastos)"]
    route["app/api/*/route.ts<br/>route handler"]
  end
  subgraph b["MVP B"]
    caller["fetch()"]
  end

  caller -- "Authorization: Bearer koeti_…" --> route
  route --> verify["getTeamFromApiKey()<br/>hash SHA-256 → api_keys"]
  verify --> data["datos scope-ados al team de la key"]

  b -. "deep-link con query params<br/>(nuqs / URL state)" .-> a
```

Dos únicas vías permitidas: **datos** por HTTP (route handlers + API key de
equipo minteada en `/dashboard/api-keys`) y **navegación** por deep-links con
estado en la URL. Nunca `import` de `apps/*`.
`api-rate-limit`: in-memory por instancia (ceiling conocido → Upstash si crece).

---

## Qué NO está documentado aquí (a propósito)

Se lee directo del código o de las reglas; documentarlo sería deuda:
estructura de carpetas (`CLAUDE.md`), estándares de código/imports (`CLAUDE.md`
§Package imports), patrones de charts/URL-state/CRUD (`.claude/rules/*.md`),
API exacta de cada package (los `index.ts`). Este doc solo captura lo
**transversal**: topología, dependencias e invariantes de seguridad.

---

---

# Manual del dev — cómo se opera el factory

Lo de arriba es _qué es_ el sistema. Lo de abajo es _cómo lo manejás_ vos y el
agente: las skills, las reglas que se auto-aplican, y el loop autónomo.

## 11. Catálogo de skills (`.claude/skills/*`)

Se invocan con `/<skill>`. Dos son loops de negocio (crean MVPs); el resto son
herramientas de trabajo apoyadas en el knowledge graph.

```mermaid
flowchart TB
  subgraph build["Crear / evolucionar producto"]
    factory["/factory &lt;name&gt; — &lt;lógica&gt;<br/>AFK: párrafo → MVP built + PR<br/>cero preguntas"]
    createsaas["/create-saas<br/>implementa desde spec+plan<br/>ya escritos por un humano"]
    port["/port-template-change<br/>propaga cambio de template/package<br/>a TODAS las apps (anti-drift)"]
  end

  subgraph work["Trabajo asistido por el graph"]
    explore["/explore-codebase<br/>navegar y entender estructura"]
    debug["/debug-issue<br/>debug sistemático"]
    refactor["/refactor-safely<br/>refactor con análisis de deps"]
    review["/review-changes<br/>code review + detect_changes"]
  end

  factory -. "reusa" .-> createsaas
  createsaas -. "tras editar template" .-> port
  work -. "graph MCP:<br/>query_graph · impact_radius" .-> graph[("code-review-graph")]
```

| Skill                  | Cuándo                             | Autónoma        |
| ---------------------- | ---------------------------------- | --------------- |
| `factory`              | Idea en un párrafo → MVP con PR    | Sí, 0 preguntas |
| `create-saas`          | Ya hay spec+plan escritos          | Semi            |
| `port-template-change` | Tocaste `saas-template`/`packages` | Semi            |
| `explore-codebase`     | Entender antes de tocar            | Herramienta     |
| `debug-issue`          | Algo falla                         | Herramienta     |
| `refactor-safely`      | Renombrar/mover con blast-radius   | Herramienta     |
| `review-changes`       | Revisar un diff/PR                 | Herramienta     |

## 12. Reglas que se auto-aplican por path (`.claude/rules/*`)

Cada regla declara `paths:` (globs). Cuando el agente toca un archivo que
matchea, la regla se inyecta en contexto **sin pedirla**. Así el patrón correcto
llega solo al editar la zona correcta.

```mermaid
flowchart LR
  subgraph files["Editás un archivo…"]
    f_auth["lib/auth/** · actions.ts<br/>middleware.ts · proxy.ts"]
    f_bill["app/api/stripe/** · lib/billing/**"]
    f_crud["lib/crud.ts · schema.ts<br/>app/(dashboard)/**"]
    f_db["lib/db/** · drizzle.config.ts"]
    f_dep["turbo.json · next.config.ts<br/>package.json · .vercel/**"]
    f_ui["app/**/*.tsx · components/**"]
  end
  subgraph rules["…y se activa la regla"]
    r_auth["auth.md<br/>RBAC · sesión · API keys"]
    r_bill["billing.md<br/>Stripe · gating"]
    r_crud["crud.md<br/>schema→queries→actions→page"]
    r_db["db.md<br/>Drizzle · migraciones"]
    r_dep["deploy.md<br/>Turbo · Vercel · env"]
    r_ui["ui.md<br/>composites @koeti/ui"]
  end
  f_auth --> r_auth
  f_bill --> r_bill
  f_crud --> r_crud
  f_db --> r_db
  f_dep --> r_dep
  f_ui --> r_ui

  manual["charts.md · url-state.md<br/>(sin path — referidas desde CLAUDE.md<br/>al hacer gráficos / estado en URL)"]
```

## 13. Workflow autónomo — el loop `/factory` (7 fases, cero preguntas)

```mermaid
flowchart TB
  in["/factory &lt;name&gt; — &lt;business logic&gt;"] --> p0

  p0["Fase 0 · Isolate<br/>worktree/branch aislado"]
  p1["Fase 1 · Spec<br/>brainstorm autónomo → spec.md"]
  p2["Fase 2 · Plan<br/>plan de implementación"]
  p3["Fase 3 · Scaffold<br/>create-mvp.mjs: clona template<br/>+ provisiona DB + install"]
  p4["Fase 4 · Implement<br/>schema→queries→actions→pages<br/>usando @koeti/* + reglas auto"]
  p5{"Fase 5 · Verify — EL GATE<br/>typecheck · test · build<br/>verify-app · e2e-app"}
  p6["Fase 6 · Ship<br/>draft PR"]

  p0 --> p1 --> p2 --> p3 --> p4 --> p5
  p5 -- "falla" --> p4
  p5 -- "pasa" --> p6
  p6 --> out["PR listo para revisión humana"]

  classDef gate fill:#fff3cd,stroke:#e0a800;
  class p5 gate;
```

**El gate (Fase 5) es la Definition of Done** — nada sale sin que pase.
`/create-saas` es la variante que arranca en Fase 4 cuando un humano ya escribió
spec+plan. Tras evolucionar el template, `/port-template-change` re-corre el
gate en cada app para que ninguna quede atrás.

## 14. Mapa de comandos (el día a día del dev)

```mermaid
flowchart LR
  subgraph setup["Arranque"]
    a["pnpm bootstrap<br/>(worktree fresco: env + DB local)"]
  end
  subgraph loop["Crear + iterar"]
    b["pnpm create-mvp &lt;name&gt;"]
    c["pnpm --filter @koeti/&lt;name&gt; dev"]
    d["db:migrate"]
  end
  subgraph gate["Definition of Done (obligatorio)"]
    e["pnpm typecheck"]
    f["pnpm test"]
    g["pnpm build"]
    h["verify-app &lt;name&gt;<br/>(si tocaste pages/actions/schema)"]
    i["e2e-app &lt;name&gt;"]
    j["pnpm smoke<br/>(si tocaste template/create-mvp)"]
  end
  a --> b --> c --> d
  d --> e --> f --> g
  g --> h --> i
  g --> j
```

Regla de cierre: **antes de decir que algo funciona**, `typecheck && test &&
build` verde. Tocaste pages/actions/schema → sumá `verify-app` + `e2e-app`.
Tocaste `saas-template` o `create-mvp.mjs` → sumá `smoke`.
