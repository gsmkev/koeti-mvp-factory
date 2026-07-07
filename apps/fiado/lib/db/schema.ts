// App-specific tables go here.
// Base tables (users, teams, teamMembers, activityLogs, invitations) are in @koeti/db.

import { index, integer, numeric, pgTable, serial, timestamp, varchar } from 'drizzle-orm/pg-core';
import { teams } from '@koeti/db';

export const productos = pgTable(
  'productos',
  {
    id: serial('id').primaryKey(),
    teamId: integer('team_id')
      .notNull()
      .references(() => teams.id),
    name: varchar('name', { length: 255 }).notNull(),
    price: numeric('price', { precision: 12, scale: 2 }).notNull(),
    stock: integer('stock').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [index('productos_team_idx').on(t.teamId, t.createdAt)],
);
export type Producto = typeof productos.$inferSelect;

export const clientes = pgTable(
  'clientes',
  {
    id: serial('id').primaryKey(),
    teamId: integer('team_id')
      .notNull()
      .references(() => teams.id),
    name: varchar('name', { length: 255 }).notNull(),
    phone: varchar('phone', { length: 50 }),
    // 0 = sin límite de crédito.
    creditLimit: numeric('credit_limit', { precision: 12, scale: 2 }).notNull().default('0'),
    // Saldo de deuda, mantenido de forma transaccional por la venta/pago que lo modifica.
    balance: numeric('balance', { precision: 12, scale: 2 }).notNull().default('0'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [index('clientes_team_idx').on(t.teamId, t.createdAt)],
);
export type Cliente = typeof clientes.$inferSelect;

export const ventas = pgTable(
  'ventas',
  {
    id: serial('id').primaryKey(),
    teamId: integer('team_id')
      .notNull()
      .references(() => teams.id),
    clienteId: integer('cliente_id').references(() => clientes.id),
    paymentType: varchar('payment_type', { length: 10 }).notNull(), // 'contado' | 'fiado'
    total: numeric('total', { precision: 12, scale: 2 }).notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [
    index('ventas_team_idx').on(t.teamId, t.createdAt),
    index('ventas_cliente_idx').on(t.clienteId, t.createdAt),
  ],
);
export type Venta = typeof ventas.$inferSelect;

export const ventaItems = pgTable('venta_items', {
  id: serial('id').primaryKey(),
  ventaId: integer('venta_id')
    .notNull()
    .references(() => ventas.id),
  productoId: integer('producto_id')
    .notNull()
    .references(() => productos.id),
  qty: integer('qty').notNull(),
  unitPrice: numeric('unit_price', { precision: 12, scale: 2 }).notNull(),
});
export type VentaItem = typeof ventaItems.$inferSelect;

export const pagos = pgTable(
  'pagos',
  {
    id: serial('id').primaryKey(),
    teamId: integer('team_id')
      .notNull()
      .references(() => teams.id),
    clienteId: integer('cliente_id')
      .notNull()
      .references(() => clientes.id),
    amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
    note: varchar('note', { length: 255 }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [index('pagos_cliente_idx').on(t.clienteId, t.createdAt)],
);
export type Pago = typeof pagos.$inferSelect;

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
  Notification,
  Job,
  TeamDataWithMembers,
} from '@koeti/db';
export { ActivityType } from '@koeti/db';
