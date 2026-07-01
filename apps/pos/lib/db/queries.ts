import { desc, and, eq, isNull, gte, sum, count, sql } from 'drizzle-orm'
import { db } from './drizzle'
import { verifyToken } from '@koeti/auth'
import { cookies } from 'next/headers'
import { activityLogs, teamMembers, teams, users } from '@koeti/db'
import {
  products, suppliers, supplierPayments, sales, saleItems,
  type Product, type Supplier, type Sale, type SaleItem,
} from '@/lib/db/schema'

export async function getUser() {
  const sessionCookie = (await cookies()).get('session')
  if (!sessionCookie?.value) return null
  const sessionData = await verifyToken(sessionCookie.value)
  if (!sessionData?.user || typeof sessionData.user.id !== 'number') return null
  if (new Date(sessionData.expires) < new Date()) return null
  const user = await db
    .select()
    .from(users)
    .where(and(eq(users.id, sessionData.user.id), isNull(users.deletedAt)))
    .limit(1)
  return user[0] ?? null
}

export async function getTeamByStripeCustomerId(customerId: string) {
  const result = await db.select().from(teams).where(eq(teams.stripeCustomerId, customerId)).limit(1)
  return result[0] ?? null
}

export async function updateTeamSubscription(
  teamId: number,
  data: {
    stripeSubscriptionId: string | null
    stripeProductId: string | null
    planName: string | null
    subscriptionStatus: string
  }
) {
  await db.update(teams).set({ ...data, updatedAt: new Date() }).where(eq(teams.id, teamId))
}

export async function getUserWithTeam(userId: number) {
  const result = await db
    .select({ user: users, teamId: teamMembers.teamId })
    .from(users)
    .leftJoin(teamMembers, eq(users.id, teamMembers.userId))
    .where(eq(users.id, userId))
    .limit(1)
  return result[0]
}

export async function getActivityLogs() {
  const user = await getUser()
  if (!user) throw new Error('User not authenticated')
  return await db
    .select({
      id: activityLogs.id,
      action: activityLogs.action,
      timestamp: activityLogs.timestamp,
      ipAddress: activityLogs.ipAddress,
      userName: users.name,
    })
    .from(activityLogs)
    .leftJoin(users, eq(activityLogs.userId, users.id))
    .where(eq(activityLogs.userId, user.id))
    .orderBy(desc(activityLogs.timestamp))
    .limit(10)
}

export async function getTeamForUser() {
  const user = await getUser()
  if (!user) return null
  const result = await db.query.teamMembers.findFirst({
    where: eq(teamMembers.userId, user.id),
    with: {
      team: {
        with: {
          teamMembers: {
            with: { user: { columns: { id: true, name: true, email: true } } },
          },
        },
      },
    },
  })
  return result?.team ?? null
}

export async function getProducts(teamId: number): Promise<Product[]> {
  return db.select().from(products).where(eq(products.teamId, teamId)).orderBy(products.name)
}

export async function getSuppliers(teamId: number): Promise<Supplier[]> {
  return db.select().from(suppliers).where(eq(suppliers.teamId, teamId)).orderBy(suppliers.name)
}

export async function getSupplierPayments(teamId: number) {
  return db
    .select({
      id: supplierPayments.id,
      supplierId: supplierPayments.supplierId,
      supplierName: suppliers.name,
      amount: supplierPayments.amount,
      description: supplierPayments.description,
      paidAt: supplierPayments.paidAt,
    })
    .from(supplierPayments)
    .innerJoin(suppliers, eq(supplierPayments.supplierId, suppliers.id))
    .where(eq(supplierPayments.teamId, teamId))
    .orderBy(desc(supplierPayments.paidAt))
}

export type SaleWithItems = Sale & {
  items: (SaleItem & { productName: string })[]
}

export async function getSales(teamId: number): Promise<SaleWithItems[]> {
  const rows = await db
    .select({
      id: sales.id,
      teamId: sales.teamId,
      userId: sales.userId,
      total: sales.total,
      status: sales.status,
      createdAt: sales.createdAt,
      itemId: saleItems.id,
      productId: saleItems.productId,
      qty: saleItems.qty,
      unitPrice: saleItems.unitPrice,
      productName: products.name,
    })
    .from(sales)
    .leftJoin(saleItems, eq(saleItems.saleId, sales.id))
    .leftJoin(products, eq(products.id, saleItems.productId))
    .where(eq(sales.teamId, teamId))
    .orderBy(desc(sales.createdAt))

  const map = new Map<number, SaleWithItems>()
  for (const row of rows) {
    if (!map.has(row.id)) {
      map.set(row.id, {
        id: row.id, teamId: row.teamId, userId: row.userId,
        total: row.total, status: row.status, createdAt: row.createdAt,
        items: [],
      })
    }
    if (row.itemId) {
      map.get(row.id)!.items.push({
        id: row.itemId, saleId: row.id, productId: row.productId!,
        qty: row.qty!, unitPrice: row.unitPrice!, productName: row.productName!,
      })
    }
  }
  return [...map.values()]
}

export async function getDashboardStats(teamId: number, since: Date) {
  const [salesRow] = await db
    .select({
      totalSales: sum(sales.total),
      saleCount: count(sales.id),
    })
    .from(sales)
    .where(and(eq(sales.teamId, teamId), eq(sales.status, 'paid'), gte(sales.createdAt, since)))

  const [paymentsRow] = await db
    .select({ totalPayments: sum(supplierPayments.amount) })
    .from(supplierPayments)
    .where(and(eq(supplierPayments.teamId, teamId), gte(supplierPayments.paidAt, since)))

  const topProducts = await db
    .select({
      productName: products.name,
      totalQty: sum(saleItems.qty),
      totalRevenue: sum(sql<number>`${saleItems.qty} * ${saleItems.unitPrice}`),
    })
    .from(saleItems)
    .innerJoin(sales, eq(saleItems.saleId, sales.id))
    .innerJoin(products, eq(saleItems.productId, products.id))
    .where(and(eq(sales.teamId, teamId), eq(sales.status, 'paid'), gte(sales.createdAt, since)))
    .groupBy(products.id, products.name)
    .orderBy(desc(sql`sum(${saleItems.qty})`))
    .limit(5)

  return {
    totalSales: parseFloat(salesRow?.totalSales ?? '0'),
    saleCount: Number(salesRow?.saleCount ?? 0),
    totalPayments: parseFloat(paymentsRow?.totalPayments ?? '0'),
    topProducts,
  }
}
