'use server';
// Server actions for /dashboard/purchase-orders.
// Approve/receive/cancel are hand-written (admin-gated — this is where the
// "manager" business role lands, see spec Decision #13) because they're
// state transitions, not validated insert/update/delete.

import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { crudActions } from '@/lib/crud';
import { withTeam } from '@/lib/auth/middleware';
import { db } from '@/lib/db/drizzle';
import { products, purchaseOrders, stockMovements } from '@/lib/db/schema';

const actions = crudActions(purchaseOrders, {
  path: '/dashboard/purchase-orders',
  schema: z.object({
    supplierId: z.coerce.number().int(),
    productId: z.coerce.number().int(),
    warehouseId: z.coerce.number().int(),
    orderedQty: z.coerce.number().int().positive('Ordered quantity must be greater than 0'),
    unitCost: z.coerce.number().min(0, 'Unit cost must be 0 or more'),
    expectedDate: z.string().optional().or(z.literal('')),
  }),
});
export const createPurchaseOrder = actions.create;
export const deletePurchaseOrder = actions.remove;

export const approvePurchaseOrder = withTeam(async (formData, team) => {
  const id = Number(formData.get('id'));
  if (!Number.isInteger(id)) return { error: 'Missing record id' };
  await db
    .update(purchaseOrders)
    .set({ status: 'approved', updatedAt: new Date() })
    .where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.teamId, team.id)));
  revalidatePath('/dashboard/purchase-orders');
}, 'admin');

export const cancelPurchaseOrder = withTeam(async (formData, team) => {
  const id = Number(formData.get('id'));
  if (!Number.isInteger(id)) return { error: 'Missing record id' };
  await db
    .update(purchaseOrders)
    .set({ status: 'cancelled', updatedAt: new Date() })
    .where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.teamId, team.id)));
  revalidatePath('/dashboard/purchase-orders');
}, 'admin');

const receiveSchema = z.object({
  id: z.coerce.number().int(),
  qty: z.coerce.number().int().positive('Received quantity must be greater than 0'),
});

export const receivePurchaseOrder = withTeam(async (formData, team, user) => {
  const parsed = receiveSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.errors[0].message };
  const { id, qty } = parsed.data;

  const [po] = await db
    .select()
    .from(purchaseOrders)
    .where(and(eq(purchaseOrders.id, id), eq(purchaseOrders.teamId, team.id)))
    .limit(1);
  if (!po) return { error: 'Purchase order not found' };
  if (po.status !== 'approved' && po.status !== 'partial') {
    return { error: 'Only approved orders can receive stock' };
  }
  const newReceivedQty = po.receivedQty + qty;
  if (newReceivedQty > po.orderedQty) {
    return { error: `Cannot receive more than the ${po.orderedQty} ordered` };
  }

  await db.transaction(async (tx) => {
    const [product] = await tx
      .select()
      .from(products)
      .where(eq(products.id, po.productId))
      .limit(1);

    // Weighted-average cost recompute (Decision #8), same formula as
    // stock-movements/actions.ts — prior stock is summed BEFORE inserting
    // this receipt's row below.
    if (product) {
      const priorRows = await tx
        .select({ quantity: stockMovements.quantity, type: stockMovements.type })
        .from(stockMovements)
        .where(and(eq(stockMovements.productId, po.productId), eq(stockMovements.teamId, team.id)));
      const priorStock = priorRows.reduce((sum, r) => {
        if (r.type === 'purchase' || r.type === 'return' || r.type === 'transfer_in')
          return sum + r.quantity;
        if (r.type === 'sale' || r.type === 'damage' || r.type === 'transfer_out')
          return sum - r.quantity;
        return sum + r.quantity; // adjustment: already signed
      }, 0);
      const priorAvg = Number(product.avgCost);
      const unitCost = Number(po.unitCost);
      const newAvgCost =
        priorStock > 0 ? (priorStock * priorAvg + qty * unitCost) / (priorStock + qty) : unitCost;
      await tx
        .update(products)
        .set({
          avgCost: newAvgCost,
          updatedAt: new Date(),
        } as unknown as Partial<typeof products.$inferInsert>)
        .where(eq(products.id, po.productId));
    }

    await tx.insert(stockMovements).values({
      teamId: team.id,
      productId: po.productId,
      warehouseId: po.warehouseId,
      type: 'purchase',
      quantity: qty,
      unitCost: po.unitCost,
      note: `PO #${po.id}`,
      createdBy: user.id,
    } as typeof stockMovements.$inferInsert);

    await tx
      .update(purchaseOrders)
      .set({
        receivedQty: newReceivedQty,
        status: newReceivedQty === po.orderedQty ? 'received' : 'partial',
        updatedAt: new Date(),
      })
      .where(eq(purchaseOrders.id, po.id));
  });

  revalidatePath('/dashboard/purchase-orders');
  revalidatePath('/dashboard/products');
}, 'admin');
