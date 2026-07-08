'use server';
// Server actions for /dashboard/suppliers.

import { z } from 'zod';
import { crudActions } from '@/lib/crud';
import { suppliers } from '@/lib/db/schema';

const actions = crudActions(suppliers, {
  path: '/dashboard/suppliers',
  schema: z.object({
    name: z.string().min(1, 'Name is required').max(255),
    contactName: z.string().max(255).optional().or(z.literal('')),
    phone: z.string().max(50).optional().or(z.literal('')),
    email: z.string().email('Invalid email').max(255).optional().or(z.literal('')),
  }),
});
export const createSupplier = actions.create;
export const updateSupplier = actions.update;
export const deleteSupplier = actions.remove;
