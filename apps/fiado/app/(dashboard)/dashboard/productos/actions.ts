'use server';
// Server actions for /dashboard/productos.

import { z } from 'zod';
import { crudActions } from '@/lib/crud';
import { productos } from '@/lib/db/schema';

const actions = crudActions(productos, {
  path: '/dashboard/productos',
  schema: z.object({
    name: z.string().min(1, 'El nombre es requerido').max(255),
    price: z.coerce.number().positive('El precio debe ser mayor a 0'),
    stock: z.coerce.number().int().min(0, 'El stock no puede ser negativo'),
  }),
});
export const createProducto = actions.create;
export const updateProducto = actions.update;
export const deleteProducto = actions.remove;
