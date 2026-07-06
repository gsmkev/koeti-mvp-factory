// @koeti/db — schema.
import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  date,
  primaryKey,
  uniqueIndex,
  index,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: varchar('role', { length: 20 }).notNull().default('member'),
  // Null until the address is confirmed via the verification link. Soft signal
  // by default (a dashboard banner) — apps that need a hard gate check it in
  // proxy.ts / requireRole. See email-verification flow in the login actions.
  emailVerified: timestamp('email_verified'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

export const teams = pgTable('teams', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  stripeCustomerId: text('stripe_customer_id').unique(),
  stripeSubscriptionId: text('stripe_subscription_id').unique(),
  stripeProductId: text('stripe_product_id'),
  planName: varchar('plan_name', { length: 50 }),
  subscriptionStatus: varchar('subscription_status', { length: 20 }),
  // Per-tenant override of the AI daily quota. Null = inherit the plan / SaaS
  // default (see resolveAiLimits in @koeti/ai). Set by the superadmin.
  aiDailyLimit: integer('ai_daily_limit'),
  // Null = owner hasn't finished /onboarding yet (dashboard layout bounces them there).
  onboardingCompletedAt: timestamp('onboarding_completed_at'),
  // Tenant localization, set in /onboarding. Language is per-user (NEXT_LOCALE
  // cookie), but money and units are per-tenant: every member sees the same
  // reports. Format with the native Intl API: new Intl.NumberFormat(locale,
  // { style: 'currency', currency: team.currency }).
  currency: varchar('currency', { length: 3 }).notNull().default('USD'),
  measurementSystem: varchar('measurement_system', { length: 10 }).notNull().default('metric'),
  // Tax identity for legal invoicing (Paraguay: every sale needs a factura
  // with RUC/CI + razón social). Captured at the first paid checkout
  // (/dashboard/checkout, Pagopar flow) and reused on renewals.
  taxDocumentType: varchar('tax_document_type', { length: 3 }).notNull().default('CI'), // 'CI' | 'RUC'
  taxId: varchar('tax_id', { length: 20 }),
  businessName: varchar('business_name', { length: 100 }),
});

export const teamMembers = pgTable(
  'team_members',
  {
    id: serial('id').primaryKey(),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    teamId: integer('team_id')
      .notNull()
      .references(() => teams.id),
    role: varchar('role', { length: 50 }).notNull(),
    joinedAt: timestamp('joined_at').notNull().defaultNow(),
  },
  (t) => [index('team_members_user_idx').on(t.userId), index('team_members_team_idx').on(t.teamId)],
);

export const activityLogs = pgTable(
  'activity_logs',
  {
    id: serial('id').primaryKey(),
    teamId: integer('team_id')
      .notNull()
      .references(() => teams.id),
    userId: integer('user_id').references(() => users.id),
    action: text('action').notNull(),
    timestamp: timestamp('timestamp').notNull().defaultNow(),
    ipAddress: varchar('ip_address', { length: 45 }),
  },
  (t) => [
    index('activity_logs_team_idx').on(t.teamId, t.timestamp),
    index('activity_logs_user_idx').on(t.userId, t.timestamp),
  ],
);

export const invitations = pgTable(
  'invitations',
  {
    id: serial('id').primaryKey(),
    teamId: integer('team_id')
      .notNull()
      .references(() => teams.id),
    email: varchar('email', { length: 255 }).notNull(),
    role: varchar('role', { length: 50 }).notNull(),
    invitedBy: integer('invited_by')
      .notNull()
      .references(() => users.id),
    invitedAt: timestamp('invited_at').notNull().defaultNow(),
    status: varchar('status', { length: 20 }).notNull().default('pending'),
  },
  (t) => [index('invitations_team_idx').on(t.teamId), index('invitations_email_idx').on(t.email)],
);

