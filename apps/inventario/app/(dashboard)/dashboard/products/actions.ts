'use server';
// Server actions for /dashboard/products.

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { crudActions } from '@/lib/crud';
import { withTeam } from '@/lib/auth/middleware';
import { db } from '@/lib/db/drizzle';
import { products } from '@/lib/db/schema';

const schema = z.object({
  sku: z.string().min(1, 'SKU is required').max(100),
  name: z.string().min(1, 'Name is required').max(255),
  category: z.string().min(1, 'Category is required').max(100),
  unit: z.string().min(1, 'Unit is required').max(20),
  barcode: z.string().max(100).optional().or(z.literal('')),
  variant: z.string().max(100).optional().or(z.literal('')),
  cost: z.coerce.number().min(0, 'Cost must be 0 or more'),
  price: z.coerce.number().min(0, 'Price must be 0 or more'),
  minStock: z.coerce.number().int().min(0, 'Min stock must be 0 or more'),
});

const actions = crudActions(products, { path: '/dashboard/products', schema });

// avgCost seeds from cost on create, then recomputes on every purchase/return
// receipt (stock-movements/actions.ts) — the create form never submits it, so
// this can't go through the generic factory.
export const createProduct = withTeam(async (formData, team) => {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.errors[0].message };
  await db.insert(products).values({
    ...parsed.data,
    avgCost: parsed.data.cost,
    teamId: team.id,
  } as unknown as typeof products.$inferInsert);
  revalidatePath('/dashboard/products');
});
export const updateProduct = actions.update;
export const deleteProduct = actions.remove;
