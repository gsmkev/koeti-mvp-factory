'use server';
// Server actions for /dashboard/api-keys.

import { and, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { apiKeyPrefix, generateApiKey, hashApiKey, roleAtLeast } from '@koeti/auth';
import { apiKeys } from '@koeti/db';
import { teamRoleFor, validatedActionWithUser } from '@/lib/auth/middleware';
import { db } from '@/lib/db/drizzle';
import { getTeamForUser } from '@/lib/db/queries';

const createSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').max(100),
});

export const createApiKey = validatedActionWithUser(createSchema, async (data, _, user) => {
  const team = await getTeamForUser();
  if (!team) return { error: 'Equipo no encontrado' };
  if (!roleAtLeast(teamRoleFor(user, team), 'admin')) {
    return { error: 'Solo los admins del equipo pueden gestionar API keys' };
  }
  const key = generateApiKey();
  await db.insert(apiKeys).values({
    teamId: team.id,
    name: data.name,
    keyHash: await hashApiKey(key),
    keyPrefix: apiKeyPrefix(key),
    createdBy: user.id,
  });
  revalidatePath('/dashboard/api-keys');
  // The plaintext key exists only in this response — only its hash is stored.
  return { key };
});

const revokeSchema = z.object({ id: z.coerce.number() });

export const revokeApiKey = validatedActionWithUser(revokeSchema, async (data, _, user) => {
  const team = await getTeamForUser();
  if (!team) return { error: 'Equipo no encontrado' };
  if (!roleAtLeast(teamRoleFor(user, team), 'admin')) {
    return { error: 'Solo los admins del equipo pueden gestionar API keys' };
  }
  await db
    .update(apiKeys)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiKeys.id, data.id), eq(apiKeys.teamId, team.id)));
  revalidatePath('/dashboard/api-keys');
  return { success: 'API key revocada.' };
});
