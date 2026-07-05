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
});

export const teamMembers = pgTable('team_members', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
  role: varchar('role', { length: 50 }).notNull(),
  joinedAt: timestamp('joined_at').notNull().defaultNow(),
});

export const activityLogs = pgTable('activity_logs', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
  userId: integer('user_id').references(() => users.id),
  action: text('action').notNull(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  ipAddress: varchar('ip_address', { length: 45 }),
});

export const invitations = pgTable('invitations', {
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
});

// Per-team API keys for MVP-to-MVP / external integrations.
// Only a SHA-256 hash of the key is stored; the plaintext is shown once at creation.
export const apiKeys = pgTable('api_keys', {
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
});

// Stripe delivers webhooks at-least-once. We record every processed event id
// and skip duplicates, so a redelivery can never double-apply a handler (the
// current subscription handlers are idempotent, but any non-idempotent one an
// MVP adds — credits, emails — would otherwise double-fire on retry).
export const stripeEvents = pgTable('stripe_events', {
  id: text('id').primaryKey(), // Stripe event id (evt_…)
  type: varchar('type', { length: 100 }).notNull(),
  receivedAt: timestamp('received_at').notNull().defaultNow(),
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
export type StripeEvent = typeof stripeEvents.$inferSelect;
export type NewStripeEvent = typeof stripeEvents.$inferInsert;
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
