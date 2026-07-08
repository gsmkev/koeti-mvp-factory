// saas-template lib — queries.
import {
  desc,
  asc,
  and,
  eq,
  gte,
  lte,
  ilike,
  or,
  inArray,
  isNotNull,
  isNull,
  sql,
} from 'drizzle-orm';
import { db } from './drizzle';
import { verifyToken, credentialFingerprint } from '@koeti/auth';
import { cookies } from 'next/headers';
import {
  activityLogs,
  apiKeys,
  insights,
  invitations,
  invoices,
  teamMembers,
  teams,
  users,
} from '@koeti/db';
import {
  products,
  warehouses,
  warehouseAssignments,
  suppliers,
  stockMovements,
  purchaseOrders,
  type MovementType,
  type PurchaseOrderStatus,
} from './schema';

export async function getUser() {
  const sessionCookie = (await cookies()).get('session');
  if (!sessionCookie?.value) return null;
  const sessionData = await verifyToken(sessionCookie.value);
  if (!sessionData?.user || typeof sessionData.user.id !== 'number') return null;
  if (new Date(sessionData.expires) < new Date()) return null;
  const user = await db
    .select()
    .from(users)
    .where(and(eq(users.id, sessionData.user.id), isNull(users.deletedAt)))
    .limit(1);
  const found = user[0] ?? null;
  if (!found) return null;
  // Revoke sessions minted before a password change/reset. Only enforced when
  // the token carries a fingerprint — legacy/test sessions without one keep
  // working until they expire.
  if (sessionData.fp && sessionData.fp !== credentialFingerprint(found.passwordHash)) {
    return null;
  }
  return found;
}

export async function getTeamByStripeCustomerId(customerId: string) {
  const result = await db
    .select()
    .from(teams)
    .where(eq(teams.stripeCustomerId, customerId))
    .limit(1);
  return result[0] ?? null;
}

export async function updateTeamSubscription(
  teamId: number,
  data: {
    stripeSubscriptionId: string | null;
    stripeProductId: string | null;
    planName: string | null;
    subscriptionStatus: string;
  },
) {
  await db
    .update(teams)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(teams.id, teamId));
}

export async function getUserWithTeam(userId: number) {
  const result = await db
    .select({ user: users, teamId: teamMembers.teamId })
    .from(users)
    .leftJoin(teamMembers, eq(users.id, teamMembers.userId))
    .where(eq(users.id, userId))
    .limit(1);
  return result[0];
}

// SIFEN facturas emitted for this team (written by the sifen-invoice job).
// Unbounded over time → paginated per .claude/rules/crud.md §2.
export const INVOICES_PAGE_SIZE = 50;
export async function getInvoices(teamId: number, page = 1) {
  return db
    .select()
    .from(invoices)
    .where(eq(invoices.teamId, teamId))
    .orderBy(desc(invoices.createdAt))
    .limit(INVOICES_PAGE_SIZE + 1)
    .offset((page - 1) * INVOICES_PAGE_SIZE);
}

export async function getActivityLogs() {
  const user = await getUser();
  if (!user) throw new Error('User not authenticated');
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
    .limit(10);
}

// Cross-tenant by design — callers MUST gate with isSuperadmin() first.
export async function getAdminTeamsOverview() {
  return db
    .select({
      id: teams.id,
      name: teams.name,
      planName: teams.planName,
      subscriptionStatus: teams.subscriptionStatus,
      createdAt: teams.createdAt,
      memberCount: sql<number>`count(${teamMembers.id})::int`,
    })
    .from(teams)
    .leftJoin(teamMembers, eq(teams.id, teamMembers.teamId))
    .groupBy(teams.id)
    .orderBy(desc(teams.createdAt));
}

export async function getInsights(teamId: number) {
  return db
    .select()
    .from(insights)
    .where(and(eq(insights.teamId, teamId), isNull(insights.dismissedAt)))
    .orderBy(desc(insights.createdAt))
    .limit(50);
}

export async function getApiKeys(teamId: number) {
  return db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.teamId, teamId))
    .orderBy(desc(apiKeys.createdAt));
}

export async function getPendingInvitations(teamId: number) {
  return db
    .select({
      id: invitations.id,
      email: invitations.email,
      role: invitations.role,
      invitedAt: invitations.invitedAt,
    })
    .from(invitations)
    .where(and(eq(invitations.teamId, teamId), eq(invitations.status, 'pending')))
    .orderBy(desc(invitations.invitedAt));
}

export async function getTeamForUser() {
  const user = await getUser();
  if (!user) return null;
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
  });
  return result?.team ?? null;
}

// --- inventario ---

// Signed contribution to stock — purchase/return/transfer_in add, sale/damage/
// transfer_out subtract, adjustment is stored already-signed (can be +/-).
const signedQty = sql`case
  when ${stockMovements.type} in ('purchase','return','transfer_in') then ${stockMovements.quantity}
  when ${stockMovements.type} in ('sale','damage','transfer_out') then -${stockMovements.quantity}
  else ${stockMovements.quantity}
end`;

