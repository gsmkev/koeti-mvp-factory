'use server';
// Server actions for /dashboard/warehouses.

import { revalidatePath } from 'next/cache';
import { and, eq, sql } from 'drizzle-orm';
import { z } from 'zod';
import { crudActions } from '@/lib/crud';
import { withTeam } from '@/lib/auth/middleware';
import { db } from '@/lib/db/drizzle';
import { warehouses, warehouseAssignments } from '@/lib/db/schema';
import { planLimitsFor } from '@/lib/plan';

const warehouseSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  location: z.string().max(255).optional().or(z.literal('')),
});

const actions = crudActions(warehouses, { path: '/dashboard/warehouses', schema: warehouseSchema });

// Free plan is capped at a couple of warehouses — hand-written so create can
// check the count before the generic factory's insert.
export const createWarehouse = withTeam(async (formData, team) => {
  const parsed = warehouseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const { maxWarehouses } = planLimitsFor(team);
  if (maxWarehouses !== null) {
    const [{ count }] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(warehouses)
      .where(eq(warehouses.teamId, team.id));
    if (count >= maxWarehouses) {
      return { error: `Free plan is capped at ${maxWarehouses} warehouses — upgrade to add more.` };
    }
  }

  await db.insert(warehouses).values({ ...parsed.data, teamId: team.id });
  revalidatePath('/dashboard/warehouses');
});
export const updateWarehouse = actions.update;
export const deleteWarehouse = actions.remove;

const assignSchema = z.object({
  userId: z.coerce.number().int(),
  warehouseId: z.coerce.number().int(),
});

// One warehouse per staff member (Decision #9) — assigning again replaces
// any existing assignment for that user.
export const assignStaffToWarehouse = withTeam(async (formData, team) => {
  const parsed = assignSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.errors[0].message };
  await db
    .delete(warehouseAssignments)
    .where(
      and(
        eq(warehouseAssignments.teamId, team.id),
        eq(warehouseAssignments.userId, parsed.data.userId),
      ),
    );
  await db.insert(warehouseAssignments).values({ ...parsed.data, teamId: team.id });
  revalidatePath('/dashboard/warehouses');
}, 'admin');

export const unassignStaff = withTeam(async (formData, team) => {
  const id = Number(formData.get('id'));
  if (!Number.isInteger(id)) return { error: 'Missing record id' };
  await db
    .delete(warehouseAssignments)
    .where(and(eq(warehouseAssignments.id, id), eq(warehouseAssignments.teamId, team.id)));
  revalidatePath('/dashboard/warehouses');
}, 'admin');
