'use server';
// Registrar un pago (abono) de un cliente — decrementa su saldo, piso 0.

import { and, eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { activityLogs } from '@koeti/db';
import { db } from '@/lib/db/drizzle';
import { clientes, pagos } from '@/lib/db/schema';
import { withTeam } from '@/lib/auth/middleware';

const schema = z.object({
  clienteId: z.coerce.number().int(),
  amount: z.coerce.number().positive('El monto debe ser mayor a 0'),
  note: z.string().max(255).optional(),
});

export const registrarPago = withTeam(async (formData, team, user) => {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.errors[0].message };
  const { clienteId, amount, note } = parsed.data;

  await db.transaction(async (tx) => {
    await tx.insert(pagos).values({ teamId: team.id, clienteId, amount: String(amount), note });
    await tx
      .update(clientes)
      .set({
        balance: sql`greatest(${clientes.balance} - ${amount}, 0)`,
        updatedAt: new Date(),
      })
      .where(and(eq(clientes.id, clienteId), eq(clientes.teamId, team.id)));
  });

  await db
    .insert(activityLogs)
    .values({ teamId: team.id, userId: user.id, action: 'FIADO_PAYMENT' });

  revalidatePath(`/dashboard/clientes/${clienteId}`);
  revalidatePath('/dashboard/clientes');
  revalidatePath('/dashboard');
}, 'member');
