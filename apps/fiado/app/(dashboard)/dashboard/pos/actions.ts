'use server';
// Registrar una venta (contado o fiado) — workflow beyond a single-table
// insert, so this stays hand-written instead of going through crudActions:
// touches producto.stock and (on fiado) cliente.balance atomically.

import { and, eq, inArray, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { db } from '@/lib/db/drizzle';
import { clientes, productos, ventaItems, ventas } from '@/lib/db/schema';
import { withTeam } from '@/lib/auth/middleware';
import { notifyTeam } from '@/lib/notifications';

const money = (n: number) => `₲${n.toLocaleString('es')}`;

const cartItemSchema = z.object({
  productoId: z.number().int().positive(),
  qty: z.number().int().positive(),
});

const schema = z.object({
  clienteId: z.coerce.number().int().optional(),
  paymentType: z.enum(['contado', 'fiado']),
  items: z
    .string()
    .min(1)
    .transform((s, ctx) => {
      const parsed = z.array(cartItemSchema).min(1).safeParse(JSON.parse(s));
      if (!parsed.success) {
        ctx.addIssue({ code: 'custom', message: 'Carrito vacío o inválido' });
        return z.NEVER;
      }
      return parsed.data;
    }),
});

export const registrarVenta = withTeam(async (formData, team) => {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.errors[0].message };
  const { paymentType, items } = parsed.data;
  const clienteId = parsed.data.clienteId;
  if (paymentType === 'fiado' && !clienteId) {
    return { error: 'Selecciona un cliente para vender al fiado' };
  }

  const productoIds = items.map((i) => i.productoId);
  const rows = await db
    .select()
    .from(productos)
    .where(and(eq(productos.teamId, team.id), inArray(productos.id, productoIds)));
  const byId = new Map(rows.map((p) => [p.id, p]));
  for (const item of items) {
    const p = byId.get(item.productoId);
    if (!p) return { error: 'Producto no encontrado' };
    if (p.stock < item.qty) return { error: `Stock insuficiente: ${p.name}` };
  }
  const total = items.reduce((sum, i) => sum + Number(byId.get(i.productoId)!.price) * i.qty, 0);

  await db.transaction(async (tx) => {
    const [venta] = await tx
      .insert(ventas)
      .values({
        teamId: team.id,
        clienteId: clienteId ?? null,
        paymentType,
        total: String(total),
      })
      .returning();
    await tx.insert(ventaItems).values(
      items.map((i) => ({
        ventaId: venta.id,
        productoId: i.productoId,
        qty: i.qty,
        unitPrice: String(byId.get(i.productoId)!.price),
      })),
    );
    for (const item of items) {
      await tx
        .update(productos)
        .set({ stock: sql`${productos.stock} - ${item.qty}`, updatedAt: new Date() })
        .where(eq(productos.id, item.productoId));
    }
    if (paymentType === 'fiado' && clienteId) {
      await tx
        .update(clientes)
        .set({ balance: sql`${clientes.balance} + ${total}`, updatedAt: new Date() })
        .where(and(eq(clientes.id, clienteId), eq(clientes.teamId, team.id)));
    }
  });

  if (paymentType === 'fiado' && clienteId) {
    const [cliente] = await db.select().from(clientes).where(eq(clientes.id, clienteId)).limit(1);
    if (
      cliente &&
      Number(cliente.creditLimit) > 0 &&
      Number(cliente.balance) > Number(cliente.creditLimit)
    ) {
      await notifyTeam(
        team.id,
        'overLimit',
        {
          cliente: cliente.name,
          balance: money(Number(cliente.balance)),
          limit: money(Number(cliente.creditLimit)),
        },
        { href: `/dashboard/clientes/${clienteId}` },
      );
    }
    revalidatePath(`/dashboard/clientes/${clienteId}`);
  }

  revalidatePath('/dashboard/pos');
  revalidatePath('/dashboard');
  revalidatePath('/dashboard/productos');
  revalidatePath('/dashboard/ventas');
}, 'member');