// Per-team API keys for MVP-to-MVP / external integrations.
// Only a SHA-256 hash of the key is stored; the plaintext is shown once at creation.
export const apiKeys = pgTable(
  'api_keys',
  {
    id: serial('id').primaryKey(),
    teamId: integer('team_id')
      .notNull()
      .references(() => teams.id),
    name: varchar('name', { length: 100 }).notNull(),
    keyHash: text('key_hash').notNull().unique(),
    keyPrefix: varchar('key_prefix', { length: 16 }).notNull(),
    createdBy: integer('created_by')
      .notNull()
      .references(() => users.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    lastUsedAt: timestamp('last_used_at'),
    revokedAt: timestamp('revoked_at'),
  },
  (t) => [index('api_keys_team_idx').on(t.teamId)],
);

// Durable half of the auth rate limit (see consumeRateLimit in ./rate-limit.ts):
// one fixed window per key, atomically upserted, so brute-force guards hold
// across instances. The in-memory rateLimit stays as the cheap burst guard.
export const rateLimits = pgTable('rate_limits', {
  key: varchar('key', { length: 255 }).primaryKey(),
  count: integer('count').notNull().default(0),
  resetAt: timestamp('reset_at').notNull(),
});

// Per-user in-app notifications. Content is an i18n key + JSON params (same
// pattern as insights) so the bell renders in the viewer's locale. Team-wide
// events insert one row per member — teams are small.
export const notifications = pgTable(
  'notifications',
  {
    id: serial('id').primaryKey(),
    teamId: integer('team_id')
      .notNull()
      .references(() => teams.id),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    messageKey: varchar('message_key', { length: 100 }).notNull(),
    params: text('params').notNull().default('{}'),
    href: varchar('href', { length: 255 }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    readAt: timestamp('read_at'),
  },
  (t) => [index('notifications_user_idx').on(t.userId, t.createdAt)],
);

// Durable background jobs (see enqueueJob/runJobs in ./jobs.ts): Postgres-backed
// queue with atomic claim (FOR UPDATE SKIP LOCKED), retries with exponential
// backoff, and a dead-letter status ('failed') after maxAttempts.
export const jobs = pgTable(
  'jobs',
  {
    id: serial('id').primaryKey(),
    teamId: integer('team_id').references(() => teams.id),
    type: varchar('type', { length: 100 }).notNull(),
    payload: text('payload').notNull().default('{}'),
    status: varchar('status', { length: 10 }).notNull().default('pending'), // pending|running|done|failed
    attempts: integer('attempts').notNull().default(0),
    maxAttempts: integer('max_attempts').notNull().default(3),
    runAt: timestamp('run_at').notNull().defaultNow(),
    lastError: text('last_error'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [index('jobs_pending_idx').on(t.status, t.runAt)],
);

// Stripe delivers webhooks at-least-once. We record every processed event id
// and skip duplicates, so a redelivery can never double-apply a handler (the
// current subscription handlers are idempotent, but any non-idempotent one an
// MVP adds — credits, emails — would otherwise double-fire on retry).
export const stripeEvents = pgTable('stripe_events', {
  id: text('id').primaryKey(), // Stripe event id (evt_…)
  type: varchar('type', { length: 100 }).notNull(),
  receivedAt: timestamp('received_at').notNull().defaultNow(),
});

// SIFEN electronic invoices (facturas) emitted after paid orders — one row per
// emitted document. `orderRef` is unique so the at-least-once job queue can
// never double-invoice; `cdc` is the 44-digit national control code (the legal
// reference — the PDF/KuDE lives with the emission provider).
export const invoices = pgTable('invoices', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
  orderRef: text('order_ref').notNull().unique(), // e.g. 'pagopar:<numero_pedido>'
  cdc: varchar('cdc', { length: 44 }),
  number: varchar('number', { length: 20 }),
  status: varchar('status', { length: 20 }).notNull().default('sent'),
  amount: integer('amount').notNull(), // whole guaraníes, IVA included
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Durable half of the AI rate limit: one row per team per day, atomically
// incremented before each AI call. The per-minute burst guard stays in-memory.
export const aiUsage = pgTable(
  'ai_usage',
  {
    teamId: integer('team_id')
      .notNull()
      .references(() => teams.id),
    day: date('day').notNull(),
    requests: integer('requests').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.teamId, t.day] })],
);

// Cron-generated findings (anomaly detection + suggestions). Content is stored
// as an i18n message key + JSON params so the UI renders in the viewer's locale.
export const insights = pgTable(
  'insights',
  {
    id: serial('id').primaryKey(),
    teamId: integer('team_id')
      .notNull()
      .references(() => teams.id),
    kind: varchar('kind', { length: 20 }).notNull(), // 'anomaly' | 'suggestion'
    severity: varchar('severity', { length: 10 }).notNull().default('info'), // 'info' | 'warning'
    messageKey: varchar('message_key', { length: 100 }).notNull(),
    params: text('params').notNull().default('{}'),
    // Stops the daily cron re-inserting the same finding (insert onConflictDoNothing).
    dedupeKey: varchar('dedupe_key', { length: 200 }).notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    dismissedAt: timestamp('dismissed_at'),
  },
  (t) => [uniqueIndex('insights_team_dedupe_idx').on(t.teamId, t.dedupeKey)],
);

export const teamsRelations = relations(teams, ({ many }) => ({
  teamMembers: many(teamMembers),
  activityLogs: many(activityLogs),
  invitations: many(invitations),
  apiKeys: many(apiKeys),
  insights: many(insights),
}));

export const insightsRelations = relations(insights, ({ one }) => ({
  team: one(teams, {
    fields: [insights.teamId],
    references: [teams.id],
  }),
}));

export const usersRelations = relations(users, ({ many }) => ({
  teamMembers: many(teamMembers),
  invitationsSent: many(invitations),
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
  team: one(teams, {
    fields: [invitations.teamId],
    references: [teams.id],
  }),
  invitedBy: one(users, {
    fields: [invitations.invitedBy],
    references: [users.id],
  }),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
  }),
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
  }),
}));

