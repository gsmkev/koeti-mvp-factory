// App-specific tables go here.
// Base tables (users, teams, teamMembers, activityLogs, invitations) are in @koeti/db.

import { date, integer, numeric, pgTable, serial, timestamp, varchar } from 'drizzle-orm/pg-core';
import { teams } from '@koeti/db';

export const expenses = pgTable('expenses', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  category: varchar('category', { length: 50 }).notNull(),
  description: varchar('description', { length: 255 }).notNull(),
  spentAt: date('spent_at').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});
export type Expense = typeof expenses.$inferSelect;

// Re-export base types for convenience
export type {
  User,
  NewUser,
  Team,
  NewTeam,
  TeamMember,
  NewTeamMember,
  ActivityLog,
  NewActivityLog,
  Invitation,
  NewInvitation,
  TeamDataWithMembers,
} from '@koeti/db';
export { ActivityType } from '@koeti/db';
