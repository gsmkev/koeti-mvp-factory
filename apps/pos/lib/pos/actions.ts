'use server'

import { z } from 'zod'
import { eq, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/lib/db/drizzle'
import { products, sales, saleItems } from '@/lib/db/schema'
import { getUser, getTeamForUser } from '@/lib/db/queries'

const saleItemSchema = z.object({
  productId: z.number(),
  qty: z.number().int().positive(),
})

const createSaleSchema = z.object({
  items: z.array(saleItemSchema).min(1),
})

export async function createSale(
  items: { productId: number; qty: number }[]
): Promise<{ error?: string; saleId?: number }> {
  const user = await getUser()
  if (!user) return { error: 'No autenticado' }
  const team = await getTeamForUser()
  if (!team) return { error: 'Sin equipo' }

  const parsed = createSaleSchema.safeParse({ items })
  if (!parsed.success) return { error: parsed.error.errors[0].message }

  try {
    const saleId = await db.transaction(async (tx) => {
      // Price and stock always come from the DB row, never the client.
      const priced: { productId: number; qty: number; unitPrice: number }[] = []
      for (const item of items) {
        const [product] = await tx
          .select({ stock: products.stock, name: products.name, teamId: products.teamId, price: products.price })
          .from(products)
          .where(eq(products.id, item.productId))
          .for('update')
        if (!product || product.teamId !== team.id) throw new Error(`Producto ${item.productId} no encontrado`)
        if (product.stock < item.qty) throw new Error(`Stock insuficiente para "${product.name}"`)
        priced.push({ productId: item.productId, qty: item.qty, unitPrice: parseFloat(product.price) })
      }

      const total = priced.reduce((sum, i) => sum + i.qty * i.unitPrice, 0)

      const [sale] = await tx
        .insert(sales)
        .values({ teamId: team.id, userId: user.id, total: String(total), status: 'paid' })
        .returning({ id: sales.id })

      await tx.insert(saleItems).values(
        priced.map(i => ({
          saleId: sale.id,
          productId: i.productId,
          qty: i.qty,
          unitPrice: String(i.unitPrice),
        }))
      )

      for (const item of priced) {
        await tx
          .update(products)
          .set({ stock: sql`${products.stock} - ${item.qty}` })
          .where(eq(products.id, item.productId))
      }

      return sale.id
    })

    revalidatePath('/inventory')
    revalidatePath('/sales')
    return { saleId }
  } catch (err: any) {
    return { error: err.message }
  }
}

export async function cancelSale(saleId: number): Promise<{ error?: string }> {
  const user = await getUser()
  if (!user) return { error: 'No autenticado' }
  const team = await getTeamForUser()
  if (!team) return { error: 'Sin equipo' }

  try {
    await db.transaction(async (tx) => {
      const [sale] = await tx.select().from(sales).where(eq(sales.id, saleId))
      if (!sale) throw new Error('Venta no encontrada')
      if (sale.teamId !== team.id) throw new Error('No autorizado')
      if (sale.status === 'cancelled') throw new Error('Ya estaba cancelada')

      await tx.update(sales).set({ status: 'cancelled' }).where(eq(sales.id, saleId))

      const items = await tx.select().from(saleItems).where(eq(saleItems.saleId, saleId))
      for (const item of items) {
        await tx.update(products).set({ stock: sql`${products.stock} + ${item.qty}` }).where(eq(products.id, item.productId))
      }
    })
    revalidatePath('/inventory')
    revalidatePath('/sales')
    return {}
  } catch (err: any) {
    return { error: err.message }
  }
}