export const apiKeysRelations = relations(apiKeys, ({ one }) => ({
  team: one(teams, {
    fields: [apiKeys.teamId],
    references: [teams.id],
  }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  team: one(teams, {
    fields: [activityLogs.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
export type TeamMember = typeof teamMembers.$inferSelect;
export type NewTeamMember = typeof teamMembers.$inferInsert;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type NewActivityLog = typeof activityLogs.$inferInsert;
export type Invitation = typeof invitations.$inferSelect;
export type NewInvitation = typeof invitations.$inferInsert;
export type ApiKey = typeof apiKeys.$inferSelect;
export type NewApiKey = typeof apiKeys.$inferInsert;
export type Invoice = typeof invoices.$inferSelect;
export type NewInvoice = typeof invoices.$inferInsert;
export type StripeEvent = typeof stripeEvents.$inferSelect;
export type NewStripeEvent = typeof stripeEvents.$inferInsert;
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
export type Job = typeof jobs.$inferSelect;
export type NewJob = typeof jobs.$inferInsert;
export type AiUsage = typeof aiUsage.$inferSelect;
export type Insight = typeof insights.$inferSelect;
export type NewInsight = typeof insights.$inferInsert;
export type TeamDataWithMembers = Team & {
  teamMembers: (TeamMember & {
    user: Pick<User, 'id' | 'name' | 'email'>;
  })[];
};

export enum ActivityType {
  SIGN_UP = 'SIGN_UP',
  SIGN_IN = 'SIGN_IN',
  SIGN_OUT = 'SIGN_OUT',
  UPDATE_PASSWORD = 'UPDATE_PASSWORD',
  DELETE_ACCOUNT = 'DELETE_ACCOUNT',
  UPDATE_ACCOUNT = 'UPDATE_ACCOUNT',
  CREATE_TEAM = 'CREATE_TEAM',
  REMOVE_TEAM_MEMBER = 'REMOVE_TEAM_MEMBER',
  INVITE_TEAM_MEMBER = 'INVITE_TEAM_MEMBER',
  ACCEPT_INVITATION = 'ACCEPT_INVITATION',
}
