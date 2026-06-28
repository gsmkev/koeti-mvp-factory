import {
  pgTable, serial, integer, varchar, text, timestamp, numeric,
} from 'drizzle-orm/pg-core'
import { teams, users } from '@koeti/db'

export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id').notNull().references(() => teams.id),
  name: varchar('name', { length: 100 }).notNull(),
  sku: varchar('sku', { length: 50 }),
  // numeric columns return string in JS — coerce to Number() at usage sites
  price: numeric('price', { precision: 10, scale: 2 }).notNull(),
  stock: integer('stock').notNull().default(0),
})

export const sales = pgTable('sales', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id').notNull().references(() => teams.id),
  userId: integer('user_id').notNull().references(() => users.id),
  // numeric columns return string in JS — coerce to Number() at usage sites
  total: numeric('total', { precision: 10, scale: 2 }).notNull(),
  status: varchar('status', { length: 20 }).notNull().default('paid'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const saleItems = pgTable('sale_items', {
  id: serial('id').primaryKey(),
  saleId: integer('sale_id').notNull().references(() => sales.id),
  productId: integer('product_id').notNull().references(() => products.id),
  qty: integer('qty').notNull(),
  // numeric columns return string in JS — coerce to Number() at usage sites
  unitPrice: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
})

export const suppliers = pgTable('suppliers', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id').notNull().references(() => teams.id),
  name: varchar('name', { length: 100 }).notNull(),
  contact: text('contact'),
})

export const supplierPayments = pgTable('supplier_payments', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id').notNull().references(() => teams.id),
  supplierId: integer('supplier_id').notNull().references(() => suppliers.id),
  // numeric columns return string in JS — coerce to Number() at usage sites
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  description: text('description').notNull(),
  paidAt: timestamp('paid_at').notNull().defaultNow(),
})

// Types
export type Product = typeof products.$inferSelect
export type NewProduct = typeof products.$inferInsert
export type Sale = typeof sales.$inferSelect
export type NewSale = typeof sales.$inferInsert
export type SaleItem = typeof saleItems.$inferSelect
export type NewSaleItem = typeof saleItems.$inferInsert
export type Supplier = typeof suppliers.$inferSelect
export type NewSupplier = typeof suppliers.$inferInsert
export type SupplierPayment = typeof supplierPayments.$inferSelect
export type NewSupplierPayment = typeof supplierPayments.$inferInsert

// Re-export base types
export type {
  User, Team, TeamMember, TeamDataWithMembers,
  ActivityLog, Invitation,
} from '@koeti/db'
export { ActivityType } from '@koeti/db'
