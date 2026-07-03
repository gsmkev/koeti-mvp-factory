'use server'

import { z } from 'zod'
import { crudActions } from '@/lib/crud'
import { expenses } from '@/lib/db/schema'

const actions = crudActions(expenses, {
  path: '/dashboard/gastos',
  schema: z.object({
    amount: z.coerce.number().positive('El monto debe ser mayor a 0'),
    category: z.enum(['viaticos', 'materiales', 'software', 'otros']),
    description: z.string().min(1, 'La descripción es requerida').max(255),
    spentAt: z.string().min(1, 'La fecha es requerida'),
  }),
})
export const createExpense = actions.create
export const updateExpense = actions.update
export const deleteExpense = actions.remove
