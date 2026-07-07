'use server';
// Server action — crear un empleado directamente (sin invitación por email).
// El dueño le da el usuario y la contraseña a la persona en el momento; no
// hace falta que tenga correo ni que acepte un enlace.
//
// Solo dos roles reales para una despensa: Dueño (owner, único, se crea en el
// signup) y Vendedor (member). No hay "Administrador" — el dueño es quien
// administra, así que todo empleado nuevo es Vendedor.

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { isSubscribed } from '@koeti/billing';
import { hashPassword } from '@/lib/auth/session';
import { teamMembers, users } from '@koeti/db';
import { db } from '@/lib/db/drizzle';
import { withTeam } from '@/lib/auth/middleware';
import { getTeamSlug } from '@/lib/db/queries';

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
});

// Cuántos empleados (sin contar al dueño) puede tener una despensa según su
// plan — la única diferencia real entre Básico y Premium (ver /pricing). Sin
// plan pago, solo el dueño; ver .claude/rules/billing.md para el catálogo.
const EMPLOYEE_LIMITS: Record<string, number> = { básico: 3, premium: Infinity };
const FREE_EMPLOYEE_LIMIT = 1;

function employeeLimit(team: { planName: string | null; subscriptionStatus: string | null }) {
  if (!isSubscribed(team)) return FREE_EMPLOYEE_LIMIT;
  return EMPLOYEE_LIMITS[team.planName?.toLowerCase() ?? ''] ?? FREE_EMPLOYEE_LIMIT;
}

// Dueño únicamente ('admin' como mínimo, pero nadie más llega a tener ese rol).
export const createEmployee = withTeam(async (formData, team) => {
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.errors[0].message };

  const limit = employeeLimit(team);
  const currentEmployees = team.teamMembers.filter((m) => m.role !== 'owner').length;
  if (currentEmployees >= limit) {
    return {
      error: `Con tu plan actual podés tener hasta ${limit} empleado${limit === 1 ? '' : 's'}. Mejorá tu plan en /pricing para agregar más.`,
    };
  }

  const { name, usuario, password } = parsed.data;
  // Same slug as the owner (see (login)/actions.ts) — "usuario" only has to
  // be unique within this despensa, not across the whole app.
  const slug = await getTeamSlug(team.id);
  if (!slug) return { error: 'No se pudo determinar el código de tu despensa.' };
  const email = `${usuario}@${slug}.fiado.local`;

  const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (existing) return { error: `El usuario "${usuario}" ya existe` };

  const passwordHash = await hashPassword(password);
  const [newUser] = await db.insert(users).values({ email, passwordHash, name }).returning();
  await db.insert(teamMembers).values({ userId: newUser.id, teamId: team.id, role: 'member' });

  revalidatePath('/dashboard/team');
  return { success: `Usuario "${usuario}" creado.` };
}, 'admin');

const updateSchema = z.object({
  memberId: z.coerce.number(),
  password: z.union([
    z.literal(''),
    z.string().min(8, 'La contraseña debe tener al menos 8 caracteres'),
  ]),
});

// Resetea la contraseña de un empleado ya creado — el dueño no tiene forma de
// recuperarla, así que esta es la única vía. Cambiar la contraseña revoca la
// sesión actual del empleado (fingerprint en el JWT, ver auth.md), así que no
// hace falta invalidar nada a mano.
export const updateEmployee = withTeam(async (formData, team) => {
  const parsed = updateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.errors[0].message };
  const { memberId, password } = parsed.data;
  if (!password) return { error: 'Ingresá una contraseña nueva' };

  const [member] = await db
    .select()
    .from(teamMembers)
    .where(and(eq(teamMembers.id, memberId), eq(teamMembers.teamId, team.id)))
    .limit(1);
  if (!member) return { error: 'Empleado no encontrado' };
  if (member.role === 'owner') return { error: 'No podés editar al dueño' };

  const passwordHash = await hashPassword(password);
  await db.update(users).set({ passwordHash }).where(eq(users.id, member.userId));

  revalidatePath('/dashboard/team');
  return { success: 'Contraseña actualizada.' };
}, 'admin');
