'use server';
// Server action — crear un empleado directamente (sin invitación por email).
// El dueño le da el usuario y la contraseña a la persona en el momento; no
// hace falta que tenga correo ni que acepte un enlace.

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { hashPassword } from '@/lib/auth/session';
import { teamMembers, users } from '@koeti/db';
import { db } from '@/lib/db/drizzle';
import { withTeam } from '@/lib/auth/middleware';

const schema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(100),
  usuario: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, 'El usuario debe tener al menos 3 caracteres')
    .max(50)
    .regex(/^[a-z0-9_.-]+$/, 'Usá solo letras, números, punto, guión o guión bajo'),
  password: z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  role: z.enum(['member', 'admin']),
});

// admin+ únicamente — mismo mínimo que la invitación por email que reemplaza.
export const createEmployee = withTeam(async (formData, team) => {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.errors[0].message };
  const { name, usuario, password, role } = parsed.data;
  const email = `${usuario}@fiado.local`;

  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing) return { error: `El usuario "${usuario}" ya existe` };

  const passwordHash = await hashPassword(password);
  const [newUser] = await db.insert(users).values({ email, passwordHash, name }).returning();
  await db.insert(teamMembers).values({ userId: newUser.id, teamId: team.id, role });

  revalidatePath('/dashboard/team');
  return { success: `Usuario "${usuario}" creado.` };
}, 'admin');
