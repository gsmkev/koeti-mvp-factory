// App-specific tables go here.
// Base tables (users, teams, teamMembers, activityLogs, invitations) are in @koeti/db.

import {
  boolean,
  date,
  index,
  integer,
  numeric,
  pgTable,
  serial,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/pg-core';
import { teams, users } from '@koeti/db';

export const products = pgTable(
  'products',
  {
    id: serial('id').primaryKey(),
    teamId: integer('team_id')
      .notNull()
      .references(() => teams.id),
    sku: varchar('sku', { length: 100 }).notNull(),
    name: varchar('name', { length: 255 }).notNull(),
    category: varchar('category', { length: 100 }).notNull(),
    unit: varchar('unit', { length: 20 }).notNull(),
    barcode: varchar('barcode', { length: 100 }),
    variant: varchar('variant', { length: 100 }),
    cost: numeric('cost', { precision: 12, scale: 2 }).notNull(),
    avgCost: numeric('avg_cost', { precision: 12, scale: 2 }).notNull(),
    price: numeric('price', { precision: 12, scale: 2 }).notNull(),
    minStock: integer('min_stock').notNull().default(0),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [
    index('products_team_idx').on(t.teamId, t.sku),
    index('products_category_idx').on(t.teamId, t.category),
  ],
);
export type Product = typeof products.$inferSelect;

export const warehouses = pgTable(
  'warehouses',
  {
    id: serial('id').primaryKey(),
    teamId: integer('team_id')
      .notNull()
      .references(() => teams.id),
    name: varchar('name', { length: 255 }).notNull(),
    location: varchar('location', { length: 255 }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [index('warehouses_team_idx').on(t.teamId)],
);
export type Warehouse = typeof warehouses.$inferSelect;

// One row per staff member assigned to a single warehouse — enforces the
// "almacenero" restriction in stock-movements/actions.ts. A member needing
// more than one warehouse is simply made `admin` instead of assigned twice.
export const warehouseAssignments = pgTable(
  'warehouse_assignments',
  {
    id: serial('id').primaryKey(),
    teamId: integer('team_id')
      .notNull()
      .references(() => teams.id),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id),
    warehouseId: integer('warehouse_id')
      .notNull()
      .references(() => warehouses.id),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [index('warehouse_assignments_team_user_idx').on(t.teamId, t.userId)],
);
export type WarehouseAssignment = typeof warehouseAssignments.$inferSelect;

export const suppliers = pgTable(
  'suppliers',
  {
    id: serial('id').primaryKey(),
    teamId: integer('team_id')
      .notNull()
      .references(() => teams.id),
    name: varchar('name', { length: 255 }).notNull(),
    contactName: varchar('contact_name', { length: 255 }),
    phone: varchar('phone', { length: 50 }),
    email: varchar('email', { length: 255 }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [index('suppliers_team_idx').on(t.teamId)],
);
export type Supplier = typeof suppliers.$inferSelect;

// Movement types: sign is implied — purchase/return/transfer_in are +stock,
// sale/damage/transfer_out are -stock, adjustment can go either direction
// (its quantity is signed, unlike the others which are always positive).
export const MOVEMENT_TYPES = [
  'purchase',
  'sale',
  'return',
  'damage',
  'adjustment',
  'transfer_out',
  'transfer_in',
] as const;
export type MovementType = (typeof MOVEMENT_TYPES)[number];

// The append-only inventory ledger — the audit trail. No update/delete: a
// mistake gets corrected with a new `adjustment` row, never edited away.
export const stockMovements = pgTable(
  'stock_movements',
  {
    id: serial('id').primaryKey(),
    teamId: integer('team_id')
      .notNull()
      .references(() => teams.id),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id),
    warehouseId: integer('warehouse_id')
      .notNull()
      .references(() => warehouses.id),
    type: varchar('type', { length: 20 }).notNull().$type<MovementType>(),
    quantity: integer('quantity').notNull(),
    unitCost: numeric('unit_cost', { precision: 12, scale: 2 }),
    batchNumber: varchar('batch_number', { length: 100 }),
    expiresAt: date('expires_at'),
    note: text('note'),
    createdBy: integer('created_by')
      .notNull()
      .references(() => users.id),
    relatedMovementId: integer('related_movement_id'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (t) => [
    index('stock_movements_product_wh_idx').on(t.teamId, t.productId, t.warehouseId),
    index('stock_movements_team_date_idx').on(t.teamId, t.createdAt),
  ],
);
export type StockMovement = typeof stockMovements.$inferSelect;

export const PURCHASE_ORDER_STATUSES = [
  'draft',
  'submitted',
  'approved',
  'partial',
  'received',
  'cancelled',
] as const;
export type PurchaseOrderStatus = (typeof PURCHASE_ORDER_STATUSES)[number];

// One line item per row (see spec Decision #7) — a multi-product order is
// multiple rows sharing a supplier + expectedDate.
export const purchaseOrders = pgTable(
  'purchase_orders',
  {
    id: serial('id').primaryKey(),
    teamId: integer('team_id')
      .notNull()
      .references(() => teams.id),
    supplierId: integer('supplier_id')
      .notNull()
      .references(() => suppliers.id),
    productId: integer('product_id')
      .notNull()
      .references(() => products.id),
    orderedQty: integer('ordered_qty').notNull(),
    receivedQty: integer('received_qty').notNull().default(0),
    unitCost: numeric('unit_cost', { precision: 12, scale: 2 }).notNull(),
    expectedDate: date('expected_date'),
    status: varchar('status', { length: 20 })
      .notNull()
      .default('draft')
      .$type<PurchaseOrderStatus>(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (t) => [index('purchase_orders_team_status_idx').on(t.teamId, t.status)],
);
export type PurchaseOrder = typeof purchaseOrders.$inferSelect;

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