export async function getProducts(
  teamId: number,
  filters?: { q?: string; category?: string; active?: boolean },
) {
  const conditions = [eq(products.teamId, teamId)];
  if (filters?.q) {
    const like = `%${filters.q}%`;
    conditions.push(
      or(ilike(products.sku, like), ilike(products.name, like), ilike(products.barcode, like))!,
    );
  }
  if (filters?.category) conditions.push(eq(products.category, filters.category));
  if (filters?.active !== undefined) conditions.push(eq(products.active, filters.active));
  return db
    .select()
    .from(products)
    .where(and(...conditions))
    .orderBy(products.name);
}

export async function getProductCategories(teamId: number) {
  const rows = await db
    .selectDistinct({ category: products.category })
    .from(products)
    .where(eq(products.teamId, teamId))
    .orderBy(products.category);
  return rows.map((r) => r.category);
}

// productId -> total stock across every warehouse.
export async function getStockByProduct(teamId: number) {
  const rows = await db
    .select({
      productId: stockMovements.productId,
      stock: sql<number>`coalesce(sum(${signedQty}), 0)::int`,
    })
    .from(stockMovements)
    .where(eq(stockMovements.teamId, teamId))
    .groupBy(stockMovements.productId);
  return new Map(rows.map((r) => [r.productId, r.stock]));
}

export async function getStockByProductWarehouse(teamId: number, productId: number) {
  return db
    .select({
      warehouseId: stockMovements.warehouseId,
      warehouseName: warehouses.name,
      stock: sql<number>`coalesce(sum(${signedQty}), 0)::int`,
    })
    .from(stockMovements)
    .innerJoin(warehouses, eq(warehouses.id, stockMovements.warehouseId))
    .where(and(eq(stockMovements.teamId, teamId), eq(stockMovements.productId, productId)))
    .groupBy(stockMovements.warehouseId, warehouses.name)
    .orderBy(warehouses.name);
}

export async function getWarehouses(teamId: number) {
  return db.select().from(warehouses).where(eq(warehouses.teamId, teamId)).orderBy(warehouses.name);
}

export async function getWarehouseAssignments(teamId: number) {
  return db
    .select({
      id: warehouseAssignments.id,
      userId: warehouseAssignments.userId,
      userName: users.name,
      userEmail: users.email,
      warehouseId: warehouseAssignments.warehouseId,
      warehouseName: warehouses.name,
    })
    .from(warehouseAssignments)
    .innerJoin(users, eq(users.id, warehouseAssignments.userId))
    .innerJoin(warehouses, eq(warehouses.id, warehouseAssignments.warehouseId))
    .where(eq(warehouseAssignments.teamId, teamId))
    .orderBy(warehouses.name);
}

export async function getAssignedWarehouseId(teamId: number, userId: number) {
  const [row] = await db
    .select({ warehouseId: warehouseAssignments.warehouseId })
    .from(warehouseAssignments)
    .where(and(eq(warehouseAssignments.teamId, teamId), eq(warehouseAssignments.userId, userId)))
    .limit(1);
  return row?.warehouseId ?? null;
}

export async function getSuppliers(teamId: number) {
  return db.select().from(suppliers).where(eq(suppliers.teamId, teamId)).orderBy(suppliers.name);
}

export const MOVEMENTS_PAGE_SIZE = 50;

export async function getStockMovements(
  teamId: number,
  filters?: {
    productId?: number;
    warehouseId?: number;
    type?: MovementType;
    from?: string;
    to?: string;
  },
  page?: number,
) {
  const conditions = [eq(stockMovements.teamId, teamId)];
  if (filters?.productId) conditions.push(eq(stockMovements.productId, filters.productId));
  if (filters?.warehouseId) conditions.push(eq(stockMovements.warehouseId, filters.warehouseId));
  if (filters?.type) conditions.push(eq(stockMovements.type, filters.type));
  if (filters?.from) conditions.push(gte(stockMovements.createdAt, new Date(filters.from)));
  if (filters?.to) conditions.push(lte(stockMovements.createdAt, new Date(filters.to)));
  const q = db
    .select({
      id: stockMovements.id,
      type: stockMovements.type,
      quantity: stockMovements.quantity,
      unitCost: stockMovements.unitCost,
      batchNumber: stockMovements.batchNumber,
      expiresAt: stockMovements.expiresAt,
      note: stockMovements.note,
      createdAt: stockMovements.createdAt,
      productId: stockMovements.productId,
      productName: products.name,
      productSku: products.sku,
      warehouseId: stockMovements.warehouseId,
      warehouseName: warehouses.name,
      userName: users.name,
    })
    .from(stockMovements)
    .innerJoin(products, eq(products.id, stockMovements.productId))
    .innerJoin(warehouses, eq(warehouses.id, stockMovements.warehouseId))
    .innerJoin(users, eq(users.id, stockMovements.createdBy))
    .where(and(...conditions))
    .orderBy(desc(stockMovements.createdAt), desc(stockMovements.id));
  if (!page) return q;
  return q.limit(MOVEMENTS_PAGE_SIZE + 1).offset((page - 1) * MOVEMENTS_PAGE_SIZE);
}

