'use server';
// Server actions for /dashboard/clientes.

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { crudActions } from '@/lib/crud';
import { db } from '@/lib/db/drizzle';
import { clientes } from '@/lib/db/schema';
import { withTeam } from '@/lib/auth/middleware';

const actions = crudActions(clientes, {
  path: '/dashboard/clientes',
  schema: z.object({
    name: z.string().min(1, 'El nombre es requerido').max(255),
    phone: z.string().max(50).optional(),
    creditLimit: z.coerce.number().min(0, 'El límite no puede ser negativo'),
  }),
});
export const createCliente = actions.create;
export const updateCliente = actions.update;

// Borrar un cliente es destructivo (pierde su historial de fiado) — solo admin.
export const deleteCliente = withTeam(async (formData, team) => {
  const id = Number(formData.get('id'));
  if (!Number.isInteger(id)) return { error: 'Missing record id' };
  await db.delete(clientes).where(and(eq(clientes.id, id), eq(clientes.teamId, team.id)));
  revalidatePath('/dashboard/clientes');
}, 'admin');
