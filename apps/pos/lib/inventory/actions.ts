'use server'

import { z } from 'zod'
import { eq, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db/drizzle'
import { products } from '@/lib/db/schema'
import { validatedActionWithUser } from '@/lib/auth/middleware'
import { getTeamForUser } from '@/lib/db/queries'

const productSchema = z.object({
  id: z.coerce.number().optional(),
  name: z.string().min(1).max(100),
  sku: z.string().max(50).optional(),
  price: z.coerce.number().positive(),
  stock: z.coerce.number().int().min(0),
})

export const upsertProduct = validatedActionWithUser(productSchema, async (data) => {
  const team = await getTeamForUser()
  if (!team) return { error: 'No se encontró el equipo' }

  if (data.id) {
    await db
      .update(products)
      .set({ name: data.name, sku: data.sku || null, price: String(data.price), stock: data.stock })
      .where(eq(products.id, data.id))
  } else {
    await db.insert(products).values({
      teamId: team.id,
      name: data.name,
      sku: data.sku || null,
      price: String(data.price),
      stock: data.stock,
    })
  }
  revalidatePath('/inventory')
  return { success: 'Guardado' }
})

const adjustSchema = z.object({
  productId: z.coerce.number(),
  delta: z.coerce.number().int(),
})

export const adjustStock = validatedActionWithUser(adjustSchema, async (data) => {
  await db
    .update(products)
    .set({ stock: sql`GREATEST(0, ${products.stock} + ${data.delta})` })
    .where(eq(products.id, data.productId))
  revalidatePath('/inventory')
  return { success: 'Stock actualizado' }
})