export async function getLowStockProducts(
  teamId: number,
  filters?: { warehouseId?: number; category?: string },
) {
  const stockConditions = [eq(stockMovements.teamId, teamId)];
  if (filters?.warehouseId)
    stockConditions.push(eq(stockMovements.warehouseId, filters.warehouseId));
  const stockRows = await db
    .select({
      productId: stockMovements.productId,
      stock: sql<number>`coalesce(sum(${signedQty}), 0)::int`,
    })
    .from(stockMovements)
    .where(and(...stockConditions))
    .groupBy(stockMovements.productId);
  const stockMap = new Map(stockRows.map((r) => [r.productId, r.stock]));

  const productConditions = [eq(products.teamId, teamId), eq(products.active, true)];
  if (filters?.category) productConditions.push(eq(products.category, filters.category));
  const allProducts = await db
    .select()
    .from(products)
    .where(and(...productConditions));
  return allProducts
    .map((p) => ({ ...p, stock: stockMap.get(p.id) ?? 0 }))
    .filter((p) => p.stock <= p.minStock)
    .sort((a, b) => a.stock - b.stock);
}

// Expiring batches — the receipt row IS the batch record (Decision #6). Not
// netted against later sales/damage of that batch: tracking per-batch
// consumption is FIFO-grade bookkeeping we deliberately left out of v1.
export async function getExpiringSoon(
  teamId: number,
  days: number,
  filters?: { warehouseId?: number },
) {
  const conditions = [
    eq(stockMovements.teamId, teamId),
    isNotNull(stockMovements.expiresAt),
    sql`${stockMovements.expiresAt} <= (current_date + ${days} * interval '1 day')`,
    inArray(stockMovements.type, ['purchase', 'return', 'transfer_in']),
  ];
  if (filters?.warehouseId) conditions.push(eq(stockMovements.warehouseId, filters.warehouseId));
  return db
    .select({
      id: stockMovements.id,
      productId: stockMovements.productId,
      productName: products.name,
      productSku: products.sku,
      warehouseName: warehouses.name,
      batchNumber: stockMovements.batchNumber,
      expiresAt: stockMovements.expiresAt,
      quantity: stockMovements.quantity,
    })
    .from(stockMovements)
    .innerJoin(products, eq(products.id, stockMovements.productId))
    .innerJoin(warehouses, eq(warehouses.id, stockMovements.warehouseId))
    .where(and(...conditions))
    .orderBy(stockMovements.expiresAt);
}

export async function getTopProducts(
  teamId: number,
  direction: 'best' | 'worst' = 'best',
  limit = 5,
) {
  const totalQty = sql`sum(${stockMovements.quantity})`;
  return db
    .select({
      productId: stockMovements.productId,
      productName: products.name,
      qty: sql<number>`${totalQty}::int`,
    })
    .from(stockMovements)
    .innerJoin(products, eq(products.id, stockMovements.productId))
    .where(and(eq(stockMovements.teamId, teamId), eq(stockMovements.type, 'sale')))
    .groupBy(stockMovements.productId, products.name)
    .orderBy(direction === 'best' ? desc(totalQty) : asc(totalQty))
    .limit(limit);
}

export async function getPurchaseOrders(
  teamId: number,
  filters?: {
    supplierId?: number;
    status?: PurchaseOrderStatus;
    from?: string;
    to?: string;
  },
) {
  const conditions = [eq(purchaseOrders.teamId, teamId)];
  if (filters?.supplierId) conditions.push(eq(purchaseOrders.supplierId, filters.supplierId));
  if (filters?.status) conditions.push(eq(purchaseOrders.status, filters.status));
  if (filters?.from) conditions.push(gte(purchaseOrders.expectedDate, filters.from));
  if (filters?.to) conditions.push(lte(purchaseOrders.expectedDate, filters.to));
  return db
    .select({
      id: purchaseOrders.id,
      supplierId: purchaseOrders.supplierId,
      supplierName: suppliers.name,
      productId: purchaseOrders.productId,
      productName: products.name,
      warehouseId: purchaseOrders.warehouseId,
      warehouseName: warehouses.name,
      orderedQty: purchaseOrders.orderedQty,
      receivedQty: purchaseOrders.receivedQty,
      unitCost: purchaseOrders.unitCost,
      expectedDate: purchaseOrders.expectedDate,
      status: purchaseOrders.status,
      createdAt: purchaseOrders.createdAt,
    })
    .from(purchaseOrders)
    .innerJoin(suppliers, eq(suppliers.id, purchaseOrders.supplierId))
    .innerJoin(products, eq(products.id, purchaseOrders.productId))
    .innerJoin(warehouses, eq(warehouses.id, purchaseOrders.warehouseId))
    .where(and(...conditions))
    .orderBy(desc(purchaseOrders.createdAt));
}

export async function getPurchaseOrderById(teamId: number, id: number) {
  const [row] = await db
    .select()
    .from(purchaseOrders)
    .where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.teamId, teamId)))
    .limit(1);
  return row ?? null;
}
