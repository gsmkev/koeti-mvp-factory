'use server';
// Server action for /dashboard/stock-movements — the only way to touch the
// append-only ledger. No update/delete: corrections are a new `adjustment`
// row, never an edit (see schema.ts).

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { roleAtLeast } from '@koeti/auth';
import { withTeam, teamRoleFor } from '@/lib/auth/middleware';
import { db } from '@/lib/db/drizzle';
import { products, stockMovements } from '@/lib/db/schema';
import { getAssignedWarehouseId, getStockByProductWarehouse } from '@/lib/db/queries';
import { eq } from 'drizzle-orm';

// UI-level type: 'transfer' fans out into a transfer_out/transfer_in pair.
// The other five map 1:1 onto the stored MovementType.
const FORM_TYPES = ['purchase', 'sale', 'return', 'damage', 'adjustment', 'transfer'] as const;
const OUTBOUND_TYPES = new Set(['sale', 'damage']);

const schema = z.object({
  productId: z.coerce.number().int(),
  warehouseId: z.coerce.number().int(),
  type: z.enum(FORM_TYPES),
  quantity: z.coerce.number().int(),
  unitCost: z.coerce.number().min(0).optional(),
  batchNumber: z.string().max(100).optional().or(z.literal('')),
  expiresAt: z.string().optional().or(z.literal('')),
  note: z.string().max(500).optional().or(z.literal('')),
  destinationWarehouseId: z.coerce.number().int().optional(),
});

export const createStockMovement = withTeam(async (formData, team, user) => {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.errors[0].message };
  const data = parsed.data;

  const role = teamRoleFor(user, team);
  const isManagerUp = roleAtLeast(role, 'admin');

  if (data.type === 'adjustment') {
    if (!isManagerUp) return { error: 'Only managers/admins can post stock adjustments' };
    if (data.quantity === 0) return { error: 'Adjustment quantity cannot be 0' };
  } else if (data.quantity <= 0) {
    return { error: 'Quantity must be greater than 0' };
  }

  if (data.type === 'transfer') {
    if (!data.destinationWarehouseId || data.destinationWarehouseId === data.warehouseId) {
      return { error: 'Pick a different destination warehouse for the transfer' };
    }
  }

  // Almacenero: scoped to their assigned warehouse (Decision #9). Admin+ (the
  // "manager" tier) isn't restricted.
  if (!isManagerUp) {
    const assignedWarehouseId = await getAssignedWarehouseId(team.id, user.id);
    if (!assignedWarehouseId) return { error: 'You are not assigned to a warehouse' };
    const touchesAssigned =
      data.warehouseId === assignedWarehouseId ||
      (data.type === 'transfer' && data.destinationWarehouseId === assignedWarehouseId);
    if (!touchesAssigned) {
      return { error: 'You can only post movements for your assigned warehouse' };
    }
  }

  // Stock-negative guard for outbound movements (adjustment is an explicit
  // correction and may legitimately go negative-then-corrected).
  if (data.type !== 'adjustment' && (OUTBOUND_TYPES.has(data.type) || data.type === 'transfer')) {
    const breakdown = await getStockByProductWarehouse(team.id, data.productId);
    const available = breakdown.find((b) => b.warehouseId === data.warehouseId)?.stock ?? 0;
    if (available < data.quantity) {
      return { error: `Not enough stock at that warehouse (${available} available)` };
    }
  }

  const batchNumber = data.batchNumber || null;
  const expiresAt = data.expiresAt || null;
  const note = data.note || null;

  await db.transaction(async (tx) => {
    // Weighted-average cost recompute (Decision #8) — only purchase/return
    // receipts carry a cost that should move the product's avgCost.
    if ((data.type === 'purchase' || data.type === 'return') && data.unitCost != null) {
      const [product] = await tx
        .select()
        .from(products)
        .where(eq(products.id, data.productId))
        .limit(1);
      if (product) {
        const priorBreakdown = await getStockByProductWarehouse(team.id, data.productId);
        const priorStock = priorBreakdown.reduce((sum, b) => sum + b.stock, 0);
        const priorAvg = Number(product.avgCost);
        const newAvgCost =
          priorStock > 0
            ? (priorStock * priorAvg + data.quantity * data.unitCost) / (priorStock + data.quantity)
            : data.unitCost;
        await tx
          .update(products)
          .set({
            avgCost: newAvgCost,
            updatedAt: new Date(),
          } as unknown as Partial<typeof products.$inferInsert>)
          .where(eq(products.id, data.productId));
      }
    }

    if (data.type === 'transfer') {
      const [outRow] = await tx
        .insert(stockMovements)
        .values({
          teamId: team.id,
          productId: data.productId,
          warehouseId: data.warehouseId,
          type: 'transfer_out',
          quantity: data.quantity,
          unitCost: data.unitCost,
          batchNumber,
          expiresAt,
          note,
          createdBy: user.id,
        } as typeof stockMovements.$inferInsert)
        .returning({ id: stockMovements.id });
      const [inRow] = await tx
        .insert(stockMovements)
        .values({
          teamId: team.id,
          productId: data.productId,
          warehouseId: data.destinationWarehouseId!,
          type: 'transfer_in',
          quantity: data.quantity,
          unitCost: data.unitCost,
          batchNumber,
          expiresAt,
          note,
          createdBy: user.id,
          relatedMovementId: outRow.id,
        } as typeof stockMovements.$inferInsert)
        .returning({ id: stockMovements.id });
      await tx
        .update(stockMovements)
        .set({ relatedMovementId: inRow.id })
        .where(eq(stockMovements.id, outRow.id));
    } else {
      await tx.insert(stockMovements).values({
        teamId: team.id,
        productId: data.productId,
        warehouseId: data.warehouseId,
        type: data.type,
        quantity: data.quantity,
        unitCost: data.unitCost,
        batchNumber,
        expiresAt,
        note,
        createdBy: user.id,
      } as typeof stockMovements.$inferInsert);
    }
  });

  revalidatePath('/dashboard/stock-movements');
  revalidatePath('/dashboard/products');
}, 'member');
