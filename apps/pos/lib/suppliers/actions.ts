'use server'

import { z } from 'zod'
import { and, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db/drizzle'
import { suppliers, supplierPayments } from '@/lib/db/schema'
import { validatedActionWithUser } from '@/lib/auth/middleware'
import { getTeamForUser } from '@/lib/db/queries'

const supplierSchema = z.object({
  id: z.coerce.number().optional(),
  name: z.string().min(1).max(100),
  contact: z.string().optional(),
})

export const upsertSupplier = validatedActionWithUser(supplierSchema, async (data) => {
  const team = await getTeamForUser()
  if (!team) return { error: 'No se encontró el equipo' }

  if (data.id) {
    const result = await db
      .update(suppliers)
      .set({ name: data.name, contact: data.contact || null })
      .where(and(eq(suppliers.id, data.id), eq(suppliers.teamId, team.id)))
      .returning({ id: suppliers.id })
    if (result.length === 0) return { error: 'Proveedor no encontrado' }
  } else {
    await db.insert(suppliers).values({ teamId: team.id, name: data.name, contact: data.contact || null })
  }
  revalidatePath('/suppliers')
  return { success: 'Guardado' }
})

const paymentSchema = z.object({
  id: z.coerce.number().optional(),
  supplierId: z.coerce.number(),
  amount: z.coerce.number().positive(),
  description: z.string().min(1),
  paidAt: z.string().optional(),
})

export const upsertPayment = validatedActionWithUser(paymentSchema, async (data) => {
  const team = await getTeamForUser()
  if (!team) return { error: 'No se encontró el equipo' }

  const [supplier] = await db
    .select({ id: suppliers.id })
    .from(suppliers)
    .where(and(eq(suppliers.id, data.supplierId), eq(suppliers.teamId, team.id)))
  if (!supplier) return { error: 'Proveedor inválido' }

  const paidAt = data.paidAt ? new Date(data.paidAt) : new Date()

  if (data.id) {
    const result = await db
      .update(supplierPayments)
      .set({
        supplierId: data.supplierId,
        amount: String(data.amount),
        description: data.description,
        paidAt,
      })
      .where(and(eq(supplierPayments.id, data.id), eq(supplierPayments.teamId, team.id)))
      .returning({ id: supplierPayments.id })
    if (result.length === 0) return { error: 'Pago no encontrado' }
  } else {
    await db.insert(supplierPayments).values({
      teamId: team.id,
      supplierId: data.supplierId,
      amount: String(data.amount),
      description: data.description,
      paidAt,
    })
  }
  revalidatePath('/suppliers')
  return { success: 'Guardado' }
})
